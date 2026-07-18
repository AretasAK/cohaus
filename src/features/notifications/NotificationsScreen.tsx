import React, { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuthStore } from '../../store/authStore';
import { AppNotification, useNotificationStore } from '../../store/notificationStore';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  expense_added: 'cash-outline',
  task_done: 'checkmark-done-outline',
  list_closed: 'cart-outline',
  receipt_scanned: 'receipt-outline',
  settlement: 'checkmark-circle-outline',
};

function useTimeAgo() {
  const { t } = useTranslation();
  return (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return t('notifications.timeNow');
    if (mins < 60) return t('notifications.timeMinutes', { count: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t('notifications.timeHours', { count: hours });
    return t('notifications.timeDays', { count: Math.floor(hours / 24) });
  };
}

function renderNotificationText(t: (key: string, opts?: Record<string, unknown>) => string, n: AppNotification) {
  const title = t(`notifications.types.${n.type}Title`, n.data);
  let body: string;
  if (n.type === 'receipt_scanned') {
    body = n.data?.amount
      ? t('notifications.types.receipt_scannedBodyWithAmount', n.data)
      : t('notifications.types.receipt_scannedBodyNoAmount');
  } else {
    body = t(`notifications.types.${n.type}Body`, n.data);
  }
  return { title, body };
}

export function NotificationsScreen({ navigation }: any) {
  const { t } = useTranslation();
  const timeAgo = useTimeAgo();
  const { theme } = useTheme();
  const userId = useAuthStore((s) => s.session?.user.id);
  const { notifications, fetchNotifications, markAllRead } = useNotificationStore();

  useEffect(() => {
    if (userId) {
      fetchNotifications(userId);
      markAllRead(userId);
    }
  }, [userId]);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8, paddingBottom: 16 }}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: theme.inputBg, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </Pressable>
        <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text }}>{t('notifications.title')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 24 }}>
        {notifications.length === 0 ? (
          <EmptyState icon="notifications-outline" title={t('notifications.emptyTitle')} subtitle={t('notifications.emptySubtitle')} />
        ) : (
          notifications.map((n) => {
            const { title, body } = renderNotificationText(t, n);
            return (
              <Card key={n.id} flat={!!n.read_at} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: theme.primarySoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={ICONS[n.type] ?? 'notifications-outline'} size={18} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }}>{title}</Text>
                  {body ? (
                    <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 2 }}>{body}</Text>
                  ) : null}
                  <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 4 }}>{timeAgo(n.created_at)}</Text>
                </View>
                {!n.read_at ? (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary, marginTop: 4 }} />
                ) : null}
              </Card>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}
