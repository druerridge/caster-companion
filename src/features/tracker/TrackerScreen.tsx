import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDialog } from '@/components/dialog/DialogProvider';
import { RoundImageButton } from '@/components/RoundImageButton';
import { ThemedBackground } from '@/components/ThemedBackground';
import type { Side } from '@/domain/missionPoints';
import { spacing } from '@/theme/tokens';

import { PlayerHalf } from './PlayerHalf';
import { StartChooser } from './StartChooser';
import { useGame } from './useGame';

const KEEP_AWAKE_TAG = 'tracker';
const RESTART_ART = require('../../../assets/images/btn-restart.png');

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

  const { confirm } = useDialog();

  const confirmReset = async () => {
    const ok = await confirm({
      title: 'Start a new game?',
      message: 'Clears mission points and who goes first.',
      confirmLabel: 'New game',
      destructive: true,
    });
    if (ok) dispatch({ type: 'reset' });
  };

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
    <ThemedBackground>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
        {!hydrated ? null : state.priority === null ? (
          <StartChooser onStart={(first) => dispatch({ type: 'start', first })} />
        ) : (
          <>
            {half('top')}
            {/* Middle band, outside both tap areas: [reset] [round · timer] [spare].
              The center slot is reserved for features 3-4. */}
            <View style={styles.band} testID="middle-band">
              <RoundImageButton
                source={RESTART_ART}
                accessibilityLabel="Reset game"
                onPress={() => void confirmReset()}
                size={BAND_BUTTON_SIZE}
              />
              <View style={styles.bandCenter} />
              <View style={styles.bandButton} />
            </View>
            {half('bottom')}
          </>
        )}
      </SafeAreaView>
    </ThemedBackground>
  );
}

const BAND_BUTTON_SIZE = 64;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  band: {
    height: BAND_BUTTON_SIZE,
    marginVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bandCenter: { flex: 1, alignItems: 'center' },
  bandButton: { width: BAND_BUTTON_SIZE, height: BAND_BUTTON_SIZE },
});
