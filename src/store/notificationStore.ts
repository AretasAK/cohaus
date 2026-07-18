import { create } from 'zustand';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { sendPushNotification } from '../lib/pushNotifications';
import i18n, { DEFAULT_LANGUAGE, SupportedLanguage } from '../i18n';

export interface AppNotification {
  id: string;
  group_id: string;
  recipient_id: string;
  actor_id: string | null;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

function renderNotification(lang: SupportedLanguage, type: string, data: Record<string, unknown>) {
  const tFixed = i18n.getFixedT(lang);
  const title = tFixed(`notifications.types.${type}Title`, data);
  let body: string;
  if (type === 'receipt_scanned') {
    body = data.amount
      ? tFixed('notifications.types.receipt_scannedBodyWithAmount', data)
      : tFixed('notifications.types.receipt_scannedBodyNoAmount');
  } else {
    body = tFixed(`notifications.types.${type}Body`, data);
  }
  return { title, body };
}

interface NotificationState {
  notifications: AppNotification[];
  channel: RealtimeChannel | null;
  fetchNotifications: (userId: string) => Promise<void>;
  subscribeRealtime: (userId: string) => void;
  unsubscribe: () => void;
  markAllRead: (userId: string) => Promise<void>;
  notifyGroup: (params: {
    groupId: string;
    actorId: string;
    type: string;
    data: Record<string, unknown>;
  }) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  channel: null,

  fetchNotifications: async (userId: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) set({ notifications: data as AppNotification[] });
  },

  subscribeRealtime: (userId: string) => {
    get().unsubscribe();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
        () => get().fetchNotifications(userId)
      )
      .subscribe();
    set({ channel });
  },

  unsubscribe: () => {
    const ch = get().channel;
    if (ch) supabase.removeChannel(ch);
    set({ channel: null });
  },

  markAllRead: async (userId: string) => {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('recipient_id', userId).is('read_at', null);
    await get().fetchNotifications(userId);
  },

  notifyGroup: async ({ groupId, actorId, type, data }) => {
    const { data: memberRows } = await supabase
      .from('group_members')
      .select('user_id, profiles(push_token, language)')
      .eq('group_id', groupId)
      .neq('user_id', actorId);

    const recipients = memberRows ?? [];
    if (recipients.length === 0) return;

    const fallback = renderNotification(DEFAULT_LANGUAGE, type, data);

    await supabase.from('notifications').insert(
      recipients.map((m: any) => ({
        group_id: groupId,
        recipient_id: m.user_id,
        actor_id: actorId,
        type,
        title: fallback.title,
        body: fallback.body,
        data,
      }))
    );

    const byLanguage = new Map<SupportedLanguage, string[]>();
    for (const m of recipients as any[]) {
      const token = m.profiles?.push_token;
      if (!token) continue;
      const lang: SupportedLanguage = m.profiles?.language === 'en' ? 'en' : 'es';
      byLanguage.set(lang, [...(byLanguage.get(lang) ?? []), token]);
    }

    for (const [lang, tokens] of byLanguage) {
      const rendered = renderNotification(lang, type, data);
      sendPushNotification(tokens, rendered.title, rendered.body, data).catch(() => {});
    }
  },
}));
