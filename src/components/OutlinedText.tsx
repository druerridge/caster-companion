import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';

import { colors } from '@/theme/tokens';

interface OutlinedTextProps {
  children: string | number;
  style?: StyleProp<TextStyle>;
  /** Outline thickness in dp. */
  outline?: number;
  outlineColor?: string;
  testID?: string;
}

// Eight compass offsets give a solid outline; React Native has no text stroke.
const DIRECTIONS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
] as const;

/** Text with a thick cartoon outline, drawn as offset copies behind it. */
export function OutlinedText({
  children,
  style,
  outline = 3,
  outlineColor = colors.ink,
  testID,
}: OutlinedTextProps) {
  return (
    <View>
      <View
        style={StyleSheet.absoluteFill}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
      >
        {DIRECTIONS.map(([dx, dy]) => (
          <Text
            key={`${dx},${dy}`}
            style={[
              style,
              styles.copy,
              {
                color: outlineColor,
                transform: [{ translateX: dx * outline }, { translateY: dy * outline }],
              },
            ]}
          >
            {children}
          </Text>
        ))}
      </View>
      <Text style={style} testID={testID}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  copy: { position: 'absolute', left: 0, right: 0 },
});
