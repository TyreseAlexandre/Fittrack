import { Text, View } from 'react-native';
import Svg, { Defs, G, LinearGradient, Rect, Stop } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Brand colors are the same in light and dark mode so the mark is recognizable everywhere. */
export const Brand = { from: '#3d8cea', to: '#1c5cab' } as const;

/** The app mark: a dumbbell tilted upward, on a blue tile. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <View role="img" aria-label="FitTrack logo">
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Defs>
          <LinearGradient id="fittrack-logo-bg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={Brand.from} />
            <Stop offset="1" stopColor={Brand.to} />
          </LinearGradient>
        </Defs>
        <Rect width={64} height={64} rx={16} fill="url(#fittrack-logo-bg)" />
        <G transform="rotate(-35 32 32)" fill="#ffffff">
          <Rect x={18} y={30} width={28} height={4} rx={2} />
          <Rect x={18} y={20} width={5} height={24} rx={2} />
          <Rect x={41} y={20} width={5} height={24} rx={2} />
          <Rect x={12} y={25} width={4} height={14} rx={2} />
          <Rect x={48} y={25} width={4} height={14} rx={2} />
        </G>
      </Svg>
    </View>
  );
}

/** Mark plus "FitTrack" wordmark; `size` is the mark's height. */
export function Logo({ size = 32 }: { size?: number }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
      <LogoMark size={size} />
      <ThemedText style={{ fontSize: Math.round(size * 0.66), lineHeight: size, fontWeight: 800, letterSpacing: -0.4 }}>
        Fit<Text style={{ color: theme.tint }}>Track</Text>
      </ThemedText>
    </View>
  );
}
