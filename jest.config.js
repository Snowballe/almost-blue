module.exports = {
  preset: 'react-native',
  moduleNameMapper: {
    // react-native-dotenv résout @env via le plugin Babel en dev/build.
    // En contexte Jest (pas de build Babel complet), on le remplace par un stub.
    '@env': '<rootDir>/__tests__/__mocks__/@env.ts',
    // @react-native-async-storage/async-storage ne livre pas de mock Jest intégré.
    '@react-native-async-storage/async-storage':
      '<rootDir>/__tests__/__mocks__/@react-native-async-storage/async-storage.ts',
    // MapLibre charge des TurboModules natifs absents dans Jest → stub complet.
    '@maplibre/maplibre-react-native':
      '<rootDir>/__tests__/__mocks__/@maplibre/maplibre-react-native.ts',
    // Notifee initialise un module natif à l'import → stub complet.
    '@notifee/react-native':
      '<rootDir>/__tests__/__mocks__/@notifee/react-native.ts',
    // BackgroundFetch accède à des modules natifs absents en Jest → stub.
    'react-native-background-fetch':
      '<rootDir>/__tests__/__mocks__/react-native-background-fetch.ts',
  },
  // Empêche Jest de collecter les fichiers de mock comme des suites de tests.
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/__tests__/__mocks__/',
  ],
  // Initialise le mock gesture-handler avant chaque suite (requis par App.test.tsx).
  setupFilesAfterEnv: ['react-native-gesture-handler/jestSetup'],
  // Le preset react-native ne liste en blanc que "react-native" et "@react-native".
  // Les packages ci-dessous publient de l'ESM → Babel doit les transpiler aussi.
  transformIgnorePatterns: [
    'node_modules/(?!(' + [
      'react-native',
      '@react-native',
      '@react-navigation',
      'react-native-gesture-handler',
      'react-native-reanimated',
      'react-native-safe-area-context',
      '@react-native-vector-icons',
      'react-native-vector-icons',
      '@maplibre',
    ].join('|') + ')/)',
  ],
};
