import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
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
import { useAuthStore } from '../../store/authStore';
import { ListItem, useListStore } from '../../store/listStore';
import { useNotificationStore } from '../../store/notificationStore';

export function ListsScreen({ groupId }: { groupId: string }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const userId = useAuthStore((s) => s.session?.user.id);
  const displayName = useAuthStore((s) => s.profile?.display_name ?? s.profile?.email ?? t('common.someone'));
  const notifyGroup = useNotificationStore((s) => s.notifyGroup);

  const listsByGroup = useListStore((s) => s.listsByGroup);
  const selectedListByGroup = useListStore((s) => s.selectedListByGroup);
  const itemsByList = useListStore((s) => s.itemsByList);
  const fetchLists = useListStore((s) => s.fetchLists);
  const createList = useListStore((s) => s.createList);
  const selectList = useListStore((s) => s.selectList);
  const fetchItems = useListStore((s) => s.fetchItems);
  const subscribeToList = useListStore((s) => s.subscribeToList);
  const unsubscribe = useListStore((s) => s.unsubscribe);
  const addItem = useListStore((s) => s.addItem);
  const toggleBought = useListStore((s) => s.toggleBought);
  const deleteItem = useListStore((s) => s.deleteItem);
  const closeList = useListStore((s) => s.closeList);
  const updatePrice = useListStore((s) => s.updatePrice);

  const [newItem, setNewItem] = useState('');
  const [adding, setAdding] = useState(false);
  const [closing, setClosing] = useState(false);
  const [priceDraftId, setPriceDraftId] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState('');
  const [newListOpen, setNewListOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creatingList, setCreatingList] = useState(false);

  const allLists = listsByGroup[groupId] ?? [];
  const openLists = allLists.filter((l) => l.status === 'open');
  const selectedListId = selectedListByGroup[groupId];
  const list = openLists.find((l) => l.id === selectedListId) ?? null;
  const items = list ? itemsByList[list.id] ?? [] : [];

  useEffect(() => {
    fetchLists(groupId);
  }, [groupId]);

  useEffect(() => {
    if (!list) return;
    fetchItems(list.id);
    subscribeToList(list.id);
    return () => unsubscribe();
  }, [list?.id]);

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    setCreatingList(true);
    await createList(groupId, newListName.trim());
    setCreatingList(false);
    setNewListName('');
    setNewListOpen(false);
  };

  const handleAdd = async () => {
    if (!newItem.trim() || !list) return;
    setAdding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await addItem(list.id, newItem.trim());
    setNewItem('');
    setAdding(false);
  };

  const handleSelectSuggestion = async (name: string) => {
    if (!list) return;
    setAdding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await addItem(list.id, name);
    setNewItem('');
    setAdding(false);
  };

  const handleClose = () => {
    if (!list || !userId) return;
    const pendingCount = items.filter((i) => !i.bought_at).length;
    Alert.alert(
      t('lists.confirmCloseTitle'),
      pendingCount > 0
        ? t('lists.confirmClosePendingMessage', { count: pendingCount })
        : t('lists.confirmCloseMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('lists.confirmCloseAction'),
          onPress: async () => {
            setClosing(true);
            const result = await closeList(groupId, list.id, userId);
            setClosing(false);
            if (result && result.total > 0) {
              Alert.alert(t('lists.closedAlertTitle'), t('lists.closedAlertMessage', { amount: result.total.toFixed(2) }));
              notifyGroup({
                groupId,
                actorId: userId,
                type: 'list_closed',
                data: { actorName: displayName, listName: list.name, amount: result.total.toFixed(2) },
              }).catch(() => {});
            }
          },
        },
      ]
    );
  };

  const pending = items.filter((i) => !i.bought_at);
  const bought = items.filter((i) => i.bought_at);
  const totalSoFar = items.reduce((s, i) => s + (i.price ?? 0), 0);

  const renderItem = (item: ListItem) => {
    const isBought = !!item.bought_at;
    const isEditingPrice = priceDraftId === item.id;
    return (
      <Animated.View
        key={item.id}
        entering={FadeIn.duration(220)}
        exiting={FadeOut.duration(160)}
        layout={LinearTransition.springify().damping(18).stiffness(200)}
        style={{ marginBottom: 8 }}
      >
        <SwipeableRow onDelete={() => deleteItem(item.id)}>
          <Card style={{ opacity: isBought ? 0.55 : 1 }} flat={isBought}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  userId && toggleBought(item, userId);
                }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor: isBought ? theme.success : theme.border,
                  backgroundColor: isBought ? theme.success : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isBought ? <Ionicons name="checkmark" size={17} color="#fff" /> : null}
              </Pressable>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 16,
                    fontWeight: '600',
                    textDecorationLine: isBought ? 'line-through' : 'none',
                  }}
                >
                  {item.custom_name ?? '—'} {item.qty > 1 ? `×${item.qty}` : ''}
                </Text>
                {item.category ? (
                  <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 1 }}>{item.category}</Text>
                ) : null}
              </View>

              {isEditingPrice ? (
                <TextInput
                  autoFocus
                  keyboardType="decimal-pad"
                  value={priceDraft}
                  onChangeText={setPriceDraft}
                  onBlur={async () => {
                    const parsed = parseFloat(priceDraft.replace(',', '.'));
                    await updatePrice(item.id, isNaN(parsed) ? null : parsed);
                    setPriceDraftId(null);
                  }}
                  placeholder="0.00 €"
                  placeholderTextColor={theme.textMuted}
                  style={{
                    width: 90,
                    height: 40,
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    backgroundColor: theme.inputBg,
                    color: theme.text,
                  }}
                />
              ) : (
                <Pressable
                  onPress={() => {
                    setPriceDraftId(item.id);
                    setPriceDraft(item.price?.toString() ?? '');
                  }}
                  style={{
                    backgroundColor: item.price ? theme.successSoft : theme.inputBg,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 10,
                  }}
                >
                  <Text style={{ color: item.price ? theme.success : theme.textMuted, fontWeight: '700', fontSize: 13 }}>
                    {item.price ? `${item.price.toFixed(2)} €` : t('lists.priceLabel')}
                  </Text>
                </Pressable>
              )}
            </View>
          </Card>
        </SwipeableRow>
      </Animated.View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingBottom: 14 }}
        style={{ flexGrow: 0, marginBottom: 4 }}
      >
        {openLists.map((l) => {
          const active = l.id === selectedListId;
          return (
            <Pressable
              key={l.id}
              onPress={() => selectList(groupId, l.id)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 18,
                backgroundColor: active ? theme.primary : theme.inputBg,
              }}
            >
              <Text style={{ color: active ? theme.primaryText : theme.text, fontWeight: '700', fontSize: 13 }}>
                {l.name}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setNewListOpen(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 14,
            paddingVertical: 9,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Ionicons name="add" size={15} color={theme.primary} />
          <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 13 }}>{t('lists.newList')}</Text>
        </Pressable>
      </ScrollView>

      {!list ? (
        <EmptyState
          icon="cart-outline"
          title={t('lists.emptyOpenTitle')}
          subtitle={t('lists.emptyOpenSubtitle')}
        />
      ) : (
        <>
          {totalSoFar > 0 ? (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: theme.primarySoft,
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 12,
                marginBottom: 14,
              }}
            >
              <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 13 }}>{t('lists.cartTotal')}</Text>
              <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 16 }}>{totalSoFar.toFixed(2)} €</Text>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <Input
              value={newItem}
              onChangeText={setNewItem}
              placeholder={t('lists.addProductPlaceholder')}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
              containerStyle={{ flex: 1, marginBottom: 0 }}
            />
            <Button label={t('lists.add')} onPress={handleAdd} loading={adding} style={{ width: 96 }} />
          </View>

          <ProductSuggestions query={newItem} onSelect={(s) => handleSelectSuggestion(s.name)} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            {items.length === 0 ? (
              <EmptyState icon="basket-outline" title={t('lists.emptyListTitle')} subtitle={t('lists.emptyListSubtitle')} />
            ) : (
              [...pending, ...bought].map(renderItem)
            )}
          </ScrollView>

          {items.length > 0 ? (
            <View style={{ position: 'absolute', bottom: 16, left: 0, right: 0 }}>
              <Pressable
                onPress={handleClose}
                disabled={closing}
                style={{
                  height: 52,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: closing ? 0.6 : 1,
                  backgroundColor: theme.primary,
                }}
              >
                <Text style={{ color: theme.primaryText, fontWeight: '700', fontSize: 16 }}>
                  {t('lists.closeAndGenerate')}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </>
      )}

      <BottomSheet visible={newListOpen} onClose={() => setNewListOpen(false)}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text, marginBottom: 16 }}>{t('lists.newList')}</Text>
        <Input
          placeholder={t('lists.newListNamePlaceholder')}
          value={newListName}
          onChangeText={setNewListName}
          autoFocus
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button label={t('common.cancel')} variant="secondary" onPress={() => setNewListOpen(false)} style={{ flex: 1 }} />
          <Button label={t('common.create')} onPress={handleCreateList} loading={creatingList} style={{ flex: 1 }} />
        </View>
      </BottomSheet>
    </View>
  );
}
