import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeProvider';

export interface Segment {
  key: string;
  label: string;
}

export function SegmentedTabs({
  segments,
  activeKey,
  onChange,
}: {
  segments: Segment[];
  activeKey: string;
  onChange: (key: string) => void;
}) {
  const { theme } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    segments.findIndex((s) => s.key === activeKey)
  );
  const segWidth = width / segments.length;
  const translateX = useSharedValue(0);

  React.useEffect(() => {
    translateX.value = withSpring(index * segWidth, { damping: 20, stiffness: 220 });
  }, [index, segWidth]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: segWidth,
  }));

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View onLayout={onLayout} style={[styles.container, { backgroundColor: theme.inputBg }]}>
      {width > 0 ? (
        <Animated.View
          style={[
            styles.pill,
            pillStyle,
            { backgroundColor: theme.card, shadowColor: theme.shadow },
          ]}
        />
      ) : null}
      {segments.map((s) => {
        const focused = s.key === activeKey;
        return (
          <Pressable
            key={s.key}
            style={styles.segment}
            onPress={() => {
              if (s.key !== activeKey) Haptics.selectionAsync().catch(() => {});
              onChange(s.key);
            }}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={{
                color: focused ? theme.primary : theme.textMuted,
                fontWeight: '700',
                fontSize: segments.length > 4 ? 12 : 13,
              }}
            >
              {s.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    position: 'relative',
  },
  pill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: 8,
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
