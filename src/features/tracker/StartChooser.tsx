import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { flipCoin } from '@/domain/game';
import type { Side } from '@/domain/missionPoints';
import { CartoonFrame } from '@/components/CartoonFrame';
import { OutlinedText } from '@/components/OutlinedText';
import { TagButton } from '@/components/TagButton';
import { colors, fonts, fontSizes, spacing } from '@/theme/tokens';

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
        style={[styles.section, side === 'top' && styles.flipped, lost && styles.sectionLost]}
      >
        {({ pressed }) => (
          <CartoonFrame
            borderColor={won ? colors.priority : colors.frame}
            fill={pressed ? colors.scrimStrong : colors.scrim}
            style={styles.section}
            innerStyle={styles.sectionInner}
          >
            <OutlinedText style={[styles.title, won && styles.titleWon]} outline={4}>
              {won ? 'You go first!' : 'I go first'}
            </OutlinedText>
            {coinResult === null && (
              <OutlinedText style={styles.caption} outline={2}>
                Tap to start the game
              </OutlinedText>
            )}
          </CartoonFrame>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.screen} testID="start-chooser">
      {section('top')}
      <View style={styles.coinBand}>
        <TagButton
          label={coinResult === null ? 'Flip a coin' : `${SIDE_LABEL[coinResult]} wins the flip`}
          accessibilityLabel="Flip a coin"
          disabled={coinResult !== null}
          onPress={flip}
        />
      </View>
      {section('bottom')}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: spacing.sm },
  section: { flex: 1 },
  sectionInner: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  flipped: { transform: [{ rotate: '180deg' }] },
  sectionLost: { opacity: 0.4 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: fontSizes.display * 0.75 },
  titleWon: { color: colors.priority },
  caption: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: fontSizes.body,
    letterSpacing: 1,
  },
  coinBand: { height: 64, alignItems: 'center', justifyContent: 'center' },
});
