import React from 'react';
import {StyleSheet} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import {useNotificationSetup} from './src/hooks/useNotificationSetup';

function AppContent() {
  useNotificationSetup();
  return <AppNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <AppContent />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
});
