// Mock Jest de react-native-background-fetch.
// Le module natif n'existe pas en environnement Jest.

const BackgroundFetch = {
  NETWORK_TYPE_ANY: 0,
  NETWORK_TYPE_NONE: -1,
  NETWORK_TYPE_WIFI: 1,
  STATUS_AVAILABLE: 2,
  STATUS_DENIED: 0,
  STATUS_RESTRICTED: 1,
  configure: jest.fn((_config: unknown, _onEvent: unknown, _onTimeout: unknown) =>
    Promise.resolve(BackgroundFetch.STATUS_AVAILABLE),
  ),
  scheduleTask: jest.fn(() => Promise.resolve(true)),
  stop: jest.fn(() => Promise.resolve(true)),
  start: jest.fn(() => Promise.resolve(BackgroundFetch.STATUS_AVAILABLE)),
  finish: jest.fn(),
};

export default BackgroundFetch;
