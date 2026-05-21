import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Text} from 'react-native';
import SearchScreen from '../screens/SearchScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import CragDetailScreen from '../screens/CragDetailScreen';
import {Crag} from '../types/crag';

export type RootStackParamList = {
  Tabs: undefined;
  Search: undefined;
  Favorites: undefined;
  CragDetail: {crag: Crag};
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#3b82f6',
        headerShown: false,
      }}>
      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Recherche',
          tabBarIcon: ({color}) => <Text style={{color, fontSize: 20}}>🔍</Text>,
        }}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesScreen}
        options={{
          tabBarLabel: 'Favoris',
          tabBarIcon: ({color}) => <Text style={{color, fontSize: 20}}>★</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Tabs"
          component={TabNavigator}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="CragDetail"
          component={CragDetailScreen}
          options={({route}) => ({title: route.params.crag.name})}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
