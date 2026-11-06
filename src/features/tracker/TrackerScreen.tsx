import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fontSizes, spacing } from '@/theme/tokens';

import { PlayerHalf } from './PlayerHalf';
import { useMissionPoints } from './useMissionPoints';

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
  const { points, increment, decrement, reset } = useMissionPoints();
  useKeepAwakeWhileFocused();

  const confirmReset = () =>
    Alert.alert('Reset game?', 'Set both mission point totals back to 0.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: reset },
    ]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <PlayerHalf
        side="top"
        flipped
        points={points.top}
        onIncrement={() => increment('top')}
        onDecrement={() => decrement('top')}
      />
      {/* Middle band: outside both tap areas. Layout: [reset] [round · timer] [priority].
          The center and right slots are reserved for features 2-4. */}
      <View style={styles.band} testID="middle-band">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset mission points"
          onPress={confirmReset}
          style={({ pressed }) => [styles.bandButton, pressed && styles.bandButtonPressed]}
        >
          <Text style={styles.resetText}>↺</Text>
        </Pressable>
        <View style={styles.bandCenter} />
        <View style={styles.bandButton} />
      </View>
      <PlayerHalf
        side="bottom"
        points={points.bottom}
        onIncrement={() => increment('bottom')}
        onDecrement={() => decrement('bottom')}
      />
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
