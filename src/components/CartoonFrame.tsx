import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, strokes } from '@/theme/tokens';

interface CartoonFrameProps {
  children?: ReactNode;
  /** Colour of the light inner border (defaults to the card-frame white). */
  borderColor?: string;
  /** Fill behind the content; defaults to a translucent scrim over the art. */
  fill?: string;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Card-style panel: thick dark keyline around a light rounded border, like the
 * outlined frames in cel-shaded card art.
 */
export function CartoonFrame({
  children,
  borderColor = colors.frame,
  fill = colors.scrim,
  style,
  innerStyle,
  testID,
}: CartoonFrameProps) {
  return (
    <View style={[styles.keyline, style]} testID={testID}>
      <View style={[styles.inner, { borderColor, backgroundColor: fill }, innerStyle]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  keyline: {
    borderWidth: strokes.keyline,
    borderColor: colors.ink,
    borderRadius: radii.xl,
  },
  inner: {
    flex: 1,
    borderWidth: strokes.frame,
    borderRadius: radii.xl - strokes.keyline,
    overflow: 'hidden',
  },
});
