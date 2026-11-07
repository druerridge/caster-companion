import { Pressable, StyleSheet, View } from 'react-native';

import { CartoonFrame } from '@/components/CartoonFrame';
import { OutlinedText } from '@/components/OutlinedText';
import { TagButton } from '@/components/TagButton';
import type { Side } from '@/domain/missionPoints';
import { colors, fonts, fontSizes, spacing } from '@/theme/tokens';

interface PlayerHalfProps {
  side: Side;
  points: number;
  /** Rotate 180° so the player across the table reads it right-side up. */
  flipped?: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  /** This player goes first this round. */
  hasPriority: boolean;
  onPassPriority: () => void;
}

const SIDE_LABEL: Record<Side, string> = { top: 'Top player', bottom: 'Bottom player' };

/**
 * One player's half of the tracker: tap the left half for −1, the right half
 * for +1. The player with priority gets a bright frame and a tappable FIRST
 * badge (on the edge nearest the middle band) that passes priority over.
 */
export function PlayerHalf({
  side,
  points,
  flipped,
  onIncrement,
  onDecrement,
  hasPriority,
  onPassPriority,
}: PlayerHalfProps) {
  const label = SIDE_LABEL[side];
  return (
    <CartoonFrame
      borderColor={hasPriority ? colors.priority : colors.frameIdle}
      style={[styles.frame, flipped && styles.flipped]}
      testID={`player-half-${side}`}
    >
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: decrease mission points`}
          onPress={onDecrement}
          style={({ pressed }) => [styles.zone, styles.zoneLeft, pressed && styles.zonePressed]}
        >
          <OutlinedText style={styles.hint}>−</OutlinedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: increase mission points`}
          onPress={onIncrement}
          style={({ pressed }) => [styles.zone, styles.zoneRight, pressed && styles.zonePressed]}
        >
          <OutlinedText style={styles.hint}>+</OutlinedText>
        </Pressable>
      </View>
      <View style={styles.center} pointerEvents="none">
        <OutlinedText style={styles.score} outline={6} testID={`mission-points-${side}`}>
          {points}
        </OutlinedText>
        <OutlinedText style={styles.caption} outline={2}>
          Mission Points
        </OutlinedText>
      </View>
      {hasPriority && (
        <View style={styles.badgeSlot} pointerEvents="box-none">
          <TagButton
            label="FIRST ⇅"
            variant="primary"
            accessibilityLabel={`${label} goes first. Pass priority`}
            hitSlop={8}
            onPress={onPassPriority}
            testID={`priority-badge-${side}`}
          />
        </View>
      )}
    </CartoonFrame>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
  flipped: { transform: [{ rotate: '180deg' }] },
  badgeSlot: {
    position: 'absolute',
    top: spacing.md,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  row: { flex: 1, flexDirection: 'row' },
  zone: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
  zoneLeft: { alignItems: 'flex-start' },
  zoneRight: { alignItems: 'flex-end' },
  zonePressed: { backgroundColor: colors.pressed },
  hint: { color: colors.textMuted, fontFamily: fonts.display, fontSize: fontSizes.heading * 1.4 },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: fontSizes.score,
    fontVariant: ['tabular-nums'],
  },
  caption: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: fontSizes.body,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
