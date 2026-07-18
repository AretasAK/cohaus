import { create } from 'zustand';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { splitAmount } from '../lib/split';
import { findProductMatch } from '../lib/products';
import i18n from '../i18n';

export interface ListItem {
  id: string;
  list_id: string;
  product_id: string | null;
  custom_name: string | null;
  qty: number;
  unit: string | null;
  price: number | null;
  category: string | null;
  created_by: string | null;
  bought_by: string | null;
  bought_at: string | null;
  created_at: string;
}

export interface ShoppingList {
  id: string;
  group_id: string;
  name: string;
  status: 'open' | 'closed';
  created_at: string;
}

interface ListState {
  listsByGroup: Record<string, ShoppingList[]>;
  selectedListByGroup: Record<string, string>;
  itemsByList: Record<string, ListItem[]>;
  loading: boolean;
  channel: RealtimeChannel | null;
  fetchLists: (groupId: string) => Promise<ShoppingList[]>;
  createList: (groupId: string, name: string) => Promise<ShoppingList | null>;
  selectList: (groupId: string, listId: string) => void;
  fetchItems: (listId: string) => Promise<void>;
  subscribeToList: (listId: string) => void;
  unsubscribe: () => void;
  addItem: (listId: string, name: string, qty?: number) => Promise<void>;
  toggleBought: (item: ListItem, userId: string) => Promise<void>;
  updatePrice: (itemId: string, price: number | null) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  closeList: (groupId: string, listId: string, payerId: string) => Promise<{ total: number } | null>;
}

export const useListStore = create<ListState>((set, get) => ({
  listsByGroup: {},
  selectedListByGroup: {},
  itemsByList: {},
  loading: false,
  channel: null,

  fetchLists: async (groupId: string) => {
    set({ loading: true });
    const { data } = await supabase
      .from('lists')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    const lists = (data as ShoppingList[]) ?? [];
    set((state) => {
      const currentSelected = state.selectedListByGroup[groupId];
      const stillValid = currentSelected && lists.some((l) => l.id === currentSelected && l.status === 'open');
      const firstOpen = lists.find((l) => l.status === 'open');
      return {
        listsByGroup: { ...state.listsByGroup, [groupId]: lists },
        selectedListByGroup: stillValid
          ? state.selectedListByGroup
          : { ...state.selectedListByGroup, [groupId]: firstOpen?.id ?? '' },
        loading: false,
      };
    });
    return lists;
  },

  createList: async (groupId: string, name: string) => {
    const { data, error } = await supabase
      .from('lists')
      .insert({ group_id: groupId, name: name.trim() || 'Lista de la compra' })
      .select()
      .single();
    if (error || !data) return null;

    await get().fetchLists(groupId);
    get().selectList(groupId, data.id);
    return data as ShoppingList;
  },

  selectList: (groupId: string, listId: string) => {
    set((state) => ({ selectedListByGroup: { ...state.selectedListByGroup, [groupId]: listId } }));
  },

  fetchItems: async (listId: string) => {
    const { data } = await supabase
      .from('list_items')
      .select('*')
      .eq('list_id', listId)
      .order('created_at', { ascending: true });
    if (data) {
      set((state) => ({ itemsByList: { ...state.itemsByList, [listId]: data as ListItem[] } }));
    }
  },

  subscribeToList: (listId: string) => {
    get().unsubscribe();
    const channel = supabase
      .channel(`list_items:${listId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'list_items', filter: `list_id=eq.${listId}` },
        () => {
          get().fetchItems(listId);
        }
      )
      .subscribe();
    set({ channel });
  },

  unsubscribe: () => {
    const ch = get().channel;
    if (ch) supabase.removeChannel(ch);
    set({ channel: null });
  },

  addItem: async (listId: string, name: string, qty = 1) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    const match = await findProductMatch(trimmed, i18n.language);

    if (match) {
      await supabase.from('list_items').insert({
        list_id: listId,
        product_id: match.id,
        custom_name: trimmed,
        category: match.category,
        qty,
        created_by: userId,
      });
    } else {
      const { data: newProduct } = await supabase
        .from('products')
        .insert({ canonical_name: trimmed })
        .select('id')
        .single();

      await supabase.from('list_items').insert({
        list_id: listId,
        product_id: newProduct?.id ?? null,
        custom_name: trimmed,
        qty,
        created_by: userId,
      });
    }
    await get().fetchItems(listId);
  },

  toggleBought: async (item: ListItem, userId: string) => {
    const isBought = !!item.bought_at;
    await supabase
      .from('list_items')
      .update({
        bought_at: isBought ? null : new Date().toISOString(),
        bought_by: isBought ? null : userId,
      })
      .eq('id', item.id);
    await get().fetchItems(item.list_id);
  },

  updatePrice: async (itemId: string, price: number | null) => {
    await supabase.from('list_items').update({ price }).eq('id', itemId);
  },

  deleteItem: async (itemId: string) => {
    const item = Object.values(get().itemsByList).flat().find((i) => i.id === itemId);
    await supabase.from('list_items').delete().eq('id', itemId);
    if (item) await get().fetchItems(item.list_id);
  },

  closeList: async (groupId: string, listId: string, payerId: string) => {
    const items = get().itemsByList[listId] ?? [];
    const total = items.reduce((sum, i) => sum + (i.price ?? 0), 0);

    await supabase.from('lists').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', listId);

    if (total > 0) {
      const { data: memberRows } = await supabase
        .from('group_members')
        .select('user_id, share_weight')
        .eq('group_id', groupId);

      const membersList = memberRows ?? [];

      const { data: expense } = await supabase
        .from('expenses')
        .insert({
          group_id: groupId,
          payer_id: payerId,
          amount: total,
          description: 'Compra cerrada',
          source_list_id: listId,
        })
        .select()
        .single();

      if (expense) {
        const shares = splitAmount(total, membersList.map((m) => Number(m.share_weight)));
        const splits = membersList.map((m, i) => ({
          expense_id: expense.id,
          user_id: m.user_id,
          share_amount: shares[i],
        }));
        await supabase.from('expense_splits').insert(splits);
      }
    }

    await get().fetchLists(groupId);
    return { total };
  },
}));
