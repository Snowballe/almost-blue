// Mock Jest de react-native-background-fetch.
// Le module natif n'existe pas en environnement Jest.

const STATUS_AVAILABLE = 2;

const BackgroundFetch = {
  NETWORK_TYPE_ANY: 0,
  NETWORK_TYPE_NONE: -1,
  NETWORK_TYPE_WIFI: 1,
  STATUS_AVAILABLE,
  STATUS_DENIED: 0,
  STATUS_RESTRICTED: 1,
  configure: jest.fn(
    (_config: unknown, _onEvent: unknown, _onTimeout: unknown): Promise<number> =>
      Promise.resolve(STATUS_AVAILABLE),
  ),
  scheduleTask: jest.fn((): Promise<boolean> => Promise.resolve(true)),
  stop: jest.fn((): Promise<boolean> => Promise.resolve(true)),
  start: jest.fn((): Promise<number> => Promise.resolve(STATUS_AVAILABLE)),
  finish: jest.fn(),
};

export default BackgroundFetch;
