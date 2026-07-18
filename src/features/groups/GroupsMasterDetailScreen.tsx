import React, { useState } from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../components/Screen';
import { EmptyState } from '../../components/EmptyState';
import { useTheme } from '../../theme/ThemeProvider';
import { GroupsScreen } from './GroupsScreen';
import { GroupWorkspaceScreen } from './GroupWorkspaceScreen';
import { BalancesScreen } from '../expenses/BalancesScreen';
import { ScanReceiptScreen } from '../pantry/ScanReceiptScreen';

const DetailStack = createNativeStackNavigator();

function DetailPlaceholder() {
  const { t } = useTranslation();
  return (
    <Screen>
      <EmptyState
        icon="home-outline"
        title={t('groups.selectGroupTitle')}
        subtitle={t('groups.selectGroupSubtitle')}
      />
    </Screen>
  );
}

export function GroupsMasterDetailScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <View style={{ width: 380, borderRightWidth: 1, borderRightColor: theme.border }}>
        <GroupsScreen navigation={navigation} selectedGroupId={selectedGroupId} onSelectGroup={setSelectedGroupId} />
      </View>
      <View style={{ flex: 1 }}>
        <DetailStack.Navigator
          key={selectedGroupId ?? 'empty'}
          screenOptions={{ headerShown: false }}
          initialRouteName={selectedGroupId ? 'GroupWorkspace' : 'Placeholder'}
        >
          {selectedGroupId ? (
            <>
              <DetailStack.Screen
                name="GroupWorkspace"
                component={GroupWorkspaceScreen}
                initialParams={{ groupId: selectedGroupId }}
              />
              <DetailStack.Screen name="Balances" component={BalancesScreen} />
              <DetailStack.Screen name="ScanReceipt" component={ScanReceiptScreen} />
            </>
          ) : (
            <DetailStack.Screen name="Placeholder" component={DetailPlaceholder} />
          )}
        </DetailStack.Navigator>
      </View>
    </View>
  );
}
