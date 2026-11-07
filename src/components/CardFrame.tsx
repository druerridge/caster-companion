import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { CartoonFrame } from '@/components/CartoonFrame';
import { OutlinedText } from '@/components/OutlinedText';
import { auraColors, colors, fonts, fontSizes, spacing, strokes, type Aura } from '@/theme/tokens';

interface CardFrameProps {
  title?: string;
  aura?: Aura;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Card-style panel with an optional title banner, tinted by an Aura colour. */
export function CardFrame({ title, aura, children, style }: CardFrameProps) {
  const accent = aura ? auraColors[aura] : colors.accent;
  return (
    <CartoonFrame style={style} fill={colors.scrimStrong}>
      {title !== undefined && (
        <View style={[styles.banner, { borderBottomColor: accent }]}>
          <OutlinedText style={styles.title} outline={2}>
            {title}
          </OutlinedText>
        </View>
      )}
      <View style={styles.body}>{children}</View>
    </CartoonFrame>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: strokes.keyline,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: fontSizes.heading,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  body: {
    flex: 1,
    padding: spacing.md,
  },
});
