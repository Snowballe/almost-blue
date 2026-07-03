// Mock in-memory d'AsyncStorage pour les tests Zustand.
// @react-native-async-storage/async-storage ne livre pas de mock Jest intégré.

let store: Record<string, string> = {};

const AsyncStorageMock = {
  getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    store[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete store[key];
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    store = {};
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => Promise.resolve(Object.keys(store))),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
};

export default AsyncStorageMock;
