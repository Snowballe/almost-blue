import React, {useEffect} from 'react';
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
import {useTheme} from '../theme';

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

const NAV_FONTS = {
  regular:  {fontFamily: 'System', fontWeight: '400' as const},
  medium:   {fontFamily: 'System', fontWeight: '500' as const},
  bold:     {fontFamily: 'System', fontWeight: '700' as const},
  heavy:    {fontFamily: 'System', fontWeight: '900' as const},
};

function TabNavigator() {
  const {colors, typography} = useTheme();

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
  const {colors, typography} = useTheme();
  const colorScheme = useSettingsStore(s => s.colorScheme);

  const hibernationEnabled = useSettingsStore(s => s.hibernationEnabled);
  const offseasonStart = useSettingsStore(s => s.offseasonStart);
  const offseasonEnd = useSettingsStore(s => s.offseasonEnd);
  // Override persisté : survit aux redémarrages de l'app.
  // Il se réinitialise automatiquement dès qu'on entre en hors-saison,
  // afin que l'écran d'hibernation réapparaisse la saison suivante.
  const overrideHibernation = useSettingsStore(s => s.overrideHibernation);
  const setOverrideHibernation = useSettingsStore(s => s.setOverrideHibernation);

  const inOffSeason = isOffSeason(new Date(), offseasonStart, offseasonEnd);
  useEffect(() => {
    if (inOffSeason && overrideHibernation) {
      setOverrideHibernation(false);
    }
  }, [inOffSeason, overrideHibernation, setOverrideHibernation]);

  const hibernating = hibernationEnabled && !inOffSeason && !overrideHibernation;

  const navTheme = {
    dark: colorScheme === 'dark',
    colors: {
      primary:      colors.accent,
      background:   colors.background,
      card:         colors.surface,
      text:         colors.textPrimary,
      border:       colors.border,
      notification: colors.accent,
    },
    fonts: NAV_FONTS,
  };

  if (hibernating) {
    return (
      <SafeAreaProvider>
        <HibernationScreen onOverride={() => setOverrideHibernation(true)} />
      </SafeAreaProvider>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
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
