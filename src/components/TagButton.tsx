import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, fontSizes, radii, spacing, strokes } from '@/theme/tokens';

export type TagVariant = 'primary' | 'secondary' | 'danger';

interface TagButtonProps {
  label: string;
  onPress: () => void;
  variant?: TagVariant;
  accessibilityLabel?: string;
  disabled?: boolean;
  testID?: string;
  hitSlop?: number;
  style?: StyleProp<ViewStyle>;
}

const FILL: Record<TagVariant, string> = {
  primary: colors.priority,
  secondary: colors.surfaceRaised,
  danger: colors.danger,
};

const TEXT: Record<TagVariant, string> = {
  primary: colors.onPriority,
  secondary: colors.text,
  danger: colors.onDanger,
};

/** Cartoon tag button: ink outline and a chunky bottom edge that squashes when pressed. */
export function TagButton({
  label,
  onPress,
  variant = 'secondary',
  accessibilityLabel,
  disabled,
  testID,
  hitSlop,
  style,
}: TagButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={hitSlop}
      testID={testID}
      style={({ pressed }) => [
        styles.tag,
        { backgroundColor: FILL[variant] },
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.label, { color: TEXT[variant] }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tag: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    borderWidth: strokes.keyline - 1,
    borderBottomWidth: strokes.keyline + 3,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { borderBottomWidth: strokes.keyline - 1, marginTop: 4 },
  label: { fontFamily: fonts.display, fontSize: fontSizes.title, letterSpacing: 1 },
});
