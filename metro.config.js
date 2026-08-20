const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withNativeWind } = require('nativewind/metro');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * Only used when Metro is run against this repo directly (local/Codespace
 * development). The CI workflows scaffold their own project - see index.js
 * for the full note - so this file (along with babel.config.js,
 * tailwind.config.js and src/global.css) is also copied into the generated
 * project by the "Copy your custom app code" step, replacing the CLI
 * template's own copy.
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {};

module.exports = withNativeWind(mergeConfig(getDefaultConfig(__dirname), config), {
  input: './src/global.css',
  inlineRem: 16,
});
