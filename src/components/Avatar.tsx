import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

const COLORS = ['#7C5CFC', '#2FD4A5', '#FF6B6B', '#FFB020', '#4C9AFF', '#FF7EB6'];

function hashString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function Avatar({ name, size = 36, url }: { name: string; size?: number; url?: string | null }) {
  const { theme } = useTheme();
  const initial = name?.trim()?.[0]?.toUpperCase() ?? '?';
  const bg = COLORS[hashString(name ?? '') % COLORS.length];

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[
          styles.circle,
          { width: size, height: size, borderRadius: size / 2, borderColor: theme.bg },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          borderColor: theme.bg,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  text: { color: '#fff', fontWeight: '700' },
});
