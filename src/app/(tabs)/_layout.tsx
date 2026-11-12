import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet, Text, type ColorValue } from 'react-native';

import { GameProvider } from '@/features/tracker/GameProvider';
import { colors, fonts, fontSizes } from '@/theme/tokens';

function TabGlyph({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={[styles.glyph, { color }]}>{glyph}</Text>;
}

export default function TabsLayout() {
  return (
    // One game shared by the tracker and the score banner on the other tabs (D30).
    <GameProvider>
      {/* Tracker sits in the middle; the app always opens on it because "/" is its route.
          No headers: the tab bar names the screen, and the score banner takes the top (D31). */}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.ink,
          },
          tabBarLabelStyle: { fontFamily: fonts.display, fontSize: fontSizes.caption + 1 },
        }}
      >
        <Tabs.Screen
          name="rules"
          options={{
            title: 'Rules',
            tabBarIcon: ({ color }) => <TabGlyph glyph="§" color={color} />,
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: 'Tracker',
            tabBarIcon: ({ color }) => <TabGlyph glyph="◆" color={color} />,
          }}
        />
        <Tabs.Screen
          name="cryptids"
          options={{
            title: 'Cryptids',
            tabBarIcon: ({ color }) => <TabGlyph glyph="✦" color={color} />,
          }}
        />
      </Tabs>
    </GameProvider>
  );
}

const styles = StyleSheet.create({
  glyph: { fontSize: fontSizes.title },
});
