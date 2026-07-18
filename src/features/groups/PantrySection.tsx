import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { BottomSheet } from '../../components/BottomSheet';
import { SwipeableRow } from '../../components/SwipeableRow';
import { ProductSuggestions } from '../../components/ProductSuggestions';
import { useTheme } from '../../theme/ThemeProvider';
import { PantryItem, usePantryStore } from '../../store/pantryStore';
import { useListStore } from '../../store/listStore';
import { fetchPurchasePredictions, getPreferredListName, PurchasePrediction } from '../../lib/purchaseCycles';

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function PantrySection({ groupId, navigation }: { groupId: string; navigation: any }) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { itemsByGroup, fetchPantry, addOrIncrement, updateQty, removeItem } = usePantryStore();
  const listsByGroup = useListStore((s) => s.listsByGroup);
  const fetchLists = useListStore((s) => s.fetchLists);
  const addItem = useListStore((s) => s.addItem);

  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState('ud');
  const [saving, setSaving] = useState(false);
  const [predictions, setPredictions] = useState<PurchasePrediction[]>([]);
  const [pendingPrediction, setPendingPrediction] = useState<PurchasePrediction | null>(null);
  const [listPickerOpen, setListPickerOpen] = useState(false);

  const items = itemsByGroup[groupId] ?? [];
  const openLists = (listsByGroup[groupId] ?? []).filter((l) => l.status === 'open');

  useEffect(() => {
    fetchPantry(groupId);
    fetchLists(groupId);
    fetchPurchasePredictions(groupId, i18n.language).then(setPredictions);
  }, [groupId, i18n.language]);

  const addPredictionToList = async (listId: string, prediction: PurchasePrediction) => {
    await addItem(listId, prediction.name);
    setPredictions((prev) => prev.filter((p) => p.product_id !== prediction.product_id));
    setListPickerOpen(false);
    setPendingPrediction(null);
  };

  const handleAddPrediction = async (prediction: PurchasePrediction) => {
    if (openLists.length === 0) {
      Alert.alert(t('recipes.errorNoOpenLists'));
      return;
    }
    const preferredName = await getPreferredListName(prediction.product_id);
    const target = preferredName ? openLists.find((l) => l.name === preferredName) : null;

    if (target) {
      await addPredictionToList(target.id, prediction);
    } else if (openLists.length === 1) {
      await addPredictionToList(openLists[0].id, prediction);
    } else {
      setPendingPrediction(prediction);
      setListPickerOpen(true);
    }
  };

  const handleAdd = async () => {
    const parsedQty = parseFloat(qty.replace(',', '.')) || 1;
    setSaving(true);
    await addOrIncrement(groupId, name, parsedQty, unit.trim() || 'ud');
    setSaving(false);
    setName('');
    setQty('1');
    setUnit('ud');
    setAddOpen(false);
  };

  const renderItem = (item: PantryItem) => {
    const days = daysUntil(item.expires_at);
    const isSoon = days !== null && days <= 3;
    return (
      <Animated.View
        key={item.id}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        layout={LinearTransition.springify().damping(18).stiffness(200)}
        style={{ marginBottom: 8 }}
      >
        <SwipeableRow onDelete={() => removeItem(item.id, groupId)}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: '600', fontSize: 15 }}>{item.product_name}</Text>
              <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 1 }}>
                {item.qty} {item.unit ?? 'ud'}
                {days !== null ? (
                  <Text style={{ color: isSoon ? theme.danger : theme.textMuted }}>
                    {'  ·  '}
                    {days < 0 ? t('pantry.expired') : days === 0 ? t('pantry.expiresToday') : t('pantry.expiresIn', { days })}
                  </Text>
                ) : null}
              </Text>
            </View>
            <Pressable
              onPress={() => updateQty(item, -1)}
              style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: theme.inputBg, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="remove" size={16} color={theme.text} />
            </Pressable>
            <Pressable
              onPress={() => updateQty(item, 1)}
              style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="add" size={16} color={theme.primary} />
            </Pressable>
          </Card>
        </SwipeableRow>
      </Animated.View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Pressable onPress={() => setAddOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="add-circle" size={18} color={theme.primary} />
          <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 14 }}>{t('pantry.add')}</Text>
        </Pressable>
      </View>

      {predictions.length > 0 ? (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: theme.textMuted, marginBottom: 8, letterSpacing: 0.5 }}>
            {t('pantry.predictionsHeader')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
            {predictions.map((p) => (
              <Pressable
                key={p.product_id}
                onPress={() => handleAddPrediction(p)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 9,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <Ionicons name="add-circle-outline" size={15} color={theme.primary} />
                <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>{p.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {items.length === 0 ? (
          <EmptyState
            icon="file-tray-stacked-outline"
            title={t('pantry.emptyTitle')}
            subtitle={t('pantry.emptySubtitle')}
          />
        ) : (
          items.map(renderItem)
        )}
      </ScrollView>

      <BottomSheet visible={addOpen} onClose={() => setAddOpen(false)}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text, marginBottom: 16 }}>{t('pantry.addSheetTitle')}</Text>
        <Input placeholder={t('pantry.namePlaceholder')} value={name} onChangeText={setName} autoFocus />
        <ProductSuggestions
          query={name}
          onSelect={(s) => {
            setName(s.name);
            if (s.defaultUnit) setUnit(s.defaultUnit);
          }}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Input
            placeholder={t('pantry.qtyPlaceholder')}
            keyboardType="decimal-pad"
            value={qty}
            onChangeText={setQty}
            containerStyle={{ flex: 1 }}
          />
          <Input placeholder={t('pantry.unitPlaceholder')} value={unit} onChangeText={setUnit} containerStyle={{ flex: 1 }} />
        </View>
        <Button label={t('pantry.add')} onPress={handleAdd} loading={saving} />
      </BottomSheet>

      <BottomSheet visible={listPickerOpen} onClose={() => setListPickerOpen(false)}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 16 }}>
          {t('pantry.selectListTitle')}
        </Text>
        {openLists.map((l) => (
          <Pressable
            key={l.id}
            onPress={() => pendingPrediction && addPredictionToList(l.id, pendingPrediction)}
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
