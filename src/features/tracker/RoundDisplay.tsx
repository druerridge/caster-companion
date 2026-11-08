import { StyleSheet, View } from 'react-native';

import { OutlinedText } from '@/components/OutlinedText';
import { colors, fonts, fontSizes, spacing } from '@/theme/tokens';

/** "ROUND 3" in a row; the drawer rotates it to run along its length. */
export function RoundDisplay({ round }: { round: number }) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`Round ${round}`}
      testID="round-display"
    >
      <OutlinedText style={styles.caption} outline={2}>
        Round
      </OutlinedText>
      <OutlinedText style={styles.number} outline={4} testID="round-number">
        {round}
      </OutlinedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  caption: {
    color: colors.textMuted,
    fontFamily: fonts.display,
    fontSize: fontSizes.title,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  number: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: fontSizes.display,
    fontVariant: ['tabular-nums'],
  },
});
