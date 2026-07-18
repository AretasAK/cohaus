import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../components/Screen';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuthStore } from '../../store/authStore';

export function DeleteAccountScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmWord = t('legal.deleteConfirmWord');
  const canDelete = confirmText.trim().toUpperCase() === confirmWord;

  const handleDelete = async () => {
    setError(null);
    setSubmitting(true);
    const err = await deleteAccount();
    setSubmitting(false);
    if (err) setError(err);
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
        <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text }}>{t('legal.deleteAccountTitle')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={{ color: theme.text, fontSize: 15, fontWeight: '600', marginBottom: 14 }}>
          {t('legal.deleteAccountIntro')}
        </Text>

        <View style={{ gap: 12, marginBottom: 24 }}>
          {[t('legal.deleteBullet1'), t('legal.deleteBullet2'), t('legal.deleteBullet3')].map((bullet, idx) => (
            <View key={idx} style={{ flexDirection: 'row', gap: 10 }}>
              <Ionicons name="ellipse" size={6} color={theme.danger} style={{ marginTop: 8 }} />
              <Text style={{ color: theme.textMuted, fontSize: 14, lineHeight: 20, flex: 1 }}>{bullet}</Text>
            </View>
          ))}
        </View>

        <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: 8 }}>
          {t('legal.deleteConfirmLabel', { word: confirmWord })}
        </Text>
        <Input
          value={confirmText}
          onChangeText={setConfirmText}
          placeholder={t('legal.deleteConfirmPlaceholder')}
          autoCapitalize="characters"
        />

        {error ? <Text style={{ color: theme.danger, fontSize: 13, marginBottom: 8 }}>{error}</Text> : null}

        <Button
          label={t('legal.deleteButton')}
          variant="danger"
          onPress={handleDelete}
          loading={submitting}
          disabled={!canDelete}
        />
      </ScrollView>
    </Screen>
  );
}
