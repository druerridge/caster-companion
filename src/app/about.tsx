import Constants from 'expo-constants';
import { StyleSheet, Text, View } from 'react-native';

import { CardFrame } from '@/components/CardFrame';
import { colors, fontSizes, spacing } from '@/theme/tokens';

export default function AboutScreen() {
  return (
    <View style={styles.screen}>
      <CardFrame title="Caster Companion">
        <Text style={styles.text}>
          An unofficial, fan-made companion app for the MetaZoo trading card game.
        </Text>
        <Text style={styles.text}>
          Not affiliated with, endorsed by, or sponsored by MetaZoo or its publishers. All game
          names and card content belong to their respective owners.
        </Text>
        <Text style={styles.muted}>Version {Constants.expoConfig?.version ?? 'unknown'}</Text>
      </CardFrame>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  text: { color: colors.text, fontSize: fontSizes.body, marginBottom: spacing.md },
  muted: { color: colors.textMuted, fontSize: fontSizes.caption },
});
