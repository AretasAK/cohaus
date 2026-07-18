import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { findProductMatch } from '../lib/products';
import { recordPurchase } from '../lib/purchaseCycles';
import i18n from '../i18n';

export interface PantryItem {
  id: string;
  group_id: string;
  product_id: string;
  qty: number;
  unit: string | null;
  expires_at: string | null;
  updated_at: string;
  product_name?: string;
  category?: string | null;
}

interface PantryState {
  itemsByGroup: Record<string, PantryItem[]>;
  loading: boolean;
  fetchPantry: (groupId: string) => Promise<void>;
  addOrIncrement: (groupId: string, productName: string, qty: number, unit: string) => Promise<void>;
  updateQty: (item: PantryItem, delta: number) => Promise<void>;
  setExpiry: (itemId: string, groupId: string, expiresAt: string | null) => Promise<void>;
  removeItem: (itemId: string, groupId: string) => Promise<void>;
}

export const usePantryStore = create<PantryState>((set, get) => ({
  itemsByGroup: {},
  loading: false,

  fetchPantry: async (groupId: string) => {
    set({ loading: true });
    const { data } = await supabase
      .from('pantry_items')
      .select('*, products(canonical_name, category)')
      .eq('group_id', groupId)
      .order('updated_at', { ascending: false });

    if (data) {
      const items: PantryItem[] = data.map((row: any) => ({
        id: row.id,
        group_id: row.group_id,
        product_id: row.product_id,
        qty: Number(row.qty),
        unit: row.unit,
        expires_at: row.expires_at,
        updated_at: row.updated_at,
        product_name: row.products?.canonical_name ?? '—',
        category: row.products?.category,
      }));
      set((state) => ({ itemsByGroup: { ...state.itemsByGroup, [groupId]: items } }));
    }
    set({ loading: false });
  },

  addOrIncrement: async (groupId: string, productName: string, qty: number, unit: string) => {
    const trimmed = productName.trim();
    if (!trimmed) return;

    const match = await findProductMatch(trimmed, i18n.language);

    let productId = match?.id;
    if (!productId) {
      const { data: created } = await supabase
        .from('products')
        .insert({ canonical_name: trimmed })
        .select('id')
        .single();
      productId = created?.id;
    }
    if (!productId) return;

    const { data: existing } = await supabase
      .from('pantry_items')
      .select('id, qty')
      .eq('group_id', groupId)
      .eq('product_id', productId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('pantry_items')
        .update({ qty: Number(existing.qty) + qty, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase.from('pantry_items').insert({ group_id: groupId, product_id: productId, qty, unit });
    }

    recordPurchase(groupId, productId).catch(() => {});
    await get().fetchPantry(groupId);
  },

  updateQty: async (item: PantryItem, delta: number) => {
    const newQty = Math.max(0, item.qty + delta);
    if (newQty === 0) {
      await supabase.from('pantry_items').delete().eq('id', item.id);
    } else {
      await supabase
        .from('pantry_items')
        .update({ qty: newQty, updated_at: new Date().toISOString() })
        .eq('id', item.id);
    }
    await get().fetchPantry(item.group_id);
  },

  setExpiry: async (itemId: string, groupId: string, expiresAt: string | null) => {
    await supabase.from('pantry_items').update({ expires_at: expiresAt }).eq('id', itemId);
    await get().fetchPantry(groupId);
  },

  removeItem: async (itemId: string, groupId: string) => {
    await supabase.from('pantry_items').delete().eq('id', itemId);
    await get().fetchPantry(groupId);
  },
}));
