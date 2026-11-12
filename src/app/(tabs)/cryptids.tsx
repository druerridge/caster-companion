import { Link } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { ScoreBanner } from '@/features/tracker/ScoreBanner';
import { colors, fontSizes, spacing } from '@/theme/tokens';

export default function CryptidsScreen() {
  return (
    <PlaceholderScreen
      title="Cryptids"
      aura="earth"
      description="Search cryptids by name or location."
      top={<ScoreBanner />}
    >
      {/* The tabs have no header; About lives here until feature 9 needs the space (D31). */}
      <Link href="/about" asChild>
        <Text accessibilityRole="link" accessibilityLabel="About" style={styles.about}>
          ⓘ About this app
        </Text>
      </Link>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  about: {
    color: colors.accent,
    fontSize: fontSizes.body,
    marginTop: 'auto',
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
  },
});
