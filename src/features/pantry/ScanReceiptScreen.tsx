import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuthStore } from '../../store/authStore';
import { useGroupStore } from '../../store/groupStore';
import { usePantryStore } from '../../store/pantryStore';
import { useExpenseStore } from '../../store/expenseStore';
import { useNotificationStore } from '../../store/notificationStore';
import { supabase } from '../../lib/supabase';

interface DraftItem {
  name: string;
  qty: string;
  price: string;
}

export function ScanReceiptScreen({ route, navigation }: any) {
  const { groupId } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const userId = useAuthStore((s) => s.session?.user.id);
  const displayName = useAuthStore((s) => s.profile?.display_name ?? s.profile?.email ?? t('common.someone'));
  const members = useGroupStore((s) => s.members);
  const fetchMembers = useGroupStore((s) => s.fetchMembers);
  const addOrIncrement = usePantryStore((s) => s.addOrIncrement);
  const addExpense = useExpenseStore((s) => s.addExpense);
  const notifyGroup = useNotificationStore((s) => s.notifyGroup);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [saving, setSaving] = useState(false);

  const pickImage = async (fromCamera: boolean) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('common.permissionNeededTitle'), t('common.permissionNeededMessage'));
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, base64: false })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, base64: false });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setItems([]);
      setAiMessage(null);
    }
  };

  const analyze = async () => {
    if (!photoUri) return;
    setAnalyzing(true);
    try {
      const arrayBuffer = await new File(photoUri).arrayBuffer();
      const path = `${groupId}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(path, arrayBuffer, { contentType: 'image/jpeg' });

      if (uploadError) {
        Alert.alert('Error', t('scanReceipt.errorUploadFailed'));
        return;
      }

      const { data, error } = await supabase.functions.invoke('parse-receipt', { body: { path } });

      if (error || !data) {
        setAiMessage(t('scanReceipt.aiNotAnalyzed'));
        setItems([{ name: '', qty: '1', price: '' }]);
        return;
      }

      if (data.configured === false) {
        setAiMessage(data.message ?? t('scanReceipt.aiNotConfigured'));
        setItems([{ name: '', qty: '1', price: '' }]);
      } else if (data.items?.length > 0) {
        setItems(
          data.items.map((i: any) => ({
            name: i.name ?? '',
            qty: String(i.qty ?? 1),
            price: String(i.price ?? ''),
          }))
        );
      } else {
        setAiMessage(t('scanReceipt.aiNoItems'));
        setItems([{ name: '', qty: '1', price: '' }]);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const updateItem = (index: number, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const removeRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addRow = () => setItems((prev) => [...prev, { name: '', qty: '1', price: '' }]);

  const total = items.reduce((sum, it) => sum + (parseFloat(it.price.replace(',', '.')) || 0), 0);

  const handleConfirm = async () => {
    const validItems = items.filter((it) => it.name.trim());
    if (validItems.length === 0 || !userId) return;

    setSaving(true);

    for (const it of validItems) {
      const qty = parseFloat(it.qty.replace(',', '.')) || 1;
      await addOrIncrement(groupId, it.name.trim(), qty, 'ud');
    }

    if (total > 0) {
      let groupMembers = members[groupId];
      if (!groupMembers) {
        await fetchMembers(groupId);
        groupMembers = useGroupStore.getState().members[groupId] ?? [];
      }
      const participants =
        groupMembers.length > 0
          ? groupMembers.map((m) => ({ userId: m.user_id, weight: Number(m.share_weight) }))
          : [{ userId, weight: 1 }];
      await addExpense(groupId, userId, total, 'Ticket escaneado', participants, false);
    }

    notifyGroup({
      groupId,
      actorId: userId,
      type: 'receipt_scanned',
      data: { actorName: displayName, amount: total > 0 ? total.toFixed(2) : null },
    }).catch(() => {});

    setSaving(false);
    Alert.alert(t('scanReceipt.doneTitle'), total > 0 ? t('scanReceipt.doneMessageWithExpense') : t('scanReceipt.doneMessage'));
    navigation.goBack();
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8, paddingBottom: 16 }}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: theme.inputBg, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text }}>{t('scanReceipt.title')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {!photoUri ? (
          <View style={{ gap: 10 }}>
            <Button label={t('scanReceipt.takePhoto')} onPress={() => pickImage(true)} />
            <Button label={t('scanReceipt.pickGallery')} variant="secondary" onPress={() => pickImage(false)} />
          </View>
        ) : (
          <>
            <Image source={{ uri: photoUri }} style={{ width: '100%', height: 220, borderRadius: 16, marginBottom: 12 }} resizeMode="cover" />
            {items.length === 0 ? (
              <Button label={t('scanReceipt.analyze')} onPress={analyze} loading={analyzing} />
            ) : null}
            {aiMessage ? (
              <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 10, marginBottom: 4 }}>{aiMessage}</Text>
            ) : null}

            {items.length > 0 ? (
              <View style={{ marginTop: 16, gap: 8 }}>
                {items.map((item, idx) => (
                  <Card key={idx} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TextInput
                      placeholder={t('scanReceipt.namePlaceholder')}
                      placeholderTextColor={theme.textMuted}
                      value={item.name}
                      onChangeText={(v) => updateItem(idx, { name: v })}
                      style={{ flex: 1, color: theme.text, fontSize: 14 }}
                    />
                    <TextInput
                      placeholder={t('scanReceipt.qtyPlaceholder')}
                      placeholderTextColor={theme.textMuted}
                      keyboardType="decimal-pad"
                      value={item.qty}
                      onChangeText={(v) => updateItem(idx, { qty: v })}
                      style={{ width: 44, color: theme.text, fontSize: 14, textAlign: 'center' }}
                    />
                    <TextInput
                      placeholder={t('scanReceipt.pricePlaceholder')}
                      placeholderTextColor={theme.textMuted}
                      keyboardType="decimal-pad"
                      value={item.price}
                      onChangeText={(v) => updateItem(idx, { price: v })}
                      style={{ width: 64, color: theme.text, fontSize: 14, textAlign: 'right' }}
                    />
                    <Pressable onPress={() => removeRow(idx)} hitSlop={8}>
                      <Ionicons name="close-circle" size={20} color={theme.textMuted} />
                    </Pressable>
                  </Card>
                ))}

                <Pressable onPress={addRow} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 }}>
                  <Ionicons name="add-circle-outline" size={18} color={theme.primary} />
                  <Text style={{ color: theme.primary, fontWeight: '600' }}>{t('scanReceipt.addLine')}</Text>
                </Pressable>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, marginBottom: 4 }}>
                  <Text style={{ color: theme.textMuted, fontWeight: '600' }}>{t('scanReceipt.total')}</Text>
                  <Text style={{ color: theme.text, fontWeight: '800' }}>{total.toFixed(2)} €</Text>
                </View>

                <Button label={t('scanReceipt.confirmApply')} onPress={handleConfirm} loading={saving} />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
