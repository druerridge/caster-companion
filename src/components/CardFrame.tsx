import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { auraColors, colors, fontSizes, radii, spacing, type Aura } from '@/theme/tokens';

interface CardFrameProps {
  title?: string;
  aura?: Aura;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Double-bordered panel with an optional title banner, evoking a card frame. */
export function CardFrame({ title, aura, children, style }: CardFrameProps) {
  const accent = aura ? auraColors[aura] : colors.frame;
  return (
    <View style={[styles.outer, { borderColor: accent }, style]}>
      <View style={styles.inner}>
        {title !== undefined && (
          <View style={[styles.banner, { borderBottomColor: accent }]}>
            <Text style={styles.title}>{title}</Text>
          </View>
        )}
        <View style={styles.body}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderWidth: 2,
    borderRadius: radii.lg,
    padding: spacing.xs,
    backgroundColor: colors.surface,
  },
  inner: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.frameInner,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  banner: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceRaised,
    borderBottomWidth: 1,
  },
  title: {
    color: colors.text,
    fontSize: fontSizes.title,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  body: {
    flex: 1,
    padding: spacing.md,
  },
});
