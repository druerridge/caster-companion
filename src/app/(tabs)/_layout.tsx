import { Link } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, type ColorValue } from 'react-native';

import { colors, fonts, fontSizes, spacing } from '@/theme/tokens';

function TabGlyph({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={[styles.glyph, { color }]}>{glyph}</Text>;
}

function AboutButton() {
  return (
    <Link href="/about" asChild>
      <Pressable accessibilityLabel="About" hitSlop={12} style={styles.about}>
        <Text style={styles.aboutText}>ⓘ</Text>
      </Pressable>
    </Link>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.ink,
        },
        tabBarLabelStyle: { fontFamily: fonts.display, fontSize: fontSizes.caption + 1 },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.display, fontSize: fontSizes.title + 2 },
        headerRight: () => <AboutButton />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tracker',
          // Full-bleed table layout; About is reachable from the other tabs.
          headerShown: false,
          tabBarIcon: ({ color }) => <TabGlyph glyph="◆" color={color} />,
        }}
      />
      <Tabs.Screen
        name="rules"
        options={{
          title: 'Rules',
          tabBarIcon: ({ color }) => <TabGlyph glyph="§" color={color} />,
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
  );
}

const styles = StyleSheet.create({
  glyph: { fontSize: fontSizes.title },
  about: { paddingHorizontal: spacing.lg },
  aboutText: { color: colors.textMuted, fontSize: fontSizes.title },
});
