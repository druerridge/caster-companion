import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { DialogProvider } from '@/components/dialog/DialogProvider';
import { navigationTheme } from '@/theme/navigationTheme';
import { colors, fonts } from '@/theme/tokens';

export default function RootLayout() {
  return (
    <ThemeProvider value={navigationTheme}>
      <DialogProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerTitleStyle: { fontFamily: fonts.display },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="about" options={{ title: 'About', presentation: 'modal' }} />
        </Stack>
      </DialogProvider>
    </ThemeProvider>
  );
}
