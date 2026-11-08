import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { CartoonFrame } from '@/components/CartoonFrame';
import { OutlinedText } from '@/components/OutlinedText';
import { TagButton } from '@/components/TagButton';
import { formatChange, hasReachedGoal, type Side } from '@/domain/missionPoints';
import { colors, fonts, fontSizes, spacing } from '@/theme/tokens';

import { useRecentChange } from './useRecentChange';

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
 * At 30+ mission points the half's background changes colour. A small
 * "+3" / "−2" beside the score shows the net change during a burst of taps,
 * fading out as the burst runs out.
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
  const { delta: change, opacity: changeOpacity } = useRecentChange(points);
  return (
    <CartoonFrame
      borderColor={hasPriority ? colors.priority : colors.frameIdle}
      fill={hasReachedGoal(points) ? colors.goalFill : colors.scrim}
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
        {/* Equal fixed-width slots either side keep the score centred; the right
            one holds the burst change. Plain flow layout, nothing positioned. */}
        <View style={styles.scoreRow}>
          <View style={styles.changeSlot} />
          <OutlinedText style={styles.score} outline={6} testID={`mission-points-${side}`}>
            {points}
          </OutlinedText>
          <View style={styles.changeSlot}>
            {change !== 0 && (
              <Animated.View
                style={{ opacity: changeOpacity }}
                testID={`mission-points-change-fade-${side}`}
              >
                <OutlinedText
                  style={[styles.change, change < 0 && styles.changeDown]}
                  outline={3}
                  testID={`mission-points-change-${side}`}
                >
                  {formatChange(change)}
                </OutlinedText>
              </Animated.View>
            )}
          </View>
        </View>
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

/** Fits "+99" at the change font size. */
const CHANGE_SLOT_WIDTH = 84;

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
  scoreRow: { flexDirection: 'row', alignItems: 'flex-start' },
  changeSlot: {
    width: CHANGE_SLOT_WIDTH,
    paddingTop: spacing.lg,
    paddingLeft: spacing.sm,
    alignItems: 'flex-start',
  },
  change: {
    color: colors.accent,
    fontFamily: fonts.display,
    fontSize: fontSizes.heading * 1.3,
    fontVariant: ['tabular-nums'],
  },
  changeDown: { color: colors.danger },
  caption: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: fontSizes.body,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
