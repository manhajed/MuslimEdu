// Relative, not the `@/` alias: the alias only exists via
// babel-plugin-module-resolver, so an `@/...` import here silently fails to
// resolve any time Metro transforms this file with a stale babel config (a
// dev server started before a babel.config.js change keeps the old config
// in its worker, leaving the import literal -> "Unable to resolve module
// @/global.css"). The app entry point is the worst possible place to have
// that dependency, and every other file in this codebase uses relative
// imports anyway.
import './src/global.css';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GluestackUIProvider } from './src/components/ui/gluestack-ui-provider';
import { AuthProvider } from './src/context/AuthContext';
import { LocaleProvider } from './src/context/LocaleContext';
import { OfflineQueueProvider } from './src/context/OfflineQueueContext';
import { DisplayScaleProvider } from './src/context/DisplayScaleContext';
import { NotificationProvider } from './src/context/NotificationContext';
import DisplayScaleWrapper from './src/components/DisplayScaleWrapper';
import RootNavigator from './src/navigation/RootNavigator';
import OfflineStatusBar from './src/components/OfflineStatusBar';
import LocaleAccountSync from './src/components/LocaleAccountSync';
import { registerBackgroundHandler } from './src/services/firebaseMessaging';

// Must run at module load, before the RN CLI's generated index.js finishes
// calling AppRegistry.registerComponent (this module is imported by that
// file) - a background/quit-state FCM handler registered later than that
// point is not reliably picked up by the native side.
registerBackgroundHandler();

export default function App() {
  return (
    // mode="light" - the app's whole existing design system (theme/glass.ts)
    // is light-only with no dark-mode handling anywhere yet, so following
    // the OS theme would only reskin new gluestack components to dark while
    // every existing screen stayed light-only.
    <GluestackUIProvider mode="light">
      <SafeAreaProvider>
        <LocaleProvider>
          <OfflineQueueProvider>
            <AuthProvider>
              <LocaleAccountSync />
              <NotificationProvider>
                <DisplayScaleProvider>
                  <DisplayScaleWrapper>
                    {/* OfflineStatusBar is a normal flex sibling ABOVE the
                        navigator, not an absolute overlay - going offline pushes
                        the whole screen down by the banner's height instead of
                        floating a pill over whatever's underneath it. Shows on
                        every tab/pushed screen without each one rendering it
                        itself. */}
                    <View style={{ flex: 1 }}>
                      <OfflineStatusBar />
                      <View style={{ flex: 1 }}>
                        <RootNavigator />
                      </View>
                    </View>
                  </DisplayScaleWrapper>
                </DisplayScaleProvider>
              </NotificationProvider>
            </AuthProvider>
          </OfflineQueueProvider>
        </LocaleProvider>
      </SafeAreaProvider>
    </GluestackUIProvider>
  );
}
