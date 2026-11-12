import * as Linking from 'expo-linking';
import { KeyboardAvoidingView, StyleSheet, View } from 'react-native';

import { useDialog } from '@/components/dialog/DialogProvider';
import { TagButton } from '@/components/TagButton';
import { ThemedBackground } from '@/components/ThemedBackground';
import { RULEBOOK_URL } from '@/domain/rulings';
import { RulesChat } from '@/features/rules/RulesChat';
import { ScoreBanner } from '@/features/tracker/ScoreBanner';
import { spacing } from '@/theme/tokens';

/** The official "How to Play" YouTube playlist (feature 5, D21). */
const HOW_TO_PLAY_URL =
  'https://www.youtube.com/watch?v=e1YFtKowesk&list=PLfzooD1xfFPBSr63yk_f3l-v8aPT4FxdY';

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
      <ScoreBanner />
      {/* Expo apps are edge-to-edge, so Android doesn't resize for the keyboard; pad instead.
          No vertical offset: with no header this screen starts at the window top, and the
          view's own layout y already includes the banner above it (D31). */}
      <KeyboardAvoidingView behavior="padding" style={styles.screen}>
        <View style={styles.links}>
          <TagButton
            label="HOW TO PLAY"
            variant="primary"
            onPress={() => open(HOW_TO_PLAY_URL, 'How to Play videos')}
            accessibilityLabel="How to Play videos on YouTube"
            testID="how-to-play"
            style={styles.link}
          />
          <TagButton
            label="RULEBOOK"
            variant="primary"
            onPress={() => open(RULEBOOK_URL, 'rulebook')}
            accessibilityLabel="Full rulebook"
            testID="rulebook"
            style={styles.link}
          />
        </View>
        <RulesChat />
      </KeyboardAvoidingView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: spacing.lg },
  links: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  link: { flex: 1 },
});
