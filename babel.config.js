module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
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
      'react-native-reanimated/plugin', // must be last
    ],
  };
};
