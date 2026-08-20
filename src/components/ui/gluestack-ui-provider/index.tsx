// Copied verbatim from gluestack-ui's canonical source
// (github.com/gluestack/gluestack-ui, src/components/ui/gluestack-ui-provider/index.tsx)
// - this is the plain React Native variant (not index.web.tsx/index.next.tsx,
// which are for web/Next.js targets this app has none of, and not
// index.uniwind.tsx, which the docs say isn't supported for React Native
// CLI projects).
import React, { useEffect } from 'react';
import { View, ViewProps } from 'react-native';
import { OverlayProvider } from '@gluestack-ui/core/overlay/creator';
import { ToastProvider } from '@gluestack-ui/core/toast/creator';
import { Appearance, ColorSchemeName } from 'react-native';

export type ModeType = 'light' | 'dark' | 'system';

export function GluestackUIProvider({
  mode = 'system',
  ...props
}: {
  mode?: ModeType;
  children?: React.ReactNode;
  style?: ViewProps['style'];
}) {
  useEffect(() => {
    Appearance.setColorScheme(mode as ColorSchemeName);
  }, [mode]);

  return (
    <View style={[{ flex: 1, height: '100%', width: '100%' }, props.style]}>
      <OverlayProvider>
        <ToastProvider>{props.children}</ToastProvider>
      </OverlayProvider>
    </View>
  );
}
