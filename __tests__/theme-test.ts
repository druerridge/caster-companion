import { contrastRatio } from '@/theme/contrast';
import { auraColors, colors } from '@/theme/tokens';

describe('palette readability (WCAG AA)', () => {
  it.each([
    ['text on background', colors.text, colors.background],
    ['text on surface', colors.text, colors.surface],
    ['text on raised surface', colors.text, colors.surfaceRaised],
    ['muted text on background', colors.textMuted, colors.background],
    ['muted text on surface', colors.textMuted, colors.surface],
  ])('%s is at least 4.5:1', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(Object.entries(auraColors))(
    '%s aura accent stands out from surface (3:1)',
    (_aura, c) => {
      expect(contrastRatio(c, colors.surface)).toBeGreaterThanOrEqual(3);
    },
  );

  it('computes the known black/white ratio', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });
});
