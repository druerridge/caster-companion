import * as Linking from 'expo-linking';
import { StyleSheet, Text, View } from 'react-native';

import { CardFrame } from '@/components/CardFrame';
import { useDialog } from '@/components/dialog/DialogProvider';
import { TagButton } from '@/components/TagButton';
import { ThemedBackground } from '@/components/ThemedBackground';
import { colors, fontSizes, spacing } from '@/theme/tokens';

/** The official "How to Play" YouTube playlist (feature 5, D21). */
const HOW_TO_PLAY_URL =
  'https://www.youtube.com/watch?v=e1YFtKowesk&list=PLfzooD1xfFPBSr63yk_f3l-v8aPT4FxdY';

export default function RulesScreen() {
  const dialog = useDialog();

  const openHowToPlay = () => {
    // Opens in the YouTube app if installed, otherwise the browser.
    Linking.openURL(HOW_TO_PLAY_URL).catch(() => {
      void dialog.alert({
        title: "Couldn't open video",
        message: 'No app on this device could open the How to Play videos on YouTube.',
      });
    });
  };

  return (
    <ThemedBackground>
      <View style={styles.screen}>
        <CardFrame title="Rules" aura="water" style={styles.frame}>
          <TagButton
            label="HOW TO PLAY"
            variant="primary"
            onPress={openHowToPlay}
            accessibilityLabel="How to Play videos on YouTube"
            testID="how-to-play"
          />
          <Text style={styles.caption}>Video series on YouTube. Needs internet.</Text>
          <Text style={styles.text}>Offline rulebook, errata and quick reference.</Text>
          <Text style={styles.muted}>Coming soon.</Text>
        </CardFrame>
      </View>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: spacing.lg },
  frame: { flex: 1 },
  caption: {
    color: colors.textMuted,
    fontSize: fontSizes.caption,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  text: { color: colors.text, fontSize: fontSizes.body, marginBottom: spacing.md },
  muted: { color: colors.textMuted, fontSize: fontSizes.caption },
});
