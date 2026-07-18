import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeProvider';

export function SwipeableRow({
  children,
  onDelete,
}: {
  children: React.ReactNode;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <Swipeable
      overshootRight={false}
      rightThreshold={40}
      onSwipeableWillOpen={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})}
      renderRightActions={(_progress, dragX) => (
        <View style={styles.actionWrapper}>
          <View style={[styles.action, { backgroundColor: theme.danger }]}>
            <Ionicons name="trash" size={20} color="#fff" />
            <Text style={styles.actionLabel}>{t('common.delete')}</Text>
          </View>
        </View>
      )}
      onSwipeableOpen={onDelete}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  actionWrapper: {
    justifyContent: 'center',
    marginBottom: 8,
  },
  action: {
    width: 88,
    height: '100%',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
