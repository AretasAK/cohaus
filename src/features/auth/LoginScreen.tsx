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

export function LoginScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const signIn = useAuthStore((s) => s.signInWithPassword);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!email || !password) {
      setError(t('auth.login.errorFillFields'));
      return;
    }
    setLoading(true);
    const err = await signIn(email.trim(), password);
    setLoading(false);
    if (err) setError(err);
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    const err = await signInWithGoogle();
    setGoogleLoading(false);
    if (err) setError(err);
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: 'center', marginBottom: 36 }}>
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18,
                backgroundColor: theme.primary,
              }}
            >
              <Ionicons name="home" size={36} color={theme.primaryText} />
            </View>
            <Text style={{ fontSize: 30, fontWeight: '800', color: theme.text, letterSpacing: -0.6 }}>{t('auth.login.appName')}</Text>
            <Text style={{ fontSize: 14, color: theme.textMuted, marginTop: 4 }}>
              {t('auth.login.tagline')}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(400).delay(80)}>
            <Input
              label={t('auth.login.emailLabel')}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.login.emailPlaceholder')}
            />
            <Input
              label={t('auth.login.passwordLabel')}
              secureTextEntry
              passwordToggle
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.login.passwordPlaceholder')}
            />
            {error ? (
              <View
                style={{
                  backgroundColor: theme.dangerSoft,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 14,
                }}
              >
                <Text style={{ color: theme.danger, fontSize: 13, fontWeight: '600' }}>{error}</Text>
              </View>
            ) : null}

            <Button label={t('auth.login.submit')} onPress={handleSubmit} loading={loading} />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
              <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: '600' }}>{t('auth.login.or')}</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
            </View>

            <Pressable
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                height: 52,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.card,
                opacity: googleLoading ? 0.6 : 1,
              }}
            >
              <Ionicons name="logo-google" size={18} color={theme.text} />
              <Text style={{ color: theme.text, fontWeight: '700', fontSize: 15 }}>{t('auth.login.google')}</Text>
            </Pressable>

            <Button
              label={t('auth.login.createAccount')}
              variant="ghost"
              onPress={() => navigation.navigate('SignUp')}
              style={{ marginTop: 8 }}
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
