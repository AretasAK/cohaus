import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTheme, lightTheme, Theme } from './colors';
import { getContrastText, isValidHexColor, withAlpha } from './contrast';

type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  accentColor: string | null;
  setAccentColor: (color: string | null) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = 'cohaus.theme_preference';
const ACCENT_STORAGE_KEY = 'cohaus.accent_color';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [accentColor, setAccentColorState] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === 'light' || value === 'dark' || value === 'system') {
        setPreferenceState(value);
      }
    });
    AsyncStorage.getItem(ACCENT_STORAGE_KEY).then((value) => {
      if (value && isValidHexColor(value)) setAccentColorState(value);
    });
  }, []);

  const setPreference = (pref: ThemePreference) => {
    setPreferenceState(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref);
  };

  const setAccentColor = (color: string | null) => {
    setAccentColorState(color);
    if (color) AsyncStorage.setItem(ACCENT_STORAGE_KEY, color);
    else AsyncStorage.removeItem(ACCENT_STORAGE_KEY);
  };

  const resolvedMode = preference === 'system' ? systemScheme ?? 'light' : preference;
  const baseTheme = resolvedMode === 'dark' ? darkTheme : lightTheme;

  const theme = useMemo<Theme>(() => {
    if (!accentColor) return baseTheme;
    const textColor = getContrastText(accentColor);
    return {
      ...baseTheme,
      primary: accentColor,
      primaryGradient: [accentColor, accentColor] as const,
      primarySoft: withAlpha(accentColor, '26'),
      primaryText: textColor,
      shadow: withAlpha(accentColor, '40'),
    };
  }, [baseTheme, accentColor]);

  const value = useMemo(
    () => ({ theme, preference, setPreference, accentColor, setAccentColor }),
    [theme, preference, accentColor]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return ctx;
}
