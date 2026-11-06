import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Side } from '@/domain/missionPoints';
import { colors, fontSizes, spacing } from '@/theme/tokens';

import { PlayerHalf } from './PlayerHalf';
import { StartChooser } from './StartChooser';
import { useGame } from './useGame';

const KEEP_AWAKE_TAG = 'tracker';

/** Keep the screen on only while the tracker is the visible tab. */
function useKeepAwakeWhileFocused() {
  useFocusEffect(
    useCallback(() => {
      void activateKeepAwakeAsync(KEEP_AWAKE_TAG);
      return () => {
        void deactivateKeepAwake(KEEP_AWAKE_TAG);
      };
    }, []),
  );
}

export function TrackerScreen() {
  const { state, hydrated, dispatch } = useGame();
  useKeepAwakeWhileFocused();

  const confirmReset = () =>
    Alert.alert('Start a new game?', 'Clears mission points and who goes first.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'New game', style: 'destructive', onPress: () => dispatch({ type: 'reset' }) },
    ]);

  const half = (side: Side) => (
    <PlayerHalf
      side={side}
      flipped={side === 'top'}
      points={state.points[side]}
      onIncrement={() => dispatch({ type: 'increment', side })}
      onDecrement={() => dispatch({ type: 'decrement', side })}
      hasPriority={state.priority === side}
      onPassPriority={() => dispatch({ type: 'passPriority' })}
    />
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      {!hydrated ? null : state.priority === null ? (
        <StartChooser onStart={(first) => dispatch({ type: 'start', first })} />
      ) : (
        <>
          {half('top')}
          {/* Middle band, outside both tap areas: [reset] [round · timer] [spare].
              The center slot is reserved for features 3-4. */}
          <View style={styles.band} testID="middle-band">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset game"
              onPress={confirmReset}
              style={({ pressed }) => [styles.bandButton, pressed && styles.bandButtonPressed]}
            >
              <Text style={styles.resetText}>↺</Text>
            </Pressable>
            <View style={styles.bandCenter} />
            <View style={styles.bandButton} />
          </View>
          {half('bottom')}
        </>
      )}
    </SafeAreaView>
  );
}

const BAND_BUTTON_SIZE = 64;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  band: {
    height: BAND_BUTTON_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bandCenter: { flex: 1, alignItems: 'center' },
  bandButton: {
    width: BAND_BUTTON_SIZE,
    height: BAND_BUTTON_SIZE,
    borderRadius: BAND_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bandButtonPressed: { backgroundColor: colors.surfaceRaised },
  resetText: { color: colors.textMuted, fontSize: fontSizes.heading * 1.5, lineHeight: 48 },
});
