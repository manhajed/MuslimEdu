// NativeWind v5 does its work through PostCSS, not a Babel plugin - only
// worklets (for react-native-reanimated v4) needs one here.
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: ['react-native-worklets/plugin'],
};
