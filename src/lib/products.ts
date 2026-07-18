import { supabase } from './supabase';

export interface ProductMatch {
  id: string;
  category: string | null;
}

export async function findProductMatch(name: string, lang: string = 'es'): Promise<ProductMatch | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();

  const { data } = await supabase
    .from('products')
    .select('id, category, category_en, canonical_name, canonical_name_en, aliases, aliases_en')
    .or(
      `canonical_name.ilike.${trimmed},aliases.cs.{${lower}},canonical_name_en.ilike.${trimmed},aliases_en.cs.{${lower}}`
    )
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const isEnglish = lang.startsWith('en');
  const category = isEnglish ? (data.category_en ?? data.category) : data.category;
  return { id: data.id, category };
}

export interface ProductSuggestion {
  id: string;
  name: string;
  category: string | null;
  defaultUnit: string | null;
}

export async function searchProducts(query: string, lang: string = 'es', limit = 6): Promise<ProductSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const isEnglish = lang.startsWith('en');
  const nameCol = isEnglish ? 'canonical_name_en' : 'canonical_name';
  const catCol = isEnglish ? 'category_en' : 'category';
  const lower = trimmed.toLowerCase();

  const { data } = await supabase
    .from('products')
    .select(`id, ${nameCol}, ${catCol}, default_unit`)
    .ilike(nameCol, `%${trimmed}%`)
    .not(nameCol, 'is', null)
    .limit(limit * 3);

  if (!data) return [];

  return (data as any[])
    .sort((a, b) => {
      const aStarts = String(a[nameCol]).toLowerCase().startsWith(lower) ? 0 : 1;
      const bStarts = String(b[nameCol]).toLowerCase().startsWith(lower) ? 0 : 1;
      return aStarts - bStarts || String(a[nameCol]).localeCompare(String(b[nameCol]));
    })
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      name: row[nameCol],
      category: row[catCol],
      defaultUnit: row.default_unit,
    }));
}
