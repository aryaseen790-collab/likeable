// WCAG 2.2 contrast: 4.5:1 for text, 3:1 for UI components and graphics.
import { palettes } from '../lib/theme';

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

describe.each(Object.entries(palettes))('%s theme', (_name, c) => {
  test.each([
    ['heading on bg', c.heading, c.bg],
    ['text on bg', c.text, c.bg],
    ['text on surface', c.text, c.surface],
    ['muted on bg', c.muted, c.bg],
    ['muted on surface', c.muted, c.surface],
    ['muted on surface2', c.muted, c.surface2],
    ['accent (links) on bg', c.accent, c.bg],
    ['accent on surface', c.accent, c.surface],
    ['button text on accent', c.accentText, c.accent],
    ['heading on selected option', c.heading, c.accentSoft],
    ['danger on surface', c.danger, c.surface],
    ['danger on bg', c.danger, c.bg],
  ])('%s ≥ 4.5:1', (_l, fg, bg) => expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5));
  test.each([
    ['input borders', c.borderStrong, c.surface],
    ['selected option border', c.accent, c.accentSoft],
  ])('%s ≥ 3:1', (_l, fg, bg) => expect(ratio(fg, bg)).toBeGreaterThanOrEqual(3));
});
