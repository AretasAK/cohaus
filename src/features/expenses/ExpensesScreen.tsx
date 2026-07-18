import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { File } from 'expo-file-system';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Avatar } from '../../components/Avatar';
import { EmptyState } from '../../components/EmptyState';
import { BottomSheet } from '../../components/BottomSheet';
import { SwipeableRow } from '../../components/SwipeableRow';
import { ImageViewerModal } from '../../components/ImageViewerModal';
import { useTheme } from '../../theme/ThemeProvider';
import { useGroupStore } from '../../store/groupStore';
import { useAuthStore } from '../../store/authStore';
import { useExpenseStore } from '../../store/expenseStore';
import { useNotificationStore } from '../../store/notificationStore';
import { splitAmount } from '../../lib/split';
import { supabase } from '../../lib/supabase';

export function ExpensesScreen({ groupId, navigation }: { groupId: string; navigation: any }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const members = useGroupStore((s) => s.members);
  const fetchMembers = useGroupStore((s) => s.fetchMembers);
  const userId = useAuthStore((s) => s.session?.user.id);
  const displayName = useAuthStore((s) => s.profile?.display_name ?? s.profile?.email ?? t('common.someone'));
  const notifyGroup = useNotificationStore((s) => s.notifyGroup);

  const expensesByGroup = useExpenseStore((s) => s.expensesByGroup);
  const fetchExpenses = useExpenseStore((s) => s.fetchExpenses);
  const addExpense = useExpenseStore((s) => s.addExpense);
  const deleteExpense = useExpenseStore((s) => s.deleteExpense);

  const [modalOpen, setModalOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [splitByWeight, setSplitByWeight] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [receiptUrls, setReceiptUrls] = useState<Record<string, string>>({});
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  const expenses = expensesByGroup[groupId] ?? [];
  const groupMembers = members[groupId] ?? [];
  const hasMixedWeights = groupMembers.some((m) => Number(m.share_weight) !== 1);

  useEffect(() => {
    fetchExpenses(groupId);
    fetchMembers(groupId);
  }, [groupId]);

  useEffect(() => {
    const withReceipt = expenses.filter((e) => e.receipt_path && !receiptUrls[e.id]);
    if (withReceipt.length === 0) return;
    (async () => {
      const entries = await Promise.all(
        withReceipt.map(async (e) => {
          const { data } = await supabase.storage.from('receipts').createSignedUrl(e.receipt_path!, 3600);
          return [e.id, data?.signedUrl ?? ''] as const;
        })
      );
      setReceiptUrls((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    })();
  }, [expenses]);

  const parsedAmount = parseFloat(amount.replace(',', '.'));
  const previewValid = !isNaN(parsedAmount) && parsedAmount > 0 && groupMembers.length > 0;
  const previewShares = previewValid
    ? splitAmount(
        parsedAmount,
        splitByWeight ? groupMembers.map((m) => Number(m.share_weight)) : groupMembers.map(() => 1)
      )
    : [];

  const pickReceipt = async (fromCamera: boolean) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('common.permissionNeededTitle'), t('common.permissionNeededMessage'));
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const handleAdd = async () => {
    setError(null);
    if (!description.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError(t('expenses.errorInvalid'));
      return;
    }
    if (!userId) return;
    setSubmitting(true);

    let receiptPath: string | null = null;
    if (receiptUri) {
      const arrayBuffer = await new File(receiptUri).arrayBuffer();
      const path = `${groupId}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(path, arrayBuffer, { contentType: 'image/jpeg' });
      if (!uploadError) receiptPath = path;
    }

    const participants =
      groupMembers.length > 0
        ? groupMembers.map((m) => ({ userId: m.user_id, weight: Number(m.share_weight) }))
        : [{ userId, weight: 1 }];
    await addExpense(groupId, userId, parsedAmount, description.trim(), participants, splitByWeight, receiptPath);
    notifyGroup({
      groupId,
      actorId: userId,
      type: 'expense_added',
      data: { actorName: displayName, description: description.trim(), amount: parsedAmount.toFixed(2) },
    }).catch(() => {});
    setSubmitting(false);
    setModalOpen(false);
    setDescription('');
    setAmount('');
    setReceiptUri(null);
  };

  return (
    <View style={{ flex: 1 }}>
      <Pressable
        onPress={() => navigation.navigate('Balances', { groupId })}
        style={{
          marginBottom: 16,
          backgroundColor: theme.primary,
          borderRadius: 14,
          padding: 18,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View>
          <Text style={{ color: theme.primaryText, fontWeight: '800', fontSize: 16 }}>{t('expenses.viewBalances')}</Text>
          <Text style={{ color: theme.primaryText, opacity: 0.8, fontSize: 12, marginTop: 2 }}>
            {t('expenses.viewBalancesSubtitle')}
          </Text>
        </View>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            backgroundColor: 'rgba(255,255,255,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="arrow-forward" size={18} color={theme.primaryText} />
        </View>
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate('ScanReceipt', { groupId })}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}
      >
        <Ionicons name="camera-outline" size={17} color={theme.primary} />
        <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 13 }}>
          {t('expenses.scanReceipt')}
        </Text>
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {expenses.length === 0 ? (
          <EmptyState icon="receipt-outline" title={t('expenses.emptyTitle')} subtitle={t('expenses.emptySubtitle')} />
        ) : (
          expenses.map((item) => (
            <Animated.View
              key={item.id}
              entering={FadeIn.duration(220)}
              exiting={FadeOut.duration(160)}
              layout={LinearTransition.springify().damping(18).stiffness(200)}
              style={{ marginBottom: 10 }}
            >
              <SwipeableRow onDelete={() => deleteExpense(item.id, groupId)}>
                <Card>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Avatar name={item.payer_name ?? '?'} url={item.payer_avatar} size={40} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontWeight: '700', fontSize: 15 }}>{item.description}</Text>
                      <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>
                        {t('expenses.paidBy', { name: item.payer_name })} · {new Date(item.created_at).toLocaleDateString('es-ES')}
                      </Text>
                    </View>
                    {item.receipt_path && receiptUrls[item.id] ? (
                      <Pressable onPress={() => setViewerUri(receiptUrls[item.id])}>
                        <Image
                          source={{ uri: receiptUrls[item.id] }}
                          style={{ width: 34, height: 34, borderRadius: 8 }}
                        />
                      </Pressable>
                    ) : null}
                    <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>
                      {item.amount.toFixed(2)} €
                    </Text>
                  </View>
                </Card>
              </SwipeableRow>
            </Animated.View>
          ))
        )}
      </ScrollView>

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          setModalOpen(true);
        }}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 0,
          backgroundColor: theme.primary,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          height: 52,
          paddingHorizontal: 22,
          borderRadius: 14,
          shadowColor: theme.primary,
          shadowOpacity: 0.3,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        }}
      >
        <Ionicons name="add" size={22} color={theme.primaryText} />
        <Text style={{ color: theme.primaryText, fontWeight: '700', fontSize: 15 }}>{t('expenses.newExpense')}</Text>
      </Pressable>

      <BottomSheet
        visible={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setReceiptUri(null);
        }}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text, marginBottom: 16 }}>{t('expenses.newExpense')}</Text>
          <Input placeholder={t('expenses.descriptionPlaceholder')} value={description} onChangeText={setDescription} autoFocus />
          <Input placeholder={t('expenses.amountPlaceholder')} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />

          {hasMixedWeights ? (
            <Pressable
              onPress={() => setSplitByWeight((v) => !v)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: theme.inputBg,
                borderRadius: 14,
                padding: 14,
                marginBottom: 10,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: '600', fontSize: 14 }}>{t('expenses.splitByWeight')}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>
                  {splitByWeight
                    ? t('expenses.splitByWeightOn')
                    : t('expenses.splitEqual', { count: groupMembers.length || 1 })}
                </Text>
              </View>
              <View
                style={{
                  width: 46,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: splitByWeight ? theme.primary : theme.border,
                  padding: 3,
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: '#fff',
                    transform: [{ translateX: splitByWeight ? 18 : 0 }],
                  }}
                />
              </View>
            </Pressable>
          ) : (
            <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 10 }}>
              {t('expenses.splitEqualStatic', { count: groupMembers.length || 1 })}
            </Text>
          )}

          {previewValid ? (
            <View style={{ backgroundColor: theme.inputBg, borderRadius: 14, padding: 12, marginBottom: 14, gap: 6 }}>
              {groupMembers.map((m, i) => (
                <View key={m.user_id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: theme.textMuted, fontSize: 13 }}>
                    {m.display_name ?? m.email}
                    {splitByWeight ? ` (peso ${Number(m.share_weight)})` : ''}
                  </Text>
                  <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>
                    {previewShares[i]?.toFixed(2)} €
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {receiptUri ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <Image source={{ uri: receiptUri }} style={{ width: 52, height: 52, borderRadius: 10 }} />
              <Text style={{ color: theme.textMuted, fontSize: 13, flex: 1 }}>{t('expenses.receiptAttached')}</Text>
              <Pressable onPress={() => setReceiptUri(null)} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={theme.textMuted} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() =>
                Alert.alert(t('expenses.attachSheetTitle'), undefined, [
                  { text: t('common.cancel'), style: 'cancel' },
                  { text: t('expenses.takePhoto'), onPress: () => pickReceipt(true) },
                  { text: t('expenses.pickGallery'), onPress: () => pickReceipt(false) },
                ])
              }
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}
            >
              <Ionicons name="attach-outline" size={18} color={theme.primary} />
              <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 13 }}>
                {t('expenses.attachReceipt')}
              </Text>
            </Pressable>
          )}

          {error ? <Text style={{ color: theme.danger, fontSize: 13, marginBottom: 8 }}>{error}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button
              label={t('common.cancel')}
              variant="secondary"
              onPress={() => {
                setModalOpen(false);
                setReceiptUri(null);
              }}
              style={{ flex: 1 }}
            />
            <Button label={t('common.add')} onPress={handleAdd} loading={submitting} style={{ flex: 1 }} />
          </View>
        </ScrollView>
      </BottomSheet>

      <ImageViewerModal visible={!!viewerUri} uri={viewerUri} onClose={() => setViewerUri(null)} />
    </View>
  );
}
