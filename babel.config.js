module.exports = function (api) {
  api.cache.using(() => process.env.NODE_ENV);
  const isTest = process.env.NODE_ENV === 'test';
  return {
    // nativewind/babel (via react-native-css-interop) unconditionally includes
    // "react-native-worklets/plugin" which is not installed. Skip in test env.
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      ...(isTest ? [] : ['nativewind/babel']),
    ],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@': './src',
            '@app': './src/app',
            '@core': './src/core',
            '@shared': './src/shared',
            '@features': './src/features',
            '@assets': './src/assets',
          },
        },
      ],
      // react-native-reanimated/plugin requires react-native-worklets (not installed).
      // Skip in test env – only needed for native builds.
      ...(isTest ? [] : ['react-native-reanimated/plugin']),
    ],
  };
};
