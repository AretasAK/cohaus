import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { GroupsScreen } from '../features/groups/GroupsScreen';
import { GroupWorkspaceScreen } from '../features/groups/GroupWorkspaceScreen';
import { GroupsMasterDetailScreen } from '../features/groups/GroupsMasterDetailScreen';
import { BalancesScreen } from '../features/expenses/BalancesScreen';
import { ScanReceiptScreen } from '../features/pantry/ScanReceiptScreen';
import { NotificationsScreen } from '../features/notifications/NotificationsScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { TermsScreen } from '../features/legal/TermsScreen';
import { PrivacyScreen } from '../features/legal/PrivacyScreen';
import { DeleteAccountScreen } from '../features/legal/DeleteAccountScreen';
import { CustomTabBar } from './CustomTabBar';
import { useDeviceLayout } from '../lib/responsive';

const Tab = createBottomTabNavigator();
const GroupsStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} />
      <ProfileStack.Screen name="Terms" component={TermsScreen} />
      <ProfileStack.Screen name="Privacy" component={PrivacyScreen} />
      <ProfileStack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
    </ProfileStack.Navigator>
  );
}

function GroupsStackNavigator() {
  const { showSplitView } = useDeviceLayout();

  return (
    <GroupsStack.Navigator screenOptions={{ headerShown: false }}>
      {showSplitView ? (
        <GroupsStack.Screen name="GroupsHome" component={GroupsMasterDetailScreen} />
      ) : (
        <>
          <GroupsStack.Screen name="GroupsHome" component={GroupsScreen} />
          <GroupsStack.Screen name="GroupWorkspace" component={GroupWorkspaceScreen} />
          <GroupsStack.Screen name="Balances" component={BalancesScreen} />
          <GroupsStack.Screen name="ScanReceipt" component={ScanReceiptScreen} />
        </>
      )}
      <GroupsStack.Screen name="Notifications" component={NotificationsScreen} />
    </GroupsStack.Navigator>
  );
}

export function AppNavigator() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <CustomTabBar {...props} />}>
      <Tab.Screen name="Grupos" component={GroupsStackNavigator} options={{ title: t('navigation.tabs.groups') }} />
      <Tab.Screen name="Perfil" component={ProfileStackNavigator} options={{ title: t('navigation.tabs.profile') }} />
    </Tab.Navigator>
  );
}
