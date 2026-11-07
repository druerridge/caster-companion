// Design tokens: "moonlit forest" theme (D14). Cel-shaded cartoon night palette
// that evokes the card game's art direction without using any official art,
// logos or fonts.

export const colors = {
  background: '#0E1024', // night sky behind the art; also the fallback when art can't draw
  surface: '#1C1A3D', // indigo panels (tab bar, headers, card bodies)
  surfaceRaised: '#2A2760',
  border: '#3A3670',
  ink: '#0E0C18', // cartoon outline colour
  frame: '#E8E8EE', // light card-frame border
  frameIdle: '#6F6A9E', // frame of the player without priority
  priority: '#D8F25A', // moon-lime: frame + badge of the player who goes first
  onPriority: '#0E0C18',
  accent: '#96E1FF', // moonlight blue: active tab, glyphs
  text: '#FFFFFF',
  textMuted: '#C2BEE6',
  danger: '#FF7A6B',
  onDanger: '#0E0C18',
  // Translucent layers over the background art.
  scrim: 'rgba(8, 8, 24, 0.45)', // inside score frames, keeps numerals legible
  scrimStrong: 'rgba(8, 8, 24, 0.72)', // behind text-heavy panels
  pressed: 'rgba(255, 255, 255, 0.10)',
  backdrop: 'rgba(6, 6, 18, 0.78)', // behind dialogs
} as const;

export type Aura = 'air' | 'dark' | 'earth' | 'fire' | 'lightning' | 'water';

export const auraColors: Record<Aura, string> = {
  air: '#A8E0EA',
  dark: '#B49CF0',
  earth: '#C9A26A',
  fire: '#FF7A5A',
  lightning: '#F5D65A',
  water: '#5FB2FF',
};

/** Bundled display face (Lilita One, OFL), embedded by the expo-font plugin. */
export const fonts = {
  display: 'Lilita One',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
} as const;

/** Thick cartoon outlines, as on the card art. */
export const strokes = {
  keyline: 4, // dark outer line
  frame: 4, // light inner border
} as const;

export const fontSizes = {
  caption: 12,
  body: 16,
  title: 20,
  heading: 28,
  display: 64,
  score: 120,
} as const;
