// Design tokens. Deliberately our own palette (ink/slate + brass) so the app
// evokes a caster card frame without imitating official MetaZoo branding.

export const colors = {
  background: '#101418',
  surface: '#1A2026',
  surfaceRaised: '#232B33',
  border: '#2E3843',
  frame: '#C8A15A', // brass card-frame accent
  frameInner: '#5E4B2A',
  text: '#ECE7DD',
  textMuted: '#A3ACB6',
  danger: '#E06A5A',
} as const;

export type Aura = 'air' | 'dark' | 'earth' | 'fire' | 'lightning' | 'water';

export const auraColors: Record<Aura, string> = {
  air: '#A8D8E0',
  dark: '#9A7FC8',
  earth: '#B08D5B',
  fire: '#E8664A',
  lightning: '#F0CC55',
  water: '#4C9BE8',
};

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
} as const;

export const fontSizes = {
  caption: 12,
  body: 16,
  title: 20,
  heading: 28,
  display: 64,
  score: 120,
} as const;
