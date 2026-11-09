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

/** The full base set rulebook PDF (feature 6, D22). */
const RULEBOOK_URL =
  'https://pub-a3dc1f83df6d45f0a279ae0036773e78.r2.dev/media/legacy/downloads/metazoo-full-base-set-rules.pdf';

export default function RulesScreen() {
  const dialog = useDialog();

  // Hands the URL to Android: YouTube links go to the YouTube app if installed,
  // everything else to the browser. Tells the user if nothing can open it.
  const open = (url: string, what: string) => {
    Linking.openURL(url).catch(() => {
      void dialog.alert({
        title: "Couldn't open link",
        message: `No app on this device could open the ${what}.`,
      });
    });
  };

  return (
    <ThemedBackground>
      <View style={styles.screen}>
        <CardFrame title="Rules" aura="water" style={styles.frame}>
          <View style={styles.links}>
            <TagButton
              label="HOW TO PLAY"
              variant="primary"
              onPress={() => open(HOW_TO_PLAY_URL, 'How to Play videos')}
              accessibilityLabel="How to Play videos on YouTube"
              testID="how-to-play"
            />
            <TagButton
              label="RULEBOOK"
              variant="primary"
              onPress={() => open(RULEBOOK_URL, 'rulebook')}
              accessibilityLabel="Full rulebook (PDF)"
              testID="rulebook"
            />
          </View>
          <Text style={styles.text}>Errata and offline quick reference.</Text>
          <Text style={styles.muted}>Coming soon.</Text>
        </CardFrame>
      </View>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: spacing.lg },
  frame: { flex: 1 },
  links: { gap: spacing.md, marginBottom: spacing.lg },
  text: { color: colors.text, fontSize: fontSizes.body, marginBottom: spacing.md },
  muted: { color: colors.textMuted, fontSize: fontSizes.caption },
});
