import { supabase } from './supabase';

export async function recordPurchase(groupId: string, productId: string) {
  const { data: existing } = await supabase
    .from('purchase_cycles')
    .select('avg_cycle_days, last_bought_at')
    .eq('group_id', groupId)
    .eq('product_id', productId)
    .maybeSingle();

  const now = new Date();

  if (!existing || !existing.last_bought_at) {
    await supabase.from('purchase_cycles').upsert({
      group_id: groupId,
      product_id: productId,
      last_bought_at: now.toISOString(),
    });
    return;
  }

  const daysSinceLast = (now.getTime() - new Date(existing.last_bought_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceLast < 0.5) return;

  const newAvg = existing.avg_cycle_days
    ? Number(existing.avg_cycle_days) * 0.7 + daysSinceLast * 0.3
    : daysSinceLast;

  await supabase.from('purchase_cycles').upsert({
    group_id: groupId,
    product_id: productId,
    avg_cycle_days: newAvg,
    last_bought_at: now.toISOString(),
  });
}

export async function getPreferredListName(productId: string): Promise<string | null> {
  const { data } = await supabase.from('products').select('preferred_list_name').eq('id', productId).maybeSingle();
  return data?.preferred_list_name ?? null;
}

export interface PurchasePrediction {
  product_id: string;
  name: string;
  category: string | null;
}

export async function fetchPurchasePredictions(groupId: string, lang: string): Promise<PurchasePrediction[]> {
  const isEnglish = lang.startsWith('en');

  const [{ data: cycles }, { data: stocked }] = await Promise.all([
    supabase
      .from('purchase_cycles')
      .select('product_id, avg_cycle_days, last_bought_at, products(canonical_name, canonical_name_en, category, category_en)')
      .eq('group_id', groupId)
      .not('avg_cycle_days', 'is', null),
    supabase.from('pantry_items').select('product_id, qty').eq('group_id', groupId),
  ]);

  if (!cycles) return [];

  const stockedIds = new Set((stocked ?? []).filter((p: any) => Number(p.qty) > 0).map((p: any) => p.product_id));
  const now = Date.now();

  return (cycles as any[])
    .filter((row) => !stockedIds.has(row.product_id))
    .map((row) => {
      const lastBought = new Date(row.last_bought_at).getTime();
      const daysSince = (now - lastBought) / (1000 * 60 * 60 * 24);
      const progress = daysSince / Number(row.avg_cycle_days);
      return {
        product_id: row.product_id as string,
        name: isEnglish
          ? row.products?.canonical_name_en ?? row.products?.canonical_name ?? '?'
          : row.products?.canonical_name ?? '?',
        category: isEnglish ? row.products?.category_en ?? row.products?.category : row.products?.category,
        progress,
      };
    })
    .filter((p) => p.progress >= 0.8)
    .sort((a, b) => b.progress - a.progress)
    .map(({ product_id, name, category }) => ({ product_id, name, category }));
}
