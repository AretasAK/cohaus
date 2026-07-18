import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import i18n, { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, SupportedLanguage } from './index';

export type LanguagePreference = 'system' | SupportedLanguage;

const STORAGE_KEY = 'cohaus.language_preference';

function resolveSystemLanguage(): SupportedLanguage {
  const code = Localization.getLocales()[0]?.languageCode;
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(code ?? '') ? (code as SupportedLanguage) : DEFAULT_LANGUAGE;
}

interface LanguageContextValue {
  preference: LanguagePreference;
  language: SupportedLanguage;
  setPreference: (pref: LanguagePreference) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<LanguagePreference>('system');
  const [language, setLanguage] = useState<SupportedLanguage>(resolveSystemLanguage());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'system' || stored === 'es' || stored === 'en') {
        setPreferenceState(stored);
      }
    });
  }, []);

  useEffect(() => {
    const resolved = preference === 'system' ? resolveSystemLanguage() : preference;
    setLanguage(resolved);
    i18n.changeLanguage(resolved);

    const userId = useAuthStore.getState().session?.user.id;
    if (userId) {
      supabase.from('profiles').update({ language: resolved }).eq('id', userId).then(() => {});
    }
  }, [preference]);

  const setPreference = (pref: LanguagePreference) => {
    setPreferenceState(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref);
  };

  return (
    <LanguageContext.Provider value={{ preference, language, setPreference }}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage debe usarse dentro de LanguageProvider');
  return ctx;
}
