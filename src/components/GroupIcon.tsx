import React from 'react';
import { Image, StyleProp, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

export function GroupIcon({
  coverUrl,
  icon,
  size = 46,
  style,
}: {
  coverUrl?: string | null;
  icon?: string | null;
  size?: number;
  style?: StyleProp<any>;
}) {
  const { theme } = useTheme();
  const borderRadius = size >= 40 ? 12 : 10;

  if (coverUrl) {
    return (
      <Image
        source={{ uri: coverUrl }}
        style={[{ width: size, height: size, borderRadius, backgroundColor: theme.inputBg }, style]}
      />
    );
  }

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.primary,
        },
        style,
      ]}
    >
      <Ionicons name={(icon as any) ?? 'home'} size={Math.round(size * 0.48)} color={theme.primaryText} />
    </View>
  );
}
