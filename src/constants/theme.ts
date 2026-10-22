/**
 * Colors for light and dark mode. Each mode is chosen deliberately rather
 * than auto-inverted; chart colors come from a colorblind-validated palette.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0b0b0b',
    textSecondary: '#52514e',
    textMuted: '#6f6d68',
    background: '#f9f9f7',
    backgroundElement: '#ffffff',
    backgroundSelected: '#ecebe6',
    border: 'rgba(11,11,11,0.10)',
    grid: '#e1e0d9',
    axis: '#c3c2b7',
    tint: '#2a78d6',
    tintPressed: '#256abf',
    onTint: '#ffffff',
    dataMuted: '#a9a7a0',
    good: '#0ca30c',
    goodText: '#006300',
    warning: '#fab219',
    critical: '#d03b3b',
    heat: ['#cde2fb', '#86b6ef', '#3987e5', '#1c5cab'],
  },
  dark: {
    text: '#f0efec',
    textSecondary: '#c3c2b7',
    textMuted: '#9a988f',
    background: '#0d0d0d',
    backgroundElement: '#1a1a19',
    backgroundSelected: '#2c2c2a',
    border: 'rgba(255,255,255,0.10)',
    grid: '#2c2c2a',
    axis: '#383835',
    tint: '#3987e5',
    tintPressed: '#2a78d6',
    onTint: '#ffffff',
    dataMuted: '#6b6a64',
    good: '#0ca30c',
    goodText: '#0ca30c',
    warning: '#fab219',
    critical: '#e66767',
    heat: ['#104281', '#1c5cab', '#2a78d6', '#6da7ec'],
  },
} as const;

export type ThemeColor = {
  [K in keyof typeof Colors.light]: (typeof Colors.light)[K] extends string ? K : never;
}[keyof typeof Colors.light];

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = { small: 8, medium: 12, large: 16 } as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
