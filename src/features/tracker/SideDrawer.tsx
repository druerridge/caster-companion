import { useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutRectangle,
} from 'react-native';

import { CartoonFrame } from '@/components/CartoonFrame';
import { RoundImageButton } from '@/components/RoundImageButton';
import { colors } from '@/theme/tokens';

const MENU_ART = require('../../../assets/images/btn-menu.png');

/** Share of the screen width the drawer rolls in. */
const DRAWER_WIDTH_RATIO = 0.3;
const MIN_DRAWER_WIDTH = 112;
const SLIDE_MS = 220;

interface SideDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Size of the menu roundel; matches the band's buttons. */
  buttonSize: number;
  /** Laid out along the drawer's length, rotated 90° so both players can read it. */
  children: ReactNode;
}

/**
 * Overlay for the tracker table: a menu roundel at the right end of the middle
 * band that rolls a full-height drawer in from the right edge. The roundel
 * rides on the drawer's left edge as a handle. While open, a tap anywhere
 * outside closes it (without scoring).
 *
 * Must sit in a container whose vertical centre is the middle band.
 */
export function SideDrawer({ open, onOpenChange, buttonSize, children }: SideDrawerProps) {
  const { width: screenWidth } = useWindowDimensions();
  const drawerWidth = Math.max(MIN_DRAWER_WIDTH, Math.round(screenWidth * DRAWER_WIDTH_RATIO));
  const [progress] = useState(() => new Animated.Value(open ? 1 : 0));
  const [content, setContent] = useState<LayoutRectangle | null>(null);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: SLIDE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, progress]);

  const drawerX = progress.interpolate({
    inputRange: [0, 1],
    // Closed: fully past the screen edge, keyline included.
    outputRange: [drawerWidth + buttonSize, 0],
  });
  const handleX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, buttonSize / 2 - drawerWidth],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {open && (
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityLabel="Dismiss menu"
          onPress={() => onOpenChange(false)}
          testID="drawer-backdrop"
        />
      )}
      <Animated.View
        style={[styles.drawer, { width: drawerWidth, transform: [{ translateX: drawerX }] }]}
        pointerEvents={open ? 'auto' : 'none'}
        accessibilityElementsHidden={!open}
        importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
        testID="side-drawer"
      >
        {/* CartoonFrame only fills its parent when told to; without flex: 1 it
            collapses to its borders (v0.5.0 showed just a white line). */}
        <CartoonFrame fill={colors.scrimStrong} style={styles.fill} testID="side-drawer-frame">
          <View
            style={styles.fill}
            onLayout={(e) => setContent(e.nativeEvent.layout)}
            testID="side-drawer-content"
          >
            {content && content.width > 0 && content.height > 0 && (
              // Swap width and height, then rotate, so the content runs along the drawer.
              <View
                testID="side-drawer-rotated"
                style={[
                  styles.rotated,
                  {
                    width: content.height,
                    height: content.width,
                    left: (content.width - content.height) / 2,
                    top: (content.height - content.width) / 2,
                  },
                ]}
              >
                {children}
              </View>
            )}
          </View>
        </CartoonFrame>
      </Animated.View>
      <Animated.View
        style={[
          styles.handle,
          { marginTop: -buttonSize / 2, transform: [{ translateX: handleX }] },
        ]}
      >
        <RoundImageButton
          source={MENU_ART}
          accessibilityLabel={open ? 'Close menu' : 'Open menu'}
          onPress={() => onOpenChange(!open)}
          size={buttonSize}
          testID="menu-button"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: { position: 'absolute', top: 0, bottom: 0, right: 0 },
  fill: { flex: 1 },
  rotated: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-90deg' }],
  },
  handle: { position: 'absolute', right: 0, top: '50%' },
});
