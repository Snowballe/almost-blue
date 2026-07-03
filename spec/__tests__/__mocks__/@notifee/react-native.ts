// Mock Jest de @notifee/react-native.
// Notifee enregistre un module natif au démarrage ; en Jest ce module n'existe pas.
// On expose les mêmes symboles que l'API publique, sous forme de jest.fn().

export enum AndroidImportance {
  DEFAULT = 3,
  HIGH = 4,
  LOW = 2,
  MIN = 1,
  NONE = 0,
}

export enum AuthorizationStatus {
  DENIED = 0,
  AUTHORIZED = 1,
  PROVISIONAL = 2,
  NOT_DETERMINED = -1,
}

export enum AndroidStyle {
  BIGTEXT = 0,
  INBOX   = 1,
  IMAGE   = 2,
}

export enum AndroidNotificationSetting {
  NOT_SUPPORTED = -1,
  DISABLED      = 0,
  ENABLED       = 1,
}

const notifee = {
  requestPermission: jest.fn(() =>
    Promise.resolve({authorizationStatus: AuthorizationStatus.AUTHORIZED}),
  ),
  createChannel: jest.fn(() => Promise.resolve('channel-id')),
  displayNotification: jest.fn(() => Promise.resolve()),
  cancelAllNotifications: jest.fn(() => Promise.resolve()),
  cancelNotification: jest.fn(() => Promise.resolve()),
  getInitialNotification: jest.fn(() => Promise.resolve(null)),
  onForegroundEvent: jest.fn(() => () => {}),
  onBackgroundEvent: jest.fn(() => () => {}),
  // Fiabilité de livraison (Android) — voir src/utils/notificationReliability.ts
  getNotificationSettings: jest.fn(() =>
    Promise.resolve({android: {alarm: AndroidNotificationSetting.ENABLED}}),
  ),
  isBatteryOptimizationEnabled: jest.fn(() => Promise.resolve(false)),
  getPowerManagerInfo: jest.fn(() => Promise.resolve({activity: null})),
  openBatteryOptimizationSettings: jest.fn(() => Promise.resolve()),
  openAlarmPermissionSettings: jest.fn(() => Promise.resolve()),
  openPowerManagerSettings: jest.fn(() => Promise.resolve()),
};

export default notifee;
