import { Image, Pressable, StyleSheet, type ImageSourcePropType } from 'react-native';

interface RoundImageButtonProps {
  source: ImageSourcePropType;
  accessibilityLabel: string;
  onPress: () => void;
  size?: number;
  testID?: string;
}

/** A painted roundel button (art from tools/art/gen_art.py) that squashes when pressed. */
export function RoundImageButton({
  source,
  accessibilityLabel,
  onPress,
  size = 64,
  testID,
}: RoundImageButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={8}
      testID={testID}
      style={({ pressed }) => [{ width: size, height: size }, pressed && styles.pressed]}
    >
      <Image source={source} style={styles.image} resizeMode="contain" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: '100%' },
  pressed: { transform: [{ scale: 0.9 }], opacity: 0.85 },
});
