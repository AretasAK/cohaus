import React, { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Avatar } from '../../components/Avatar';
import { BottomSheet } from '../../components/BottomSheet';
import { useTheme } from '../../theme/ThemeProvider';
import { getContrastText, isValidHexColor } from '../../theme/contrast';
import { useLanguage, LanguagePreference } from '../../i18n/LanguageProvider';
import { useAuthStore } from '../../store/authStore';

const ACCENT_PRESETS = [
  '#4C5C66',
  '#C96F4A',
  '#5C8A63',
  '#4C7A9B',
  '#9B4C7A',
  '#B0793A',
  '#3A7D7D',
  '#7A5C9B',
  '#C24C4C',
  '#4C9B6E',
];

const THEME_OPTIONS: { key: 'system' | 'light' | 'dark'; labelKey: 'themeSystem' | 'themeLight' | 'themeDark'; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'system', labelKey: 'themeSystem', icon: 'phone-portrait-outline' },
  { key: 'light', labelKey: 'themeLight', icon: 'sunny-outline' },
  { key: 'dark', labelKey: 'themeDark', icon: 'moon-outline' },
];

const LANGUAGE_OPTIONS: { key: LanguagePreference; labelKey: 'languageSystem' | 'languageEs' | 'languageEn'; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'system', labelKey: 'languageSystem', icon: 'phone-portrait-outline' },
  { key: 'es', labelKey: 'languageEs', icon: 'language-outline' },
  { key: 'en', labelKey: 'languageEn', icon: 'language-outline' },
];

type FormMode = 'none' | 'name' | 'email' | 'password';

function SettingsRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: theme.inputBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={18} color={theme.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.text, fontSize: 15, fontWeight: '600' }}>{label}</Text>
        {value ? <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 1 }}>{value}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
    </Pressable>
  );
}

export function ProfileScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { theme, preference, setPreference, accentColor, setAccentColor } = useTheme();
  const { preference: langPreference, setPreference: setLangPreference } = useLanguage();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const updateDisplayName = useAuthStore((s) => s.updateDisplayName);
  const updateEmail = useAuthStore((s) => s.updateEmail);
  const updatePassword = useAuthStore((s) => s.updatePassword);
  const uploadAvatar = useAuthStore((s) => s.uploadAvatar);
  const setPushEnabled = useAuthStore((s) => s.setPushEnabled);

  const [formMode, setFormMode] = useState<FormMode>('none');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [pushToggling, setPushToggling] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [accentHexInput, setAccentHexInput] = useState(accentColor ?? '');
  const [accentError, setAccentError] = useState<string | null>(null);

  const openForm = (mode: FormMode) => {
    setError(null);
    setInfo(null);
    setName(profile?.display_name ?? '');
    setEmail(profile?.email ?? '');
    setCurrentPassword('');
    setNewPassword('');
    setFormMode(mode);
  };

  const closeForm = () => setFormMode('none');

  const handleChangeAvatar = async () => {
    setAvatarError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setAvatarError(t('profile.errorPhotoPermission'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingAvatar(true);
    const err = await uploadAvatar(result.assets[0].uri);
    setUploadingAvatar(false);
    if (err) setAvatarError(err);
  };

  const handleTogglePush = async (value: boolean) => {
    setPushError(null);
    setPushToggling(true);
    const err = await setPushEnabled(value);
    setPushToggling(false);
    if (err) setPushError(err);
  };

  const handlePickPreset = (hex: string) => {
    setAccentError(null);
    setAccentHexInput(hex);
    setAccentColor(hex);
  };

  const handleApplyHex = () => {
    const value = accentHexInput.trim();
    if (!isValidHexColor(value)) {
      setAccentError(t('profile.errorInvalidColor'));
      return;
    }
    setAccentError(null);
    setAccentColor(value);
  };

  const handleResetAccent = () => {
    setAccentError(null);
    setAccentHexInput('');
    setAccentColor(null);
  };

  const handleSaveName = async () => {
    if (!name.trim()) {
      setError(t('profile.errorNameEmpty'));
      return;
    }
    setSubmitting(true);
    const err = await updateDisplayName(name.trim());
    setSubmitting(false);
    if (err) setError(err);
    else closeForm();
  };

  const handleSaveEmail = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError(t('profile.errorInvalidEmail'));
      return;
    }
    setSubmitting(true);
    const err = await updateEmail(email.trim());
    setSubmitting(false);
    if (err) setError(err);
    else setInfo(t('profile.infoEmailChangeSent'));
  };

  const handleSavePassword = async () => {
    if (!currentPassword || newPassword.length < 6) {
      setError(t('profile.errorPasswordRequirements'));
      return;
    }
    setSubmitting(true);
    const err = await updatePassword(currentPassword, newPassword);
    setSubmitting(false);
    if (err) setError(err);
    else {
      setInfo(t('profile.infoPasswordUpdated'));
      setCurrentPassword('');
      setNewPassword('');
    }
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={{ paddingTop: 8, paddingBottom: 20 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: theme.text, letterSpacing: -0.5 }}>{t('profile.title')}</Text>
      </View>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 }}>
        <Pressable onPress={handleChangeAvatar} disabled={uploadingAvatar}>
          <Avatar name={profile?.display_name ?? profile?.email ?? '?'} url={profile?.avatar_url} size={56} />
          <View
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: theme.primary,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: theme.card,
            }}
          >
            <Ionicons name="camera" size={11} color={theme.primaryText} />
          </View>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontWeight: '700', fontSize: 17 }}>
            {profile?.display_name ?? t('profile.noName')}
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 1 }}>{profile?.email}</Text>
        </View>
        <Pressable
          onPress={() => openForm('name')}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="pencil" size={16} color={theme.primary} />
        </Pressable>
      </Card>
      {avatarError ? (
        <Text style={{ color: theme.danger, fontSize: 12, marginBottom: 16 }}>{avatarError}</Text>
      ) : (
        <View style={{ marginBottom: 24 }} />
      )}

      <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textMuted, marginBottom: 10, letterSpacing: 0.5 }}>
        {t('profile.appearanceHeader')}
      </Text>
      <Card style={{ marginBottom: 24, padding: 8 }}>
        {THEME_OPTIONS.map((opt, idx) => (
          <Pressable
            key={opt.key}
            onPress={() => setPreference(opt.key)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 12,
              paddingHorizontal: 8,
              borderTopWidth: idx > 0 ? 1 : 0,
              borderTopColor: theme.border,
            }}
          >
            <Ionicons name={opt.icon} size={20} color={theme.text} />
            <Text style={{ flex: 1, color: theme.text, fontSize: 15 }}>{t(`profile.${opt.labelKey}`)}</Text>
            {preference === opt.key ? (
              <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
            ) : null}
          </Pressable>
        ))}
      </Card>

      <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textMuted, marginBottom: 10, letterSpacing: 0.5 }}>
        {t('profile.accentColorHeader')}
      </Text>
      <Card style={{ marginBottom: 8, padding: 16 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          {ACCENT_PRESETS.map((hex) => (
            <Pressable
              key={hex}
              onPress={() => handlePickPreset(hex)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: hex,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: accentColor === hex ? 3 : 0,
                borderColor: theme.text,
              }}
            >
              {accentColor === hex ? (
                <Ionicons name="checkmark" size={16} color={getContrastText(hex)} />
              ) : null}
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <Input
            value={accentHexInput}
            onChangeText={setAccentHexInput}
            placeholder={t('profile.accentColorPlaceholder')}
            autoCapitalize="characters"
            containerStyle={{ flex: 1, marginBottom: 0 }}
          />
          <Button label={t('profile.accentColorApply')} onPress={handleApplyHex} style={{ width: 110 }} />
        </View>
        {accentError ? <Text style={{ color: theme.danger, fontSize: 12, marginTop: 8 }}>{accentError}</Text> : null}
        {accentColor ? (
          <Pressable onPress={handleResetAccent} style={{ marginTop: 12 }}>
            <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: '600' }}>
              {t('profile.accentColorReset')}
            </Text>
          </Pressable>
        ) : null}
      </Card>
      <View style={{ marginBottom: 24 }} />

      <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textMuted, marginBottom: 10, letterSpacing: 0.5 }}>
        {t('profile.languageHeader')}
      </Text>
      <Card style={{ marginBottom: 24, padding: 8 }}>
        {LANGUAGE_OPTIONS.map((opt, idx) => (
          <Pressable
            key={opt.key}
            onPress={() => setLangPreference(opt.key)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 12,
              paddingHorizontal: 8,
              borderTopWidth: idx > 0 ? 1 : 0,
              borderTopColor: theme.border,
            }}
          >
            <Ionicons name={opt.icon} size={20} color={theme.text} />
            <Text style={{ flex: 1, color: theme.text, fontSize: 15 }}>{t(`profile.${opt.labelKey}`)}</Text>
            {langPreference === opt.key ? (
              <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
            ) : null}
          </Pressable>
        ))}
      </Card>

      <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textMuted, marginBottom: 10, letterSpacing: 0.5 }}>
        {t('profile.accountHeader')}
      </Text>
      <Card style={{ marginBottom: 24, padding: 8 }}>
        <SettingsRow icon="person-outline" label={t('profile.nameField')} value={profile?.display_name ?? undefined} onPress={() => openForm('name')} />
        <View style={{ height: 1, backgroundColor: theme.border }} />
        <SettingsRow icon="mail-outline" label={t('profile.emailField')} value={profile?.email} onPress={() => openForm('email')} />
        <View style={{ height: 1, backgroundColor: theme.border }} />
        <SettingsRow icon="lock-closed-outline" label={t('profile.passwordField')} value="••••••••" onPress={() => openForm('password')} />
      </Card>

      <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textMuted, marginBottom: 10, letterSpacing: 0.5 }}>
        {t('profile.notificationsHeader')}
      </Text>
      <Card style={{ marginBottom: 8, padding: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, paddingHorizontal: 8 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              backgroundColor: theme.inputBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="notifications-outline" size={18} color={theme.text} />
          </View>
          <Text style={{ flex: 1, color: theme.text, fontSize: 15, fontWeight: '600' }}>
            {t('profile.pushNotifications')}
          </Text>
          <Switch
            value={!!profile?.push_token}
            onValueChange={handleTogglePush}
            disabled={pushToggling}
            trackColor={{ false: theme.border, true: theme.primary }}
          />
        </View>
      </Card>
      {pushError ? (
        <Text style={{ color: theme.danger, fontSize: 12, marginBottom: 16 }}>{pushError}</Text>
      ) : (
        <View style={{ marginBottom: 24 }} />
      )}

      <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textMuted, marginBottom: 10, letterSpacing: 0.5 }}>
        {t('legal.header')}
      </Text>
      <Card style={{ marginBottom: 24, padding: 8 }}>
        <SettingsRow icon="document-text-outline" label={t('legal.terms')} onPress={() => navigation.navigate('Terms')} />
        <View style={{ height: 1, backgroundColor: theme.border }} />
        <SettingsRow icon="shield-checkmark-outline" label={t('legal.privacy')} onPress={() => navigation.navigate('Privacy')} />
      </Card>

      <Button label={t('profile.signOut')} variant="danger" onPress={signOut} />

      <Pressable onPress={() => navigation.navigate('DeleteAccount')} style={{ alignItems: 'center', paddingVertical: 16 }}>
        <Text style={{ color: theme.danger, fontSize: 13, fontWeight: '600' }}>{t('legal.deleteAccount')}</Text>
      </Pressable>
      </ScrollView>

      <BottomSheet visible={formMode !== 'none'} onClose={closeForm}>
        {formMode === 'name' && (
          <>
            <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text, marginBottom: 16 }}>{t('profile.changeName')}</Text>
            <Input value={name} onChangeText={setName} placeholder={t('profile.namePlaceholder')} autoFocus />
          </>
        )}
        {formMode === 'email' && (
          <>
            <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text, marginBottom: 16 }}>{t('profile.changeEmail')}</Text>
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder={t('profile.emailPlaceholder')}
              autoCapitalize="none"
              keyboardType="email-address"
              autoFocus
            />
            <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 8 }}>
              {t('profile.confirmEmailChangeInfo')}
            </Text>
          </>
        )}
        {formMode === 'password' && (
          <>
            <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text, marginBottom: 16 }}>{t('profile.changePassword')}</Text>
            <Input
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder={t('profile.currentPasswordPlaceholder')}
              secureTextEntry
              passwordToggle
              autoFocus
            />
            <Input
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t('profile.newPasswordPlaceholder')}
              secureTextEntry
              passwordToggle
            />
          </>
        )}

        {error ? <Text style={{ color: theme.danger, fontSize: 13, marginBottom: 8 }}>{error}</Text> : null}
        {info ? <Text style={{ color: theme.success, fontSize: 13, marginBottom: 8 }}>{info}</Text> : null}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
          <Button label={t('common.cancel')} variant="secondary" onPress={closeForm} style={{ flex: 1 }} />
          <Button
            label={t('common.save')}
            loading={submitting}
            onPress={
              formMode === 'name' ? handleSaveName : formMode === 'email' ? handleSaveEmail : handleSavePassword
            }
            style={{ flex: 1 }}
          />
        </View>
      </BottomSheet>
    </Screen>
  );
}
