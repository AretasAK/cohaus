import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { File } from 'expo-file-system';
import * as Linking from 'expo-linking';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from '../lib/supabase';
import { registerForPushNotifications } from '../lib/pushNotifications';
import i18n from '../i18n';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  push_token: string | null;
}

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  initializing: boolean;
  init: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  signUpWithPassword: (email: string, password: string, displayName: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<string | null>;
  refreshProfile: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<string | null>;
  updateEmail: (email: string) => Promise<string | null>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<string | null>;
  uploadAvatar: (localUri: string) => Promise<string | null>;
  setPushEnabled: (enabled: boolean) => Promise<string | null>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  initializing: true,

  init: async () => {
    const { data } = await supabase.auth.getSession();
    set({ session: data.session });
    if (data.session) await get().refreshProfile();
    set({ initializing: false });

    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session });
      if (session) {
        await get().refreshProfile();
      } else {
        set({ profile: null });
      }
    });

    const initialUrl = await Linking.getInitialURL();
    if (initialUrl) handleAuthDeepLink(initialUrl);
    Linking.addEventListener('url', ({ url }) => handleAuthDeepLink(url));
  },

  refreshProfile: async () => {
    const userId = get().session?.user.id;
    if (!userId) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) set({ profile: data as Profile });
  },

  signInWithPassword: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? mapAuthError(error.message) : null;
  },

  signInWithGoogle: async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const result = await GoogleSignin.signIn();
      if (result.type === 'cancelled') return null;
      const idToken = result.data.idToken;
      if (!idToken) return i18n.t('errors.googleTokenFailed');
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
      return error ? mapAuthError(error.message) : null;
    } catch {
      return i18n.t('errors.googleSignInFailed');
    }
  },

  signUpWithPassword: async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: Linking.createURL('auth/callback') },
    });
    if (error) return mapAuthError(error.message);
    if (data.user && displayName) {
      await supabase.from('profiles').update({ display_name: displayName }).eq('id', data.user.id);
    }
    return null;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },

  deleteAccount: async () => {
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
    if (error) return i18n.t('errors.deleteAccountFailed');
    await supabase.auth.signOut();
    set({ session: null, profile: null });
    return null;
  },

  updateDisplayName: async (name: string) => {
    const userId = get().session?.user.id;
    if (!userId) return i18n.t('errors.notSignedIn');
    const { error } = await supabase.from('profiles').update({ display_name: name }).eq('id', userId);
    if (error) return i18n.t('errors.updateNameFailed');
    await get().refreshProfile();
    return null;
  },

  updateEmail: async (email: string) => {
    const { error } = await supabase.auth.updateUser({ email });
    return error ? mapAuthError(error.message) : null;
  },

  updatePassword: async (currentPassword: string, newPassword: string) => {
    const email = get().session?.user.email;
    if (!email) return i18n.t('errors.notSignedIn');

    const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (reauthError) return i18n.t('errors.currentPasswordWrong');

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return error ? mapAuthError(error.message) : null;
  },

  uploadAvatar: async (localUri: string) => {
    const userId = get().session?.user.id;
    if (!userId) return i18n.t('errors.notSignedIn');

    try {
      const arrayBuffer = await new File(localUri).arrayBuffer();
      const path = `${userId}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) return i18n.t('errors.uploadPhotoFailed');

      const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(path);
      const cacheBusted = `${publicUrl.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: cacheBusted })
        .eq('id', userId);
      if (updateError) return i18n.t('errors.saveProfilePhotoFailed');

      await get().refreshProfile();
      return null;
    } catch {
      return i18n.t('errors.processPhotoFailed');
    }
  },

  setPushEnabled: async (enabled: boolean) => {
    const userId = get().session?.user.id;
    if (!userId) return i18n.t('errors.notSignedIn');

    if (!enabled) {
      const { error } = await supabase.from('profiles').update({ push_token: null }).eq('id', userId);
      if (error) return i18n.t('errors.updateNameFailed');
      await get().refreshProfile();
      return null;
    }

    await registerForPushNotifications(userId);
    await get().refreshProfile();
    return get().profile?.push_token ? null : i18n.t('errors.pushRegistrationFailed');
  },
}));

async function handleAuthDeepLink(url: string) {
  if (!url.includes('auth/callback')) return;
  const parsed = Linking.parse(url);
  const params = { ...parsed.queryParams };
  const hashPart = url.split('#')[1];
  if (hashPart) {
    new URLSearchParams(hashPart).forEach((value, key) => {
      params[key] = value;
    });
  }

  if (params.access_token && params.refresh_token) {
    await supabase.auth.setSession({
      access_token: String(params.access_token),
      refresh_token: String(params.refresh_token),
    });
  } else if (params.code) {
    await supabase.auth.exchangeCodeForSession(String(params.code));
  } else if (params.token_hash && params.type) {
    await supabase.auth.verifyOtp({ token_hash: String(params.token_hash), type: params.type as any });
  }
}

function mapAuthError(message: string) {
  if (message.includes('Invalid login credentials')) return i18n.t('errors.invalidCredentials');
  if (message.includes('User already registered')) return i18n.t('errors.userAlreadyRegistered');
  if (message.includes('Password should be')) return i18n.t('errors.passwordTooShort');
  if (message.includes('should be different')) return i18n.t('errors.passwordMustDiffer');
  if (message.includes('A user with this email')) return i18n.t('errors.emailAlreadyInUse');
  return message;
}
