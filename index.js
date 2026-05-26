/**
 * @format
 */

import 'react-native-gesture-handler';
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import BackgroundFetch from 'react-native-background-fetch';
import {checkAndNotify} from './src/services/notificationService';

AppRegistry.registerComponent(appName, () => App);

/**
 * Tâche headless Android : exécutée par WorkManager même quand l'app est fermée.
 * Pas de contexte React — uniquement des appels natifs et Zustand getState().
 */
const backgroundFetchHeadlessTask = async event => {
  await checkAndNotify();
  BackgroundFetch.finish(event.taskId);
};

BackgroundFetch.registerHeadlessTask(backgroundFetchHeadlessTask);
