import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDialog } from '@/components/dialog/DialogProvider';
import { RoundImageButton } from '@/components/RoundImageButton';
import { ThemedBackground } from '@/components/ThemedBackground';
import type { GameAction, GameState } from '@/domain/game';
import type { Side } from '@/domain/missionPoints';
import { spacing } from '@/theme/tokens';

import { GameClock } from './GameClock';
import { useGameContext } from './GameProvider';
import { PlayerHalf } from './PlayerHalf';
import { RoundDisplay } from './RoundDisplay';
import { SideDrawer } from './SideDrawer';
import { StartChooser } from './StartChooser';

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
  const { state, hydrated, dispatch } = useGameContext();
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

  return (
    <ThemedBackground>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
        {!hydrated ? null : state.priority === null ? (
          <StartChooser onStart={(first) => dispatch({ type: 'start', first, at: Date.now() })} />
        ) : (
          <GameTable state={state} dispatch={dispatch} onReset={() => void confirmReset()} />
        )}
      </SafeAreaView>
    </ThemedBackground>
  );
}

interface GameTableProps {
  state: GameState;
  dispatch: (action: GameAction) => void;
  onReset: () => void;
}

/** A game in progress. Mounted per game, so the menu drawer starts closed each time. */
function GameTable({ state, dispatch, onReset }: GameTableProps) {
  const [menuOpen, setMenuOpen] = useState(false);

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
    <View style={styles.table}>
      {half('top')}
      {/* Middle band, outside both tap areas: [reset] ... [menu]. The menu roundel
          belongs to the drawer overlay; this slot just keeps its place. */}
      <View style={styles.band} testID="middle-band">
        <RoundImageButton
          source={RESTART_ART}
          accessibilityLabel="Reset game"
          onPress={onReset}
          size={BAND_BUTTON_SIZE}
        />
        <View style={styles.bandButton} />
      </View>
      {half('bottom')}
      {/* The halves are equal, so this overlay's vertical centre is the band. */}
      <SideDrawer open={menuOpen} onOpenChange={setMenuOpen} buttonSize={BAND_BUTTON_SIZE}>
        <View style={styles.drawerRow}>
          <RoundDisplay round={state.round} />
          <GameClock startedAt={state.startedAt} running={menuOpen} />
        </View>
      </SideDrawer>
    </View>
  );
}

const BAND_BUTTON_SIZE = 64;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  table: { flex: 1 },
  band: {
    height: BAND_BUTTON_SIZE,
    marginVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bandButton: { width: BAND_BUTTON_SIZE, height: BAND_BUTTON_SIZE },
  drawerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxl },
});
