import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { CartoonFrame } from '@/components/CartoonFrame';
import { OutlinedText } from '@/components/OutlinedText';
import { TagButton } from '@/components/TagButton';
import { colors, fonts, fontSizes, spacing } from '@/theme/tokens';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  /** null hides the cancel button, making it a one-button alert. */
  cancelLabel?: string | null;
  /** The confirm action loses data (e.g. reset): paint it as a warning. */
  destructive?: boolean;
}

interface ThemedDialogProps extends ConfirmOptions {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * In-style replacement for the native Alert: a card-framed panel over a dimmed
 * screen. Tapping outside or the Android back button cancels.
 */
export function ThemedDialog({
  visible,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  destructive,
  onConfirm,
  onCancel,
}: ThemedDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
      testID="dialog"
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
          accessibilityLabel="Dismiss"
          testID="dialog-backdrop"
        />
        <CartoonFrame
          fill={colors.surface}
          fitContent
          style={styles.card}
          innerStyle={styles.inner}
        >
          <View accessibilityViewIsModal>
            <View accessibilityRole="header">
              <OutlinedText style={styles.title} outline={3}>
                {title}
              </OutlinedText>
            </View>
            {message !== undefined && <Text style={styles.message}>{message}</Text>}
            <View style={styles.actions}>
              {cancelLabel !== null && (
                <TagButton label={cancelLabel} onPress={onCancel} style={styles.action} />
              )}
              <TagButton
                label={confirmLabel}
                onPress={onConfirm}
                variant={destructive ? 'danger' : 'primary'}
                style={styles.action}
              />
            </View>
          </View>
        </CartoonFrame>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: { width: '100%', maxWidth: 380 },
  inner: { padding: spacing.lg },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: fontSizes.heading },
  message: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  action: { flex: 1 },
});
