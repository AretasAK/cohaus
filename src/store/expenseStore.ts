import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { splitAmount } from '../lib/split';

export interface Expense {
  id: string;
  group_id: string;
  payer_id: string;
  amount: number;
  description: string;
  source_list_id: string | null;
  receipt_path: string | null;
  created_at: string;
  payer_name?: string;
  payer_avatar?: string | null;
  splits?: { user_id: string; share_amount: number; settled: boolean }[];
}

export interface Balance {
  user_id: string;
  name: string;
  avatar_url: string | null;
  net: number; // positive = le deben, negative = debe
}

export interface Transfer {
  from: string;
  fromName: string;
  fromAvatar: string | null;
  to: string;
  toName: string;
  toAvatar: string | null;
  amount: number;
}

interface ExpenseState {
  expensesByGroup: Record<string, Expense[]>;
  loading: boolean;
  fetchExpenses: (groupId: string) => Promise<void>;
  addExpense: (
    groupId: string,
    payerId: string,
    amount: number,
    description: string,
    participants: { userId: string; weight: number }[],
    splitByWeight: boolean,
    receiptPath?: string | null
  ) => Promise<void>;
  deleteExpense: (expenseId: string, groupId: string) => Promise<void>;
  computeBalances: (groupId: string) => Promise<{ balances: Balance[]; transfers: Transfer[] }>;
  settleTransfer: (groupId: string, fromUserId: string, toUserId: string, amount: number) => Promise<void>;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expensesByGroup: {},
  loading: false,

  fetchExpenses: async (groupId: string) => {
    set({ loading: true });
    const { data } = await supabase
      .from('expenses')
      .select('*, profiles!expenses_payer_id_fkey(display_name, email, avatar_url), expense_splits(user_id, share_amount, settled)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (data) {
      const expenses: Expense[] = data.map((row: any) => ({
        id: row.id,
        group_id: row.group_id,
        payer_id: row.payer_id,
        amount: Number(row.amount),
        description: row.description,
        source_list_id: row.source_list_id,
        receipt_path: row.receipt_path ?? null,
        created_at: row.created_at,
        payer_name: row.profiles?.display_name ?? row.profiles?.email,
        payer_avatar: row.profiles?.avatar_url ?? null,
        splits: row.expense_splits,
      }));
      set((state) => ({ expensesByGroup: { ...state.expensesByGroup, [groupId]: expenses } }));
    }
    set({ loading: false });
  },

  addExpense: async (groupId, payerId, amount, description, participants, splitByWeight, receiptPath = null) => {
    const { data: expense } = await supabase
      .from('expenses')
      .insert({ group_id: groupId, payer_id: payerId, amount, description, receipt_path: receiptPath })
      .select()
      .single();

    if (expense && participants.length > 0) {
      const weights = splitByWeight ? participants.map((p) => p.weight) : participants.map(() => 1);
      const shares = splitAmount(amount, weights);
      const splits = participants.map((p, i) => ({
        expense_id: expense.id,
        user_id: p.userId,
        share_amount: shares[i],
      }));
      await supabase.from('expense_splits').insert(splits);
    }
    await get().fetchExpenses(groupId);
  },

  deleteExpense: async (expenseId: string, groupId: string) => {
    await supabase.from('expenses').delete().eq('id', expenseId);
    await get().fetchExpenses(groupId);
  },

  computeBalances: async (groupId: string) => {
    await get().fetchExpenses(groupId);
    const expenses = get().expensesByGroup[groupId] ?? [];

    const { data: memberRows } = await supabase
      .from('group_members')
      .select('user_id, profiles(display_name, email, avatar_url)')
      .eq('group_id', groupId);

    const names: Record<string, string> = {};
    const avatars: Record<string, string | null> = {};
    (memberRows ?? []).forEach((m: any) => {
      names[m.user_id] = m.profiles?.display_name ?? m.profiles?.email ?? 'Usuario';
      avatars[m.user_id] = m.profiles?.avatar_url ?? null;
    });

    const net: Record<string, number> = {};
    Object.keys(names).forEach((uid) => (net[uid] = 0));

    expenses.forEach((exp) => {
      net[exp.payer_id] = (net[exp.payer_id] ?? 0) + exp.amount;
      (exp.splits ?? []).forEach((split) => {
        if (split.settled) return;
        net[split.user_id] = (net[split.user_id] ?? 0) - split.share_amount;
      });
    });

    const { data: settlementRows } = await supabase
      .from('settlements')
      .select('from_user_id, to_user_id, amount')
      .eq('group_id', groupId);

    (settlementRows ?? []).forEach((s: any) => {
      net[s.from_user_id] = (net[s.from_user_id] ?? 0) + Number(s.amount);
      net[s.to_user_id] = (net[s.to_user_id] ?? 0) - Number(s.amount);
    });

    const balances: Balance[] = Object.entries(net).map(([user_id, value]) => ({
      user_id,
      name: names[user_id] ?? 'Usuario',
      avatar_url: avatars[user_id] ?? null,
      net: Math.round(value * 100) / 100,
    }));

    // Simplificacion de deudas: greedy entre deudores y acreedores
    const debtors = balances.filter((b) => b.net < -0.005).map((b) => ({ ...b })).sort((a, b) => a.net - b.net);
    const creditors = balances.filter((b) => b.net > 0.005).map((b) => ({ ...b })).sort((a, b) => b.net - a.net);

    const transfers: Transfer[] = [];
    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(-debtor.net, creditor.net);
      if (amount > 0.005) {
        transfers.push({
          from: debtor.user_id,
          fromName: debtor.name,
          fromAvatar: avatars[debtor.user_id] ?? null,
          to: creditor.user_id,
          toName: creditor.name,
          toAvatar: avatars[creditor.user_id] ?? null,
          amount: Math.round(amount * 100) / 100,
        });
      }
      debtor.net += amount;
      creditor.net -= amount;
      if (Math.abs(debtor.net) < 0.005) i++;
      if (Math.abs(creditor.net) < 0.005) j++;
    }

    return { balances, transfers };
  },

  settleTransfer: async (groupId, fromUserId, toUserId, amount) => {
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from('settlements').insert({
      group_id: groupId,
      from_user_id: fromUserId,
      to_user_id: toUserId,
      amount,
      created_by: userData.user?.id ?? null,
    });
  },
}));
