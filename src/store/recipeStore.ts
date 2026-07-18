import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { findProductMatch } from '../lib/products';
import i18n from '../i18n';

export interface RecipeIngredientInput {
  name: string;
  qty: number;
  unit: string;
}

export interface RecipeIngredient {
  product_id: string;
  name: string;
  qty: number;
  unit: string | null;
  category: string | null;
}

export interface Recipe {
  id: string;
  group_id: string;
  name: string;
  servings: number;
  instructions: string | null;
  created_at: string;
  ingredients: RecipeIngredient[];
}

interface RecipeState {
  recipesByGroup: Record<string, Recipe[]>;
  loading: boolean;
  fetchRecipes: (groupId: string) => Promise<void>;
  createRecipe: (
    groupId: string,
    name: string,
    servings: number,
    instructions: string,
    ingredients: RecipeIngredientInput[]
  ) => Promise<void>;
  updateRecipe: (
    id: string,
    groupId: string,
    name: string,
    servings: number,
    instructions: string,
    ingredients: RecipeIngredientInput[]
  ) => Promise<void>;
  deleteRecipe: (id: string, groupId: string) => Promise<void>;
}

async function saveIngredients(recipeId: string, ingredients: RecipeIngredientInput[]) {
  for (const ing of ingredients) {
    const trimmedName = ing.name.trim();
    if (!trimmedName) continue;

    const match = await findProductMatch(trimmedName, i18n.language);
    let productId = match?.id;
    if (!productId) {
      const { data: created } = await supabase
        .from('products')
        .insert({ canonical_name: trimmedName })
        .select('id')
        .single();
      productId = created?.id;
    }
    if (!productId) continue;

    await supabase.from('recipe_ingredients').insert({
      recipe_id: recipeId,
      product_id: productId,
      qty: ing.qty || 1,
      unit: ing.unit.trim() || null,
    });
  }
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
  recipesByGroup: {},
  loading: false,

  fetchRecipes: async (groupId: string) => {
    set({ loading: true });
    const { data } = await supabase
      .from('recipes')
      .select(
        '*, recipe_ingredients(product_id, qty, unit, products(canonical_name, canonical_name_en, category, category_en))'
      )
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (data) {
      const isEnglish = i18n.language.startsWith('en');
      const recipes: Recipe[] = data.map((row: any) => ({
        id: row.id,
        group_id: row.group_id,
        name: row.name,
        servings: row.servings ?? 2,
        instructions: row.instructions,
        created_at: row.created_at,
        ingredients: (row.recipe_ingredients ?? []).map((ri: any) => ({
          product_id: ri.product_id,
          name: isEnglish
            ? ri.products?.canonical_name_en ?? ri.products?.canonical_name ?? '?'
            : ri.products?.canonical_name ?? '?',
          qty: Number(ri.qty),
          unit: ri.unit,
          category: isEnglish
            ? ri.products?.category_en ?? ri.products?.category
            : ri.products?.category,
        })),
      }));
      set((state) => ({ recipesByGroup: { ...state.recipesByGroup, [groupId]: recipes } }));
    }
    set({ loading: false });
  },

  createRecipe: async (groupId, name, servings, instructions, ingredients) => {
    const { data: recipe, error } = await supabase
      .from('recipes')
      .insert({ group_id: groupId, name, servings, instructions: instructions.trim() || null })
      .select('id')
      .single();
    if (error || !recipe) return;

    await saveIngredients(recipe.id, ingredients);
    await get().fetchRecipes(groupId);
  },

  updateRecipe: async (id, groupId, name, servings, instructions, ingredients) => {
    await supabase
      .from('recipes')
      .update({ name, servings, instructions: instructions.trim() || null })
      .eq('id', id);

    await supabase.from('recipe_ingredients').delete().eq('recipe_id', id);
    await saveIngredients(id, ingredients);

    await get().fetchRecipes(groupId);
  },

  deleteRecipe: async (id: string, groupId: string) => {
    await supabase.from('recipes').delete().eq('id', id);
    await get().fetchRecipes(groupId);
  },
}));
