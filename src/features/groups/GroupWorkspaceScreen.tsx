import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../components/Screen';
import { SegmentedTabs } from '../../components/SegmentedTabs';
import { useTheme } from '../../theme/ThemeProvider';
import { useGroupStore } from '../../store/groupStore';
import { ListsScreen } from '../lists/ListsScreen';
import { ExpensesScreen } from '../expenses/ExpensesScreen';
import { TasksSection } from './TasksSection';
import { PantrySection } from './PantrySection';
import { RecipesSection } from './RecipesSection';
import { GroupInfoSection } from './GroupInfoSection';

export function GroupWorkspaceScreen({ route, navigation }: any) {
  const { groupId } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const SEGMENTS = [
    { key: 'lista', label: t('groups.segments.list') },
    { key: 'gastos', label: t('groups.segments.expenses') },
    { key: 'despensa', label: t('groups.segments.pantry') },
    { key: 'tareas', label: t('groups.segments.tasks') },
    { key: 'recetas', label: t('groups.segments.recipes') },
    { key: 'grupo', label: t('groups.segments.group') },
  ];
  const groups = useGroupStore((s) => s.groups);
  const setActiveGroup = useGroupStore((s) => s.setActiveGroup);
  const group = groups.find((g) => g.id === groupId);
  const [section, setSection] = useState('lista');

  useEffect(() => {
    setActiveGroup(groupId);
  }, [groupId]);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8, paddingBottom: 16 }}>
        {navigation.canGoBack() ? (
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
        ) : null}
        <Text
          style={{ fontSize: 20, fontWeight: '800', color: theme.text, letterSpacing: -0.3, flex: 1 }}
          numberOfLines={1}
        >
          {group?.name}
        </Text>
      </View>

      <View style={{ marginBottom: 16 }}>
        <SegmentedTabs segments={SEGMENTS} activeKey={section} onChange={setSection} />
      </View>

      <View style={{ flex: 1 }}>
        {section === 'lista' ? <ListsScreen groupId={groupId} /> : null}
        {section === 'gastos' ? <ExpensesScreen groupId={groupId} navigation={navigation} /> : null}
        {section === 'despensa' ? <PantrySection groupId={groupId} navigation={navigation} /> : null}
        {section === 'tareas' ? <TasksSection groupId={groupId} /> : null}
        {section === 'recetas' ? <RecipesSection groupId={groupId} /> : null}
        {section === 'grupo' ? <GroupInfoSection groupId={groupId} navigation={navigation} /> : null}
      </View>
    </Screen>
  );
}
