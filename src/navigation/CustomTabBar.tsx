import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeProvider';

const ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Lista: { active: 'cart', inactive: 'cart-outline' },
  Gastos: { active: 'cash', inactive: 'cash-outline' },
  Grupos: { active: 'people', inactive: 'people-outline' },
  Perfil: { active: 'person-circle', inactive: 'person-circle-outline' },
};

function TabItem({
  isFocused,
  icon,
  label,
  onPress,
}: {
  isFocused: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  const highlightStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isFocused ? 1 : 0, { duration: 160 }),
  }));

  return (
    <Pressable onPress={onPress} style={styles.tab} hitSlop={6}>
      <Animated.View
        style={[
          styles.highlight,
          highlightStyle,
          { backgroundColor: theme.primarySoft },
        ]}
      />
      <Ionicons name={icon} size={20} color={isFocused ? theme.primary : theme.textMuted} />
      <Text numberOfLines={1} style={[styles.label, { color: isFocused ? theme.primary : theme.textMuted }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingBottom: Math.max(insets.bottom, 12),
          backgroundColor: theme.tabBar,
          borderTopColor: theme.border,
          shadowColor: theme.shadow,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const icons = ICONS[route.name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };
        const label = (options.title ?? route.name) as string;

        const onPress = () => {
          if (!isFocused) Haptics.selectionAsync().catch(() => {});
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TabItem
            key={route.key}
            isFocused={isFocused}
            icon={isFocused ? icons.active : icons.inactive}
            label={label}
            onPress={onPress}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 12,
    ...Platform.select({
      ios: { shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: -4 } },
      android: { elevation: 12 },
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 12,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
  },
});
