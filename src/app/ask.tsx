import * as Linking from 'expo-linking';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CardFrame } from '@/components/CardFrame';
import { useDialog } from '@/components/dialog/DialogProvider';
import { TagButton } from '@/components/TagButton';
import { ThemedBackground } from '@/components/ThemedBackground';
import {
  MAX_QUESTION_CHARS,
  errorCopy,
  handoffUrl,
  validateQuestion,
  type AskError,
  type HandoffProvider,
} from '@/domain/rulings';
import { askRuling } from '@/features/rules/askClient';
import { colors, fontSizes, radii, spacing, strokes } from '@/theme/tokens';

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'answer'; question: string; text: string }
  | { status: 'error'; error: AskError };

/** Rules Lookup (feature 7, D23): ask a ruling, answered by Gemini via the rules Worker. */
export default function AskScreen() {
  const dialog = useDialog();
  const [question, setQuestion] = useState('');
  const [state, setState] = useState<State>({ status: 'idle' });
  const check = validateQuestion(question);
  const loading = state.status === 'loading';

  const ask = async () => {
    if (!check.ok || loading) return;
    setState({ status: 'loading' });
    const outcome = await askRuling(check.question);
    setState(
      outcome.kind === 'answer'
        ? { status: 'answer', question: check.question, text: outcome.text }
        : { status: 'error', error: outcome.error },
    );
  };

  const handoff = (provider: HandoffProvider, name: string) => {
    Linking.openURL(handoffUrl(provider, question)).catch(() => {
      void dialog.alert({
        title: "Couldn't open link",
        message: `No app on this device could open ${name}.`,
      });
    });
  };

  const copy = state.status === 'error' ? errorCopy(state.error) : null;

  return (
    <ThemedBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
          <CardFrame aura="water">
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder="e.g. What's the difference between give and gain Influence?"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={MAX_QUESTION_CHARS}
              style={styles.input}
              accessibilityLabel="Your rules question"
              testID="ask-input"
            />
            <View style={styles.row}>
              <Text style={styles.muted}>
                {question.trim().length}/{MAX_QUESTION_CHARS}
              </Text>
              <TagButton
                label={loading ? 'ASKING…' : 'ASK'}
                variant="primary"
                onPress={() => void ask()}
                disabled={!check.ok || loading}
                accessibilityLabel="Ask"
                testID="ask-submit"
              />
            </View>

            {loading && (
              <ActivityIndicator color={colors.accent} size="large" style={styles.spinner} />
            )}

            {state.status === 'answer' && (
              <View style={styles.answer} testID="ask-answer">
                <Text style={styles.answerQuestion}>{state.question}</Text>
                <Text style={styles.answerText} selectable>
                  {state.text}
                </Text>
              </View>
            )}

            {copy && (
              <View style={styles.answer} testID="ask-error">
                <Text style={styles.errorTitle}>{copy.title}</Text>
                <Text style={styles.text}>{copy.message}</Text>
                {copy.offerHandoff && (
                  <View style={styles.handoff}>
                    <TagButton
                      label="CHATGPT"
                      onPress={() => handoff('chatgpt', 'ChatGPT')}
                      accessibilityLabel="Ask in ChatGPT"
                      testID="handoff-chatgpt"
                      style={styles.flex}
                    />
                    <TagButton
                      label="CLAUDE"
                      onPress={() => handoff('claude', 'Claude')}
                      accessibilityLabel="Ask in Claude"
                      testID="handoff-claude"
                      style={styles.flex}
                    />
                  </View>
                )}
              </View>
            )}

            <Text style={[styles.muted, styles.footer]}>
              Unofficial AI answer: check the rulebook when it matters. Questions are sent to
              Google&apos;s Gemini.
            </Text>
          </CardFrame>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flexGrow: 1, padding: spacing.lg },
  input: {
    minHeight: 96,
    maxHeight: 200,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSizes.body,
    textAlignVertical: 'top',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: strokes.keyline - 2,
    borderRadius: radii.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  spinner: { marginTop: spacing.xl },
  answer: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderColor: colors.border,
    borderWidth: strokes.keyline - 2,
  },
  answerQuestion: {
    color: colors.textMuted,
    fontSize: fontSizes.caption,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  answerText: { color: colors.text, fontSize: fontSizes.body, lineHeight: 24 },
  errorTitle: {
    color: colors.danger,
    fontSize: fontSizes.title,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  handoff: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  text: { color: colors.text, fontSize: fontSizes.body },
  muted: { color: colors.textMuted, fontSize: fontSizes.caption },
  footer: { marginTop: spacing.lg },
});
