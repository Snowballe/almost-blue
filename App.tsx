import React from 'react';
import {StyleSheet} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {ThemeProvider} from './src/theme';
import AppNavigator from './src/navigation/AppNavigator';
import {useNotificationSetup} from './src/hooks/useNotificationSetup';
import {usePrefetchFavorites} from './src/hooks/usePrefetchFavorites';
import {ErrorBoundary} from './src/components/ErrorBoundary';

function AppContent() {
  useNotificationSetup();
  usePrefetchFavorites();
  return <AppNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      {/* ErrorBoundary global : capture toute exception React non gérée
          et affiche un écran de récupération plutôt qu'un crash total. */}
      <ErrorBoundary>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
});
