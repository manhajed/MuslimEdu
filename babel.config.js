// nativewind/babel handles Tailwind className -> style transforms;
// module-resolver backs the `@/*` alias (mapped to ./src, matching
// tsconfig.json's paths) so gluestack-ui's generated component files -
// which hard-code `@/...` imports - resolve at bundle time, not just for
// the TypeScript checker. worklets/plugin is required by
// react-native-reanimated v4 (its worklet compilation moved to the
// separate react-native-worklets package in v4).
module.exports = {
  presets: ['module:@react-native/babel-preset', 'nativewind/babel'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: { '@': './src' },
      },
    ],
    'react-native-worklets/plugin',
  ],
};
