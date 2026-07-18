import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { EmptyState } from '../../components/EmptyState';
import { BottomSheet } from '../../components/BottomSheet';
import { useTheme } from '../../theme/ThemeProvider';
import { useGroupStore } from '../../store/groupStore';
import { useNotificationStore } from '../../store/notificationStore';

type SheetMode = 'none' | 'picker' | 'create' | 'join';

export function GroupsScreen({ navigation, selectedGroupId, onSelectGroup }: any) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { groups, loading, fetchGroups, createGroup, joinByToken } = useGroupStore();
  const unreadCount = useNotificationStore((s) => s.notifications.filter((n) => !n.read_at).length);

  const [sheetMode, setSheetMode] = useState<SheetMode>('none');
  const [inputValue, setInputValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const closeSheet = () => {
    setSheetMode('none');
    setInputValue('');
    setFormError(null);
  };

  const openForm = (mode: 'create' | 'join') => {
    setFormError(null);
    setInputValue('');
    setSheetMode(mode);
  };

  const handleCreate = async () => {
    if (!inputValue.trim()) {
      setFormError(t('groups.errorName'));
      return;
    }
    setSubmitting(true);
    const group = await createGroup(inputValue.trim());
    setSubmitting(false);
    if (group) {
      closeSheet();
      if (onSelectGroup) onSelectGroup(group.id);
      else navigation.navigate('GroupWorkspace', { groupId: group.id });
    } else {
      setFormError(t('groups.errorCreateFailed'));
    }
  };

  const handleJoin = async () => {
    if (!inputValue.trim()) {
      setFormError(t('groups.errorCode'));
      return;
    }
    setSubmitting(true);
    const err = await joinByToken(inputValue.trim());
    setSubmitting(false);
    if (!err) closeSheet();
    else setFormError(err);
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 16 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: theme.text, letterSpacing: -0.5 }}>{t('groups.title')}</Text>
          <Text style={{ fontSize: 13, color: theme.textMuted, marginTop: 2 }}>
            {t('groups.subtitle')}
          </Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate('Notifications')}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.inputBg, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="notifications-outline" size={20} color={theme.text} />
          {unreadCount > 0 ? (
            <View
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: theme.danger,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 3,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchGroups} tintColor={theme.primary} />}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="people-outline"
              title={t('groups.emptyTitle')}
              subtitle={t('groups.emptySubtitle')}
            />
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 100, gap: 12 }}
        renderItem={({ item }) => {
          const selected = item.id === selectedGroupId;
          return (
            <Pressable
              onPress={() => (onSelectGroup ? onSelectGroup(item.id) : navigation.navigate('GroupWorkspace', { groupId: item.id }))}
            >
              <Card style={selected ? { backgroundColor: theme.primarySoft, borderColor: theme.primary } : undefined}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: theme.primary,
                    }}
                  >
                    <Ionicons name="home" size={22} color={theme.primaryText} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text }}>{item.name}</Text>
                    <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 3 }}>
                      {t('groups.cardSubtitle')}
                    </Text>
                  </View>
                  {onSelectGroup ? null : <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />}
                </View>
              </Card>
            </Pressable>
          );
        }}
      />

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          setSheetMode('picker');
        }}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          backgroundColor: theme.primary,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          height: 52,
          paddingHorizontal: 22,
          borderRadius: 14,
          shadowColor: theme.primary,
          shadowOpacity: 0.3,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        }}
      >
        <Ionicons name="add" size={22} color={theme.primaryText} />
        <Text style={{ color: theme.primaryText, fontWeight: '700', fontSize: 15 }}>{t('groups.newGroup')}</Text>
      </Pressable>

      <BottomSheet visible={sheetMode !== 'none'} onClose={closeSheet}>
        {sheetMode === 'picker' ? (
          <>
            <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text, marginBottom: 16 }}>{t('groups.addGroupSheetTitle')}</Text>
            <Pressable
              onPress={() => openForm('create')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                backgroundColor: theme.inputBg,
                borderRadius: 16,
                padding: 16,
                marginBottom: 10,
              }}
            >
              <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="home" size={20} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: '700', fontSize: 15 }}>{t('groups.createNew')}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 1 }}>{t('groups.createNewSubtitle')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </Pressable>
            <Pressable
              onPress={() => openForm('join')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                backgroundColor: theme.inputBg,
                borderRadius: 16,
                padding: 16,
                marginBottom: 8,
              }}
            >
              <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="key" size={20} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: '700', fontSize: 15 }}>{t('groups.joinCode')}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 1 }}>{t('groups.joinCodeSubtitle')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </Pressable>
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Pressable
                onPress={() => setSheetMode('picker')}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.inputBg, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="chevron-back" size={18} color={theme.text} />
              </Pressable>
              <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text }}>
                {sheetMode === 'create' ? t('groups.newGroup') : t('groups.joinTitle')}
              </Text>
            </View>
            <Input
              placeholder={sheetMode === 'create' ? t('groups.namePlaceholder') : t('groups.codePlaceholder')}
              value={inputValue}
              onChangeText={setInputValue}
              autoCapitalize="none"
              autoFocus
            />
            {formError ? (
              <Text style={{ color: theme.danger, fontSize: 13, marginBottom: 8 }}>{formError}</Text>
            ) : null}
            <Button
              label={sheetMode === 'create' ? t('groups.createButton') : t('groups.joinButton')}
              onPress={sheetMode === 'create' ? handleCreate : handleJoin}
              loading={submitting}
            />
          </>
        )}
      </BottomSheet>
    </Screen>
  );
}
