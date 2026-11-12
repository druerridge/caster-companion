import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hasReachedGoal, type Side } from '@/domain/missionPoints';
import { colors, fonts, fontSizes, radii, spacing, strokes } from '@/theme/tokens';

import { useGameContext } from './GameProvider';

const SIDE_NAME: Record<Side, string> = { top: 'TOP', bottom: 'BOTTOM' };

/**
 * Top edge of a header-less tab (feature 8, D30, D31). While a game is in
 * progress it's a full-width banner with the score that runs up under the
 * status bar: tap it to go to the tracker, × hides it until the next game.
 * Otherwise it only reserves the status-bar inset.
 */
export function ScoreBanner() {
  const insets = useSafeAreaInsets();
  const { state, hydrated, bannerDismissed, dismissBanner } = useGameContext();
  if (!hydrated || state.priority === null || bannerDismissed) {
    return <View style={{ height: insets.top }} />;
  }

  const { points, priority, round } = state;
  const chip = (side: Side) => (
    <View
      style={[
        styles.chip,
        priority === side && styles.chipPriority,
        hasReachedGoal(points[side]) && styles.chipGoal,
      ]}
      testID={`score-banner-${side}`}
    >
      <Text style={styles.name}>{SIDE_NAME[side]}</Text>
      <Text style={styles.points}>{points[side]}</Text>
    </View>
  );

  return (
    <View style={[styles.banner, { paddingTop: insets.top }]} testID="score-banner">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Score: top ${points.top}, bottom ${points.bottom}, round ${round}. Open tracker`}
        onPress={() => router.navigate('/')}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        {chip('top')}
        {chip('bottom')}
        <Text style={styles.round}>ROUND {round}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Hide score banner"
        hitSlop={8}
        onPress={dismissBanner}
        style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        testID="score-banner-close"
      >
        <Text style={styles.closeText}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.surface,
    borderBottomWidth: strokes.keyline,
    borderBottomColor: colors.ink,
    // Lifts the strip off the art below it.
    elevation: 6,
    shadowColor: colors.ink,
    shadowOpacity: 0.5,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.lg,
  },
  pressed: { backgroundColor: colors.pressed },
  chip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.frameIdle,
    backgroundColor: colors.surfaceRaised,
  },
  chipPriority: { borderColor: colors.priority },
  chipGoal: { backgroundColor: colors.goalFill },
  name: { color: colors.textMuted, fontFamily: fonts.display, fontSize: fontSizes.caption },
  points: { color: colors.text, fontFamily: fonts.display, fontSize: fontSizes.title },
  round: {
    color: colors.textMuted,
    fontFamily: fonts.display,
    fontSize: fontSizes.caption + 2,
    letterSpacing: 1,
    marginLeft: 'auto',
    paddingRight: spacing.sm,
  },
  close: {
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  closeText: {
    color: colors.textMuted,
    fontSize: fontSizes.heading,
    lineHeight: fontSizes.heading,
  },
});
