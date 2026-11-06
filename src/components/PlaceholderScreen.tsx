import { StyleSheet, Text, View } from 'react-native';

import { CardFrame } from '@/components/CardFrame';
import { colors, fontSizes, spacing, type Aura } from '@/theme/tokens';

interface PlaceholderScreenProps {
  title: string;
  aura: Aura;
  description: string;
}

export function PlaceholderScreen({ title, aura, description }: PlaceholderScreenProps) {
  return (
    <View style={styles.screen}>
      <CardFrame title={title} aura={aura} style={styles.frame}>
        <Text style={styles.text}>{description}</Text>
        <Text style={styles.muted}>Coming soon.</Text>
      </CardFrame>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  frame: { flex: 1 },
  text: { color: colors.text, fontSize: fontSizes.body, marginBottom: spacing.md },
  muted: { color: colors.textMuted, fontSize: fontSizes.caption },
});
