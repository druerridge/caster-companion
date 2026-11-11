import * as Linking from 'expo-linking';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
  type TextInputInstance,
} from 'react-native';

import { CardFrame } from '@/components/CardFrame';
import { useDialog } from '@/components/dialog/DialogProvider';
import { TagButton } from '@/components/TagButton';
import {
  MAX_QUESTION_CHARS,
  errorCopy,
  handoffUrl,
  validateQuestion,
  type AskError,
  type HandoffProvider,
} from '@/domain/rulings';
import { colors, fontSizes, radii, spacing, strokes } from '@/theme/tokens';

import { askRuling } from './askClient';

type Turn = { id: number; question: string } & (
  { status: 'loading' } | { status: 'answer'; text: string } | { status: 'error'; error: AskError }
);

/** Android needs the screen to settle before focus() will raise the keyboard. */
const FOCUS_DELAY_MS = 150;

/**
 * Rules Lookup (feature 7, D23/D25): this session's questions and answers above
 * an always-ready question box. The box takes focus whenever the screen does.
 */
export function RulesChat() {
  const dialog = useDialog();
  const input = useRef<TextInputInstance>(null);
  const scroll = useRef<ScrollViewInstance>(null);
  const nextId = useRef(1);
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const check = validateQuestion(draft);
  const busy = turns.some((t) => t.status === 'loading');

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => input.current?.focus(), FOCUS_DELAY_MS);
      return () => {
        clearTimeout(timer);
        input.current?.blur(); // don't carry the keyboard onto the tracker
      };
    }, []),
  );

  const ask = async () => {
    if (!check.ok || busy) return;
    const { question } = check;
    const id = nextId.current++;
    setDraft('');
    setTurns((all) => [...all, { id, question, status: 'loading' }]);
    const outcome = await askRuling(question);
    setTurns((all) =>
      all.map((t) =>
        t.id !== id
          ? t
          : outcome.kind === 'answer'
            ? { id, question, status: 'answer', text: outcome.text }
            : { id, question, status: 'error', error: outcome.error },
      ),
    );
  };

  const handoff = (provider: HandoffProvider, name: string, question: string) => {
    Linking.openURL(handoffUrl(provider, question)).catch(() => {
      void dialog.alert({
        title: "Couldn't open link",
        message: `No app on this device could open ${name}.`,
      });
    });
  };

  return (
    <>
      <CardFrame aura="water" style={styles.log}>
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={styles.logContent}
        >
          {turns.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.text}>
                Ask anything about MetaZoo rules. Answers come from the official rulebook and
                errata.
              </Text>
              <Text style={styles.muted}>
                Unofficial AI answers: check the rulebook when it matters. Questions are sent to
                Google&apos;s Gemini.
              </Text>
            </View>
          ) : (
            turns.map((turn) => (
              <View key={turn.id} style={styles.turn}>
                <Text style={styles.question}>{turn.question}</Text>
                {turn.status === 'loading' && (
                  <ActivityIndicator
                    color={colors.accent}
                    style={styles.spinner}
                    accessibilityLabel="Waiting for an answer"
                  />
                )}
                {turn.status === 'answer' && (
                  <Text style={styles.answer} selectable testID="ask-answer">
                    {turn.text}
                  </Text>
                )}
                {turn.status === 'error' && (
                  <TurnError
                    error={turn.error}
                    onHandoff={(provider, name) => handoff(provider, name, turn.question)}
                  />
                )}
              </View>
            ))
          )}
        </ScrollView>
      </CardFrame>

      <View style={styles.inputRow}>
        <TextInput
          ref={input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask a rules question"
          placeholderTextColor={colors.textMuted}
          multiline
          submitBehavior="submit"
          returnKeyType="send"
          onSubmitEditing={() => void ask()}
          maxLength={MAX_QUESTION_CHARS}
          style={styles.input}
          accessibilityLabel="Ask a rules question"
          testID="ask-input"
        />
        <TagButton
          label="ASK"
          variant="primary"
          onPress={() => void ask()}
          disabled={!check.ok || busy}
          testID="ask-submit"
        />
      </View>
    </>
  );
}

function TurnError({
  error,
  onHandoff,
}: {
  error: AskError;
  onHandoff: (provider: HandoffProvider, name: string) => void;
}) {
  const copy = errorCopy(error);
  return (
    <View testID="ask-error">
      <Text style={styles.errorTitle}>{copy.title}</Text>
      <Text style={styles.text}>{copy.message}</Text>
      {copy.offerHandoff && (
        <View style={styles.handoff}>
          <TagButton
            label="CHATGPT"
            onPress={() => onHandoff('chatgpt', 'ChatGPT')}
            accessibilityLabel="Ask in ChatGPT"
            testID="handoff-chatgpt"
            style={styles.flex}
          />
          <TagButton
            label="CLAUDE"
            onPress={() => onHandoff('claude', 'Claude')}
            accessibilityLabel="Ask in Claude"
            testID="handoff-claude"
            style={styles.flex}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  log: { flex: 1 },
  logContent: { flexGrow: 1, justifyContent: 'flex-end' },
  empty: { gap: spacing.md },
  turn: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderColor: colors.border,
    borderWidth: strokes.keyline - 2,
  },
  question: {
    color: colors.accent,
    fontSize: fontSizes.body,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  answer: { color: colors.text, fontSize: fontSizes.body, lineHeight: 24 },
  spinner: { alignSelf: 'flex-start' },
  errorTitle: {
    color: colors.danger,
    fontSize: fontSizes.title,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  handoff: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: fontSizes.body,
    backgroundColor: colors.surface,
    borderColor: colors.frame,
    borderWidth: strokes.keyline - 1,
    borderRadius: radii.md,
  },
  text: { color: colors.text, fontSize: fontSizes.body },
  muted: { color: colors.textMuted, fontSize: fontSizes.caption },
});
