import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Avatar } from '../../components/Avatar';
import { BottomSheet } from '../../components/BottomSheet';
import { GroupIcon } from '../../components/GroupIcon';
import { useTheme } from '../../theme/ThemeProvider';
import { useGroupStore } from '../../store/groupStore';
import { useAuthStore } from '../../store/authStore';

const ICON_OPTIONS: (keyof typeof Ionicons.glyphMap)[] = [
  'home',
  'people',
  'restaurant',
  'bed',
  'cafe',
  'gift',
  'star',
  'heart',
  'paw',
  'bicycle',
  'car',
  'airplane',
  'book',
  'musical-notes',
  'game-controller',
  'football',
  'leaf',
  'sunny',
  'moon',
  'business',
  'school',
  'beer',
  'pizza',
];

export function GroupInfoSection({ groupId, navigation }: { groupId: string; navigation: any }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const {
    groups,
    members,
    fetchMembers,
    createInvite,
    leaveGroup,
    updateGroupCover,
    updateGroupDescription,
    updateGroupIcon,
  } = useGroupStore();
  const currentUserId = useAuthStore((s) => s.session?.user.id);
  const [invLoading, setInvLoading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [savingDesc, setSavingDesc] = useState(false);
  const [descError, setDescError] = useState<string | null>(null);

  const group = groups.find((g) => g.id === groupId);
  const groupMembers = members[groupId] ?? [];

  useEffect(() => {
    fetchMembers(groupId);
  }, [groupId]);

  const handlePickPhoto = async () => {
    setCoverPickerOpen(false);
    setCoverError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setCoverError(t('profile.errorPhotoPermission'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      allowsEditing: true,
      aspect: [16, 9],
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingCover(true);
    const err = await updateGroupCover(groupId, result.assets[0].uri);
    setUploadingCover(false);
    if (err) setCoverError(err);
  };

  const handlePickIcon = async (icon: string) => {
    setCoverError(null);
    setIconPickerOpen(false);
    const err = await updateGroupIcon(groupId, icon);
    if (err) setCoverError(err);
  };

  const openDescEditor = () => {
    setDescDraft(group?.description ?? '');
    setDescError(null);
    setDescOpen(true);
  };

  const handleSaveDescription = async () => {
    setSavingDesc(true);
    const err = await updateGroupDescription(groupId, descDraft);
    setSavingDesc(false);
    if (err) setDescError(err);
    else setDescOpen(false);
  };

  const handleInvite = async () => {
    setInvLoading(true);
    const token = await createInvite(groupId);
    setInvLoading(false);
    if (token) {
      Share.share({
        message: t('groupInfo.shareMessage', { name: group?.name, token }),
      });
    } else {
      Alert.alert('Error', t('groupInfo.errorInviteFailed'));
    }
  };

  const handleLeave = () => {
    Alert.alert(t('groupInfo.confirmLeaveTitle'), t('groupInfo.confirmLeaveMessage', { name: group?.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('groupInfo.leave'),
        style: 'destructive',
        onPress: async () => {
          await leaveGroup(groupId);
          navigation.popToTop();
        },
      },
    ]);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
      <Pressable onPress={() => setCoverPickerOpen(true)} disabled={uploadingCover} style={{ marginBottom: 12 }}>
        <View
          style={{
            height: 140,
            borderRadius: 14,
            backgroundColor: theme.inputBg,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {group?.cover_url ? (
            <Image source={{ uri: group.cover_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : group?.icon ? (
            <GroupIcon coverUrl={null} icon={group.icon} size={72} />
          ) : (
            <Ionicons name="image-outline" size={28} color={theme.textMuted} />
          )}
        </View>
        <View
          style={{
            position: 'absolute',
            bottom: 10,
            right: 10,
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: theme.card,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Ionicons name="camera" size={16} color={theme.text} />
        </View>
      </Pressable>
      {coverError ? <Text style={{ color: theme.danger, fontSize: 12, marginBottom: 12 }}>{coverError}</Text> : null}

      <Pressable onPress={openDescEditor} style={{ marginBottom: 16 }}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 3 }}>
              {t('groupInfo.descriptionHeader')}
            </Text>
            <Text style={{ color: group?.description ? theme.text : theme.textMuted, fontSize: 14 }} numberOfLines={3}>
              {group?.description || t('groupInfo.descriptionPlaceholder')}
            </Text>
          </View>
          <Ionicons name="pencil" size={16} color={theme.textMuted} />
        </Card>
      </Pressable>

      <Text style={{ fontSize: 13, color: theme.textMuted, marginBottom: 12 }}>
        {t('groupInfo.memberCount', { count: groupMembers.length })}
      </Text>

      <Button label={t('groupInfo.invite')} onPress={handleInvite} loading={invLoading} />

      <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textMuted, marginTop: 24, marginBottom: 10, letterSpacing: 0.5 }}>
        {t('groupInfo.membersHeader')}
      </Text>
      <View style={{ gap: 8 }}>
        {groupMembers.map((item) => (
          <Card key={item.user_id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar name={item.display_name ?? item.email} url={item.avatar_url} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: '600' }}>
                {item.display_name ?? item.email}
                {item.user_id === currentUserId ? t('groupInfo.you') : ''}
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                {item.role === 'admin' ? t('groupInfo.roleAdmin') : t('groupInfo.roleMember')} · {t('groupInfo.weightLabel', { weight: item.share_weight })}
              </Text>
            </View>
          </Card>
        ))}
      </View>

      <View style={{ marginTop: 32 }}>
        <Button label={t('groupInfo.leaveGroup')} variant="danger" onPress={handleLeave} />
      </View>

      <BottomSheet visible={coverPickerOpen} onClose={() => setCoverPickerOpen(false)}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 16 }}>
          {t('groupInfo.coverPickerTitle')}
        </Text>
        <Pressable
          onPress={handlePickPhoto}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.inputBg, borderRadius: 14, padding: 16, marginBottom: 10 }}
        >
          <Ionicons name="image-outline" size={20} color={theme.text} />
          <Text style={{ color: theme.text, fontWeight: '600', fontSize: 15 }}>{t('groupInfo.pickPhoto')}</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setCoverPickerOpen(false);
            setIconPickerOpen(true);
          }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.inputBg, borderRadius: 14, padding: 16 }}
        >
          <Ionicons name="shapes-outline" size={20} color={theme.text} />
          <Text style={{ color: theme.text, fontWeight: '600', fontSize: 15 }}>{t('groupInfo.pickIcon')}</Text>
        </Pressable>
      </BottomSheet>

      <BottomSheet visible={iconPickerOpen} onClose={() => setIconPickerOpen(false)}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 16 }}>
          {t('groupInfo.pickIcon')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {ICON_OPTIONS.map((iconName) => (
            <Pressable
              key={iconName}
              onPress={() => handlePickIcon(iconName)}
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: group?.icon === iconName ? theme.primary : theme.inputBg,
              }}
            >
              <Ionicons name={iconName} size={22} color={group?.icon === iconName ? theme.primaryText : theme.text} />
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      <BottomSheet visible={descOpen} onClose={() => setDescOpen(false)}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text, marginBottom: 16 }}>
          {t('groupInfo.descriptionHeader')}
        </Text>
        <Input
          value={descDraft}
          onChangeText={setDescDraft}
          placeholder={t('groupInfo.descriptionPlaceholder')}
          multiline
          numberOfLines={4}
          style={{ height: 100, textAlignVertical: 'top', paddingTop: 14 }}
          autoFocus
        />
        {descError ? <Text style={{ color: theme.danger, fontSize: 13, marginBottom: 8 }}>{descError}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button label={t('common.cancel')} variant="secondary" onPress={() => setDescOpen(false)} style={{ flex: 1 }} />
          <Button label={t('common.save')} onPress={handleSaveDescription} loading={savingDesc} style={{ flex: 1 }} />
        </View>
      </BottomSheet>
    </ScrollView>
  );
}
