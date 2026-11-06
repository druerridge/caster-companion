import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { flipCoin } from '@/domain/game';
import type { Side } from '@/domain/missionPoints';
import { colors, fontSizes, radii, spacing } from '@/theme/tokens';

import { COIN_REVEAL_MS } from './timing';

interface StartChooserProps {
  onStart: (first: Side) => void;
}

const SIDE_LABEL: Record<Side, string> = { top: 'Top player', bottom: 'Bottom player' };

/** New-game screen: each player can claim first turn, or flip a coin in the middle. */
export function StartChooser({ onStart }: StartChooserProps) {
  const [coinResult, setCoinResult] = useState<Side | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const flip = () => {
    const winner = flipCoin();
    setCoinResult(winner);
    timer.current = setTimeout(() => onStart(winner), COIN_REVEAL_MS);
  };

  const section = (side: Side) => {
    const won = coinResult === side;
    const lost = coinResult !== null && !won;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${SIDE_LABEL[side]} goes first`}
        disabled={coinResult !== null}
        onPress={() => onStart(side)}
        testID={`start-${side}`}
        style={({ pressed }) => [
          styles.section,
          side === 'top' && styles.flipped,
          pressed && styles.sectionPressed,
          won && styles.sectionWon,
          lost && styles.sectionLost,
        ]}
      >
        <Text style={styles.title}>{won ? 'You go first!' : 'I go first'}</Text>
        {coinResult === null && <Text style={styles.caption}>Tap to start the game</Text>}
      </Pressable>
    );
  };

  return (
    <View style={styles.screen} testID="start-chooser">
      {section('top')}
      <View style={styles.coinBand}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Flip a coin"
          disabled={coinResult !== null}
          onPress={flip}
          style={({ pressed }) => [styles.coin, pressed && styles.sectionPressed]}
        >
          <Text style={styles.coinText}>
            {coinResult === null ? 'Flip a coin' : `${SIDE_LABEL[coinResult]} wins the flip`}
          </Text>
        </Pressable>
      </View>
      {section('bottom')}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: spacing.sm },
  section: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.frame,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  flipped: { transform: [{ rotate: '180deg' }] },
  sectionPressed: { backgroundColor: colors.surfaceRaised },
  sectionWon: { borderColor: colors.priority, borderWidth: 4 },
  sectionLost: { opacity: 0.4 },
  title: { color: colors.text, fontSize: fontSizes.heading, fontWeight: '700' },
  caption: { color: colors.textMuted, fontSize: fontSizes.caption, letterSpacing: 1 },
  coinBand: { height: 64, alignItems: 'center', justifyContent: 'center' },
  coin: {
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.frame,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinText: { color: colors.text, fontSize: fontSizes.body, fontWeight: '600' },
});
