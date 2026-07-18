import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Avatar } from '../../components/Avatar';
import { EmptyState } from '../../components/EmptyState';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuthStore } from '../../store/authStore';
import { Balance, Transfer, useExpenseStore } from '../../store/expenseStore';
import { useNotificationStore } from '../../store/notificationStore';

export function BalancesScreen({ route, navigation }: any) {
  const { groupId } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const userId = useAuthStore((s) => s.session?.user.id);
  const displayName = useAuthStore((s) => s.profile?.display_name ?? s.profile?.email ?? t('common.someone'));
  const computeBalances = useExpenseStore((s) => s.computeBalances);
  const settleTransfer = useExpenseStore((s) => s.settleTransfer);
  const notifyGroup = useNotificationStore((s) => s.notifyGroup);

  const [balances, setBalances] = useState<Balance[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [settlingIdx, setSettlingIdx] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    computeBalances(groupId).then(({ balances, transfers }) => {
      setBalances(balances);
      setTransfers(transfers);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, [groupId]);

  const handleSettle = (transfer: Transfer, key: string) => {
    Alert.alert(
      t('balances.confirmSettleTitle'),
      t('balances.confirmSettleMessage', { from: transfer.fromName, to: transfer.toName, amount: transfer.amount.toFixed(2) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            setSettlingIdx(key);
            await settleTransfer(groupId, transfer.from, transfer.to, transfer.amount);
            if (userId) {
              notifyGroup({
                groupId,
                actorId: userId,
                type: 'settlement',
                data: { actorName: displayName, fromName: transfer.fromName, toName: transfer.toName, amount: transfer.amount.toFixed(2) },
              }).catch(() => {});
            }
            setSettlingIdx(null);
            load();
          },
        },
      ]
    );
  };

  const myNet = balances.find((b) => b.user_id === userId)?.net ?? 0;
  const myOut = transfers.filter((t) => t.from === userId);
  const myIn = transfers.filter((t) => t.to === userId);
  const otherTransfers = transfers.filter((t) => t.from !== userId && t.to !== userId);

  const isOwed = myNet > 0.005;
  const isOwing = myNet < -0.005;
  const heroLabel = isOwed ? t('balances.heroOwed') : isOwing ? t('balances.heroOwing') : t('balances.heroEven');
  const heroColor = isOwed ? theme.success : isOwing ? theme.danger : theme.primary;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8, paddingBottom: 16 }}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: theme.inputBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </Pressable>
        <Text style={{ fontSize: 24, fontWeight: '800', color: theme.text, letterSpacing: -0.4 }}>{t('balances.title')}</Text>
      </View>

      {isOwed || isOwing ? (
        <View style={{ borderRadius: 14, padding: 20, marginBottom: 24, backgroundColor: heroColor }}>
          <Text style={{ color: theme.primaryText, opacity: 0.75, fontSize: 13, fontWeight: '600' }}>{heroLabel}</Text>
          <Text style={{ color: theme.primaryText, fontSize: 34, fontWeight: '800', marginTop: 4 }}>
            {myNet > 0 ? '+' : ''}
            {myNet.toFixed(2)} €
          </Text>
        </View>
      ) : (
        <View
          style={{
            borderRadius: 14,
            padding: 20,
            marginBottom: 24,
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: '600' }}>{heroLabel}</Text>
          <Text style={{ color: theme.text, fontSize: 34, fontWeight: '800', marginTop: 4 }}>0.00 €</Text>
        </View>
      )}

      {myOut.length + myIn.length > 0 ? (
        <>
          <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textMuted, marginBottom: 10, letterSpacing: 0.5 }}>
            {t('balances.youOweHeader')}
          </Text>
          <View style={{ gap: 8, marginBottom: 24 }}>
            {myOut.map((transfer, idx) => {
              const key = `out-${idx}`;
              return (
                <Card key={key} style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Avatar name={transfer.toName} url={transfer.toAvatar} size={42} />
                    <Text style={{ flex: 1, color: theme.text, fontSize: 15 }}>
                      {t('balances.owePrefix')} <Text style={{ fontWeight: '800', color: theme.danger }}>{transfer.amount.toFixed(2)} €</Text> {t('balances.oweConnector')}{' '}
                      <Text style={{ fontWeight: '700' }}>{transfer.toName}</Text>
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleSettle(transfer, key)}
                    disabled={settlingIdx === key}
                    style={{
                      alignSelf: 'flex-start',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 12,
                      backgroundColor: theme.successSoft,
                      opacity: settlingIdx === key ? 0.6 : 1,
                    }}
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color={theme.success} />
                    <Text style={{ color: theme.success, fontWeight: '700', fontSize: 13 }}>{t('balances.markAsPaid')}</Text>
                  </Pressable>
                </Card>
              );
            })}
            {myIn.map((transfer, idx) => {
              const key = `in-${idx}`;
              return (
                <Card key={key} style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Avatar name={transfer.fromName} url={transfer.fromAvatar} size={42} />
                    <Text style={{ flex: 1, color: theme.text, fontSize: 15 }}>
                      <Text style={{ fontWeight: '700' }}>{transfer.fromName}</Text> {t('balances.owesYouSuffix')}{' '}
                      <Text style={{ fontWeight: '800', color: theme.success }}>{transfer.amount.toFixed(2)} €</Text>
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleSettle(transfer, key)}
                    disabled={settlingIdx === key}
                    style={{
                      alignSelf: 'flex-start',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 12,
                      backgroundColor: theme.successSoft,
                      opacity: settlingIdx === key ? 0.6 : 1,
                    }}
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color={theme.success} />
                    <Text style={{ color: theme.success, fontWeight: '700', fontSize: 13 }}>{t('balances.markAsPaid')}</Text>
                  </Pressable>
                </Card>
              );
            })}
          </View>
        </>
      ) : null}

      {otherTransfers.length > 0 ? (
        <>
          <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textMuted, marginBottom: 10, letterSpacing: 0.5 }}>
            {t('balances.restOfGroupHeader')}
          </Text>
          <View style={{ gap: 8, marginBottom: 24 }}>
            {otherTransfers.map((transfer, idx) => (
              <Card key={`other-${idx}`} flat style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Avatar name={transfer.fromName} url={transfer.fromAvatar} size={30} />
                <Ionicons name="arrow-forward" size={14} color={theme.textMuted} />
                <Avatar name={transfer.toName} url={transfer.toAvatar} size={30} />
                <Text style={{ flex: 1, color: theme.textMuted, fontSize: 13, marginLeft: 2 }} numberOfLines={1}>
                  <Text style={{ fontWeight: '700', color: theme.text }}>{transfer.fromName}</Text> → {transfer.toName}
                </Text>
                <View
                  style={{
                    backgroundColor: theme.accentSoft,
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  }}
                >
                  <Text style={{ color: theme.accent, fontWeight: '800', fontSize: 13 }}>{transfer.amount.toFixed(2)} €</Text>
                </View>
              </Card>
            ))}
          </View>
        </>
      ) : null}

      {!loading && transfers.length === 0 ? (
        <EmptyState icon="checkmark-done-outline" title={t('balances.allSettledTitle')} subtitle={t('balances.allSettledSubtitle')} />
      ) : null}
    </Screen>
  );
}
