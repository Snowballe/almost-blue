import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {ThemeProvider, useTheme} from './src/theme';
import AppNavigator from './src/navigation/AppNavigator';
import {useNotificationSetup} from './src/hooks/useNotificationSetup';
import {usePrefetchFavorites} from './src/hooks/usePrefetchFavorites';
import {ErrorBoundary} from './src/components/ErrorBoundary';
import {useSettingsStore} from './src/stores/useSettingsStore';
import {useSectorsStore} from './src/stores/useSectorsStore';
import {useNotificationStore} from './src/stores/useNotificationStore';

function AppContent() {
  const {colors} = useTheme();
  const [hydrated, setHydrated] = useState(false);

  // Attendre la rehydration des stores avant le premier rendu.
  // Sans ça, SectorList s'affiche d'abord sans favoris, Settings avec les valeurs
  // par défaut, puis les deux se re-rendent quand AsyncStorage répond (~10–50ms).
  useEffect(() => {
    Promise.all([
      useSettingsStore.persist.rehydrate(),
      useSectorsStore.persist.rehydrate(),
      useNotificationStore.persist.rehydrate(),
    ]).then(() => setHydrated(true));
  }, []);

  useNotificationSetup();
  usePrefetchFavorites();

  if (!hydrated) {
    // Fond uni pendant la rehydration : invisible derrière le splash screen natif.
    return <View style={[styles.root, {backgroundColor: colors.background}]} />;
  }
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
