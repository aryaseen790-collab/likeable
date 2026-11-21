// Colours from the website's design system (src/styles/global.css), checked for
// WCAG AA contrast: text ≥ 4.5:1 and UI parts ≥ 3:1 on their backgrounds (see theme.test.ts).
import { useColorScheme } from 'react-native';
import { useSettings } from './store';

export const palettes = {
  light: {
    bg: '#f6f7fb', surface: '#ffffff', surface2: '#eef1fa', border: '#d5d9ea', borderStrong: '#7b819f',
    heading: '#0d1030', text: '#2a2f4d', muted: '#565c7c', accent: '#2952e8', accentText: '#ffffff', accentSoft: '#e6ecff',
    good: '#047857', average: '#a14a05', low: '#be123c', excellent: '#1d4ed8', focus: '#7c4dff', danger: '#be123c',
    ringTrack: '#e3e7f5', overlay: 'rgba(13,16,48,0.45)',
  },
  dark: {
    bg: '#07061a', surface: '#121133', surface2: '#1d1c48', border: '#2e2d5e', borderStrong: '#6f75a0',
    heading: '#ffffff', text: '#e4e7fb', muted: '#a9afd2', accent: '#7f9dff', accentText: '#07061a', accentSoft: '#1f2556',
    good: '#34d399', average: '#fbbf24', low: '#fb7185', excellent: '#93b4ff', focus: '#c4a8ff', danger: '#fb7185',
    ringTrack: '#24234f', overlay: 'rgba(0,0,0,0.6)',
  },
};
export type Palette = typeof palettes.light;
export type Scheme = keyof typeof palettes;

export function useTheme(): { c: Palette; scheme: Scheme } {
  const system = useColorScheme();
  const { theme } = useSettings();
  const scheme: Scheme = theme === 'system' ? (system === 'dark' ? 'dark' : 'light') : theme;
  return { c: palettes[scheme], scheme };
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 12, md: 18, lg: 24, pill: 999 };
/** Minimum touch target (Apple HIG 44pt; Material 48dp). */
export const TOUCH = 48;
