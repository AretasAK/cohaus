import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';

export interface GroupMember {
  user_id: string;
  role: 'admin' | 'member';
  share_weight: number;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  icon: string | null;
  enabled_modules: Record<string, boolean>;
  created_by: string | null;
  created_at: string;
}

interface GroupState {
  groups: Group[];
  activeGroupId: string | null;
  members: Record<string, GroupMember[]>;
  loading: boolean;
  fetchGroups: () => Promise<void>;
  setActiveGroup: (id: string) => void;
  createGroup: (name: string) => Promise<Group | null>;
  fetchMembers: (groupId: string) => Promise<void>;
  createInvite: (groupId: string) => Promise<string | null>;
  joinByToken: (token: string) => Promise<string | null>;
  leaveGroup: (groupId: string) => Promise<void>;
  updateGroupCover: (groupId: string, localUri: string) => Promise<string | null>;
  updateGroupDescription: (groupId: string, description: string) => Promise<string | null>;
  updateGroupIcon: (groupId: string, icon: string) => Promise<string | null>;
}

const ACTIVE_GROUP_KEY = 'cohaus.active_group_id';

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: [],
  activeGroupId: null,
  members: {},
  loading: false,

  fetchGroups: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data) {
      set({ groups: data as Group[] });
      const storedActive = await AsyncStorage.getItem(ACTIVE_GROUP_KEY);
      const stillExists = data.find((g) => g.id === storedActive);
      const current = get().activeGroupId;
      if (!current || !data.find((g) => g.id === current)) {
        const nextActive = stillExists ? storedActive : data[0]?.id ?? null;
        set({ activeGroupId: nextActive });
      }
    }
    set({ loading: false });
  },

  setActiveGroup: (id: string) => {
    set({ activeGroupId: id });
    AsyncStorage.setItem(ACTIVE_GROUP_KEY, id);
  },

  createGroup: async (name: string) => {
    const { data, error } = await supabase.rpc('create_group', { p_name: name }).single();

    if (error || !data) return null;
    const group = data as Group;

    await get().fetchGroups();
    get().setActiveGroup(group.id);
    return group;
  },

  fetchMembers: async (groupId: string) => {
    const { data, error } = await supabase
      .from('group_members')
      .select('user_id, role, share_weight, profiles(display_name, email, avatar_url)')
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true });

    if (!error && data) {
      const members: GroupMember[] = data.map((row: any) => ({
        user_id: row.user_id,
        role: row.role,
        share_weight: row.share_weight,
        display_name: row.profiles?.display_name ?? null,
        email: row.profiles?.email ?? '',
        avatar_url: row.profiles?.avatar_url ?? null,
      }));
      set((state) => ({ members: { ...state.members, [groupId]: members } }));
    }
  },

  createInvite: async (groupId: string) => {
    const { data, error } = await supabase
      .from('group_invites')
      .insert({ group_id: groupId })
      .select('token')
      .single();
    if (error || !data) return null;
    return data.token as string;
  },

  joinByToken: async (token: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return i18n.t('errors.notSignedIn');

    const { data: invite, error } = await supabase
      .from('group_invites')
      .select('*')
      .eq('token', token.trim())
      .is('used_at', null)
      .maybeSingle();

    if (error || !invite) return i18n.t('errors.invalidInvite');
    if (new Date(invite.expires_at) < new Date()) return i18n.t('errors.inviteExpired');

    const { error: memberError } = await supabase
      .from('group_members')
      .insert({ group_id: invite.group_id, user_id: userId });

    if (memberError) {
      if (memberError.code === '23505') return i18n.t('errors.alreadyMember');
      return i18n.t('errors.joinGroupFailed');
    }

    await supabase.from('group_invites').update({ used_at: new Date().toISOString() }).eq('id', invite.id);

    await get().fetchGroups();
    get().setActiveGroup(invite.group_id);
    return null;
  },

  leaveGroup: async (groupId: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;
    await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId);
    await get().fetchGroups();
  },

  updateGroupCover: async (groupId: string, localUri: string) => {
    try {
      const arrayBuffer = await new File(localUri).arrayBuffer();
      const path = `${groupId}/cover.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('group-covers')
        .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) return i18n.t('errors.uploadPhotoFailed');

      const { data: publicUrl } = supabase.storage.from('group-covers').getPublicUrl(path);
      const cacheBusted = `${publicUrl.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('groups')
        .update({ cover_url: cacheBusted })
        .eq('id', groupId);
      if (updateError) return i18n.t('errors.saveProfilePhotoFailed');

      await get().fetchGroups();
      return null;
    } catch {
      return i18n.t('errors.processPhotoFailed');
    }
  },

  updateGroupDescription: async (groupId: string, description: string) => {
    const { error } = await supabase
      .from('groups')
      .update({ description: description.trim() || null })
      .eq('id', groupId);
    if (error) return i18n.t('errors.updateNameFailed');
    await get().fetchGroups();
    return null;
  },

  updateGroupIcon: async (groupId: string, icon: string) => {
    const { error } = await supabase.from('groups').update({ icon, cover_url: null }).eq('id', groupId);
    if (error) return i18n.t('errors.updateNameFailed');
    await get().fetchGroups();
    return null;
  },
}));
