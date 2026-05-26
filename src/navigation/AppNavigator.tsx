import React, {useState} from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {MaterialIcons} from '@react-native-vector-icons/material-icons/static';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import SectorListScreen from '../screens/SectorListScreen';
import SectorDetailScreen from '../screens/SectorDetailScreen';
import MapScreen from '../screens/MapScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HibernationScreen from '../screens/HibernationScreen';
import {isOffSeason} from '../utils/seasonLogic';
import {useSettingsStore} from '../stores/useSettingsStore';
import {theme} from '../theme';

export type RootStackParamList = {
  Tabs: undefined;
  SectorDetail: {sectorId: string};
};

export type TabParamList = {
  SectorList: undefined;
  Map: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const {colors, typography} = theme;

const NAV_THEME = {
  dark: true,
  colors: {
    primary: colors.accent,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.accent,
  },
  fonts: {
    regular: {fontFamily: 'System', fontWeight: '400' as const},
    medium: {fontFamily: 'System', fontWeight: '500' as const},
    bold: {fontFamily: 'System', fontWeight: '700' as const},
    heavy: {fontFamily: 'System', fontWeight: '900' as const},
  },
};

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {backgroundColor: colors.surface, borderTopColor: colors.border},
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDisabled,
      }}>
      <Tab.Screen
        name="SectorList"
        component={SectorListScreen}
        options={{
          tabBarLabel: 'Secteurs',
          tabBarIcon: ({color, size}) => (
            <MaterialIcons name="terrain" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarLabel: 'Carte',
          tabBarIcon: ({color, size}) => (
            <MaterialIcons name="map" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Réglages',
          tabBarIcon: ({color, size}) => (
            <MaterialIcons name="settings" color={color} size={size} />
          ),
          headerShown: true,
          headerStyle: {backgroundColor: colors.surface},
          headerTintColor: colors.textPrimary,
          headerTitleStyle: {
            fontWeight: typography.weight.semibold,
            color: colors.textPrimary,
          },
          headerTitle: 'Réglages',
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  // Non persisté : l'utilisateur revoit l'écran d'hibernation à chaque lancement
  const [overrideHibernation, setOverrideHibernation] = useState(false);
  const hibernationEnabled = useSettingsStore(s => s.hibernationEnabled);
  const offseasonStart = useSettingsStore(s => s.offseasonStart);
  const offseasonEnd = useSettingsStore(s => s.offseasonEnd);
  const hibernating =
    hibernationEnabled &&
    !isOffSeason(new Date(), offseasonStart, offseasonEnd) &&
    !overrideHibernation;

  if (hibernating) {
    return (
      <SafeAreaProvider>
        <HibernationScreen onOverride={() => setOverrideHibernation(true)} />
      </SafeAreaProvider>
    );
  }

  return (
    <NavigationContainer theme={NAV_THEME}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {backgroundColor: colors.surface},
          headerTintColor: colors.textPrimary,
          headerTitleStyle: {
            fontWeight: typography.weight.semibold,
            color: colors.textPrimary,
          },
        }}>
        <Stack.Screen
          name="Tabs"
          component={TabNavigator}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="SectorDetail"
          component={SectorDetailScreen}
          options={{title: 'Secteur'}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
