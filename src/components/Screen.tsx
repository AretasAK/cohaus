import React from 'react';
import { StyleSheet, useWindowDimensions, View, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';

const MAX_CONTENT_WIDTH = 720;

export function Screen({ style, children, ...props }: ViewProps) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width > MAX_CONTENT_WIDTH;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={isWide ? styles.wideOuter : styles.flexFull}>
        <View style={[styles.content, isWide && styles.wideContent, style]} {...props}>
          {children}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flexFull: { flex: 1 },
  wideOuter: { flex: 1, alignItems: 'center' },
  content: { flex: 1, paddingHorizontal: 20 },
  wideContent: { width: '100%', maxWidth: MAX_CONTENT_WIDTH },
});
