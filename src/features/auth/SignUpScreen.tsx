import React, { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../components/Screen';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuthStore } from '../../store/authStore';

export function SignUpScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const signUp = useAuthStore((s) => s.signUpWithPassword);
  const signIn = useAuthStore((s) => s.signInWithPassword);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setInfo(null);
    if (!name || !email || !password) {
      setError(t('auth.signup.errorFillAll'));
      return;
    }
    if (password.length < 6) {
      setError(t('auth.signup.errorPasswordLength'));
      return;
    }
    setLoading(true);
    const err = await signUp(email.trim(), password, name.trim());
    if (err) {
      setLoading(false);
      setError(err);
      return;
    }
    const signInErr = await signIn(email.trim(), password);
    setLoading(false);
    if (signInErr) {
      setInfo(t('auth.signup.infoConfirmEmail'));
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.inputBg,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 8,
          }}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </Pressable>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(400)} style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: theme.text }}>{t('auth.signup.title')}</Text>
            <Text style={{ fontSize: 14, color: theme.textMuted, marginTop: 4 }}>
              {t('auth.signup.subtitle')}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(400).delay(80)}>
            <Input label={t('auth.signup.nameLabel')} value={name} onChangeText={setName} placeholder={t('auth.signup.namePlaceholder')} />
            <Input
              label={t('auth.signup.emailLabel')}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.signup.emailPlaceholder')}
            />
            <Input
              label={t('auth.signup.passwordLabel')}
              secureTextEntry
              passwordToggle
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.signup.passwordPlaceholder')}
            />
            {error ? (
              <View style={{ backgroundColor: theme.dangerSoft, borderRadius: 12, padding: 12, marginBottom: 14 }}>
                <Text style={{ color: theme.danger, fontSize: 13, fontWeight: '600' }}>{error}</Text>
              </View>
            ) : null}
            {info ? (
              <View style={{ backgroundColor: theme.successSoft, borderRadius: 12, padding: 12, marginBottom: 14 }}>
                <Text style={{ color: theme.success, fontSize: 13, fontWeight: '600' }}>{info}</Text>
              </View>
            ) : null}

            <Button label={t('auth.signup.submit')} onPress={handleSubmit} loading={loading} />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
