import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { SwipeableRow } from '../../components/SwipeableRow';
import { BottomSheet } from '../../components/BottomSheet';
import { ProductSuggestions } from '../../components/ProductSuggestions';
import { useTheme } from '../../theme/ThemeProvider';
import { Recipe, RecipeIngredient, useRecipeStore } from '../../store/recipeStore';
import { useListStore } from '../../store/listStore';

interface IngredientRow {
  name: string;
  qty: string;
  unit: string;
}

const emptyRow = (): IngredientRow => ({ name: '', qty: '1', unit: '' });

export function RecipesSection({ groupId }: { groupId: string }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { recipesByGroup, fetchRecipes, createRecipe, updateRecipe, deleteRecipe } = useRecipeStore();
  const listsByGroup = useListStore((s) => s.listsByGroup);
  const fetchLists = useListStore((s) => s.fetchLists);
  const addItem = useListStore((s) => s.addItem);

  const recipes = recipesByGroup[groupId] ?? [];
  const openLists = (listsByGroup[groupId] ?? []).filter((l) => l.status === 'open');

  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [servings, setServings] = useState(2);
  const [instructions, setInstructions] = useState('');
  const [rows, setRows] = useState<IngredientRow[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [listPickerOpen, setListPickerOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchRecipes(groupId);
    fetchLists(groupId);
  }, [groupId]);

  const openAddRecipe = () => {
    setEditingId(null);
    setName('');
    setServings(2);
    setInstructions('');
    setRows([emptyRow()]);
    setError(null);
    setAddOpen(true);
  };

  const openEditRecipe = (recipe: Recipe) => {
    setEditingId(recipe.id);
    setName(recipe.name);
    setServings(recipe.servings);
    setInstructions(recipe.instructions ?? '');
    setRows(
      recipe.ingredients.length > 0
        ? recipe.ingredients.map((ing) => ({ name: ing.name, qty: String(ing.qty), unit: ing.unit ?? '' }))
        : [emptyRow()]
    );
    setError(null);
    setViewingRecipe(null);
    setAddOpen(true);
  };

  const updateRow = (index: number, patch: Partial<IngredientRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError(t('recipes.errorNameRequired'));
      return;
    }
    const validRows = rows.filter((r) => r.name.trim());
    if (validRows.length === 0) {
      setError(t('recipes.errorNoIngredients'));
      return;
    }
    setError(null);
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const ingredientInputs = validRows.map((r) => ({
      name: r.name,
      qty: parseFloat(r.qty.replace(',', '.')) || 1,
      unit: r.unit,
    }));
    if (editingId) {
      await updateRecipe(editingId, groupId, name.trim(), servings, instructions, ingredientInputs);
    } else {
      await createRecipe(groupId, name.trim(), servings, instructions, ingredientInputs);
    }
    setSaving(false);
    setAddOpen(false);
  };

  const openRecipeDetail = (recipe: Recipe) => {
    setViewingRecipe(recipe);
    setCheckedIds(new Set(recipe.ingredients.map((i) => i.product_id)));
  };

  const toggleChecked = (productId: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const addSelectedToList = async (listId: string, ingredients: RecipeIngredient[]) => {
    setAdding(true);
    for (const ing of ingredients) {
      await addItem(listId, ing.name, ing.qty || 1);
    }
    setAdding(false);
    setListPickerOpen(false);
    setViewingRecipe(null);
    Alert.alert(t('recipes.addedToList'));
  };

  const handleAddToList = () => {
    if (!viewingRecipe) return;
    const checked = viewingRecipe.ingredients.filter((ing) => checkedIds.has(ing.product_id));
    if (checked.length === 0) return;
    if (openLists.length === 0) {
      Alert.alert(t('recipes.errorNoOpenLists'));
      return;
    }
    if (openLists.length === 1) {
      addSelectedToList(openLists[0].id, checked);
    } else {
      setListPickerOpen(true);
    }
  };

  const handleDelete = (recipe: Recipe) => {
    Alert.alert(t('recipes.deleteConfirmTitle'), t('recipes.deleteConfirmMessage', { name: recipe.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteRecipe(recipe.id, groupId) },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Pressable onPress={openAddRecipe} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="add-circle" size={18} color={theme.primary} />
          <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 14 }}>{t('recipes.add')}</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {recipes.length === 0 ? (
          <EmptyState icon="restaurant-outline" title={t('recipes.emptyTitle')} subtitle={t('recipes.emptySubtitle')} />
        ) : (
          recipes.map((recipe) => (
            <Animated.View
              key={recipe.id}
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              layout={LinearTransition.springify().damping(18).stiffness(200)}
              style={{ marginBottom: 8 }}
            >
              <SwipeableRow onDelete={() => handleDelete(recipe)}>
                <Pressable onPress={() => openRecipeDetail(recipe)}>
                  <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: theme.inputBg,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="restaurant-outline" size={18} color={theme.text} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontWeight: '700', fontSize: 15 }}>{recipe.name}</Text>
                      <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 1 }}>
                        {t('recipes.servingsCount', { count: recipe.servings })} ·{' '}
                        {t('recipes.ingredientCount', { count: recipe.ingredients.length })}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                  </Card>
                </Pressable>
              </SwipeableRow>
            </Animated.View>
          ))
        )}
      </ScrollView>

      <BottomSheet visible={addOpen} onClose={() => setAddOpen(false)}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text, marginBottom: 16 }}>
            {editingId ? t('recipes.editRecipe') : t('recipes.newRecipe')}
          </Text>
          <Input placeholder={t('recipes.namePlaceholder')} value={name} onChangeText={setName} autoFocus />

          <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 8 }}>
            {t('recipes.servingsLabel')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Pressable
              onPress={() => setServings((n) => Math.max(1, n - 1))}
              style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: theme.inputBg, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="remove" size={16} color={theme.text} />
            </Pressable>
            <Text style={{ color: theme.text, fontWeight: '700', fontSize: 15, minWidth: 20, textAlign: 'center' }}>
              {servings}
            </Text>
            <Pressable
              onPress={() => setServings((n) => Math.min(30, n + 1))}
              style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: theme.inputBg, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="add" size={16} color={theme.text} />
            </Pressable>
          </View>

          <Input
            placeholder={t('recipes.instructionsPlaceholder')}
            value={instructions}
            onChangeText={setInstructions}
            multiline
            numberOfLines={4}
            style={{ height: 100, textAlignVertical: 'top', paddingTop: 14 }}
          />

          <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 8 }}>
            {t('recipes.ingredientsHeader')}
          </Text>
          {rows.map((row, index) => (
            <View key={index} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Input
                  placeholder={t('recipes.ingredientNamePlaceholder')}
                  value={row.name}
                  onChangeText={(v) => updateRow(index, { name: v })}
                  containerStyle={{ flex: 2, marginBottom: 0 }}
                />
                <Input
                  placeholder="1"
                  keyboardType="decimal-pad"
                  value={row.qty}
                  onChangeText={(v) => updateRow(index, { qty: v })}
                  containerStyle={{ flex: 1, marginBottom: 0 }}
                />
                <Input
                  placeholder="ud"
                  value={row.unit}
                  onChangeText={(v) => updateRow(index, { unit: v })}
                  containerStyle={{ flex: 1, marginBottom: 0 }}
                />
                {rows.length > 1 ? (
                  <Pressable onPress={() => removeRow(index)} hitSlop={8}>
                    <Ionicons name="close-circle" size={20} color={theme.textMuted} />
                  </Pressable>
                ) : null}
              </View>
              <ProductSuggestions query={row.name} onSelect={(s) => updateRow(index, { name: s.name, unit: row.unit || (s.defaultUnit ?? '') })} />
            </View>
          ))}
          <Pressable
            onPress={() => setRows((prev) => [...prev, emptyRow()])}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 }}
          >
            <Ionicons name="add-circle-outline" size={18} color={theme.primary} />
            <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 13 }}>{t('recipes.addIngredient')}</Text>
          </Pressable>

          {error ? <Text style={{ color: theme.danger, fontSize: 13, marginBottom: 8 }}>{error}</Text> : null}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label={t('common.cancel')} variant="secondary" onPress={() => setAddOpen(false)} style={{ flex: 1 }} />
            <Button
              label={editingId ? t('common.save') : t('common.create')}
              onPress={handleSave}
              loading={saving}
              style={{ flex: 1 }}
            />
          </View>
        </ScrollView>
      </BottomSheet>

      <BottomSheet visible={!!viewingRecipe} onClose={() => setViewingRecipe(null)}>
        {viewingRecipe ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text, flex: 1 }}>
                {viewingRecipe.name}
              </Text>
              <Pressable
                onPress={() => openEditRecipe(viewingRecipe)}
                hitSlop={10}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  backgroundColor: theme.inputBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="pencil" size={16} color={theme.text} />
              </Pressable>
            </View>
            <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: 16 }}>
              {t('recipes.servingsCount', { count: viewingRecipe.servings })}
            </Text>

            {viewingRecipe.instructions ? (
              <Text style={{ color: theme.text, fontSize: 14, lineHeight: 20, marginBottom: 20 }}>
                {viewingRecipe.instructions}
              </Text>
            ) : null}

            <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 8 }}>
              {t('recipes.ingredientsHeader')}
            </Text>
            {viewingRecipe.ingredients.map((ing) => {
              const checked = checkedIds.has(ing.product_id);
              return (
                <Pressable
                  key={ing.product_id}
                  onPress={() => toggleChecked(ing.product_id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      borderWidth: 2,
                      borderColor: checked ? theme.primary : theme.border,
                      backgroundColor: checked ? theme.primary : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {checked ? <Ionicons name="checkmark" size={14} color={theme.primaryText} /> : null}
                  </View>
                  <Text style={{ flex: 1, color: theme.text, fontSize: 14 }}>{ing.name}</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 13 }}>
                    {ing.qty} {ing.unit ?? ''}
                  </Text>
                </Pressable>
              );
            })}

            <View style={{ marginTop: 16 }}>
              <Button label={t('recipes.addToList')} onPress={handleAddToList} loading={adding} />
            </View>
          </ScrollView>
        ) : null}
      </BottomSheet>

      <BottomSheet visible={listPickerOpen} onClose={() => setListPickerOpen(false)}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 16 }}>
          {t('recipes.selectListTitle')}
        </Text>
        {openLists.map((l) => (
          <Pressable
            key={l.id}
            onPress={() => {
              if (!viewingRecipe) return;
              const checked = viewingRecipe.ingredients.filter((ing) => checkedIds.has(ing.product_id));
              addSelectedToList(l.id, checked);
            }}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 14,
              backgroundColor: theme.inputBg,
              marginBottom: 8,
            }}
          >
            <Text style={{ color: theme.text, fontWeight: '600', fontSize: 15 }}>{l.name}</Text>
          </Pressable>
        ))}
      </BottomSheet>
    </View>
  );
}
