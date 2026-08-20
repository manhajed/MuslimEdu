// nativewind/babel handles Tailwind className -> style transforms.
//
// module-resolver backs the `@/*` alias at bundle time, so it means the
// same thing to Metro as it already does to TypeScript (tsconfig.json has
// mapped `@/*` -> src/* since before gluestack was added). Without it,
// tsc would happily accept an `@/foo` import that Metro then can't
// resolve. Nothing currently NEEDS it - every file here uses relative
// imports, and gluestack's generated components import relatively too
// (`@/` shows up only in their docs/*.mdx, not in component source) - it
// exists to keep the two resolvers honest with each other, and no
// critical path should depend on it (see App.tsx's note).
//
// worklets/plugin is required by react-native-reanimated v4 (its worklet
// compilation moved to the separate react-native-worklets package in v4).
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
