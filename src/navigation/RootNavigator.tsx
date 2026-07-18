import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { useAuthStore } from '../store/authStore';
import { useGroupStore } from '../store/groupStore';
import { useNotificationStore } from '../store/notificationStore';
import { registerForPushNotifications } from '../lib/pushNotifications';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';

export function RootNavigator() {
  const { theme } = useTheme();
  const session = useAuthStore((s) => s.session);
  const initializing = useAuthStore((s) => s.initializing);
  const init = useAuthStore((s) => s.init);
  const fetchGroups = useGroupStore((s) => s.fetchGroups);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (!session) return;
    fetchGroups();
    registerForPushNotifications(session.user.id).catch(() => {});
    useNotificationStore.getState().fetchNotifications(session.user.id);
    useNotificationStore.getState().subscribeRealtime(session.user.id);
    return () => useNotificationStore.getState().unsubscribe();
  }, [session]);

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const navTheme = {
    ...(theme.mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.bg,
      card: theme.bgElevated,
      text: theme.text,
      border: theme.border,
      primary: theme.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      {session ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
