import { Platform, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Polyline, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { Brand } from '@/components/logo';
import { useTheme } from '@/hooks/use-theme';

// SVG text doesn't inherit the page font on web; native already uses the system font.
const SVG_FONT = Platform.select({ web: 'system-ui, -apple-system, "Segoe UI", sans-serif' });

/** Four-point sparkle centered on (x, y). */
function sparkle(x: number, y: number, r: number) {
  return `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`;
}

export type SpotArt = 'barbell' | 'trophy' | 'target' | 'chart' | 'habits';

/** Small decorative picture for empty states and banners. Colors follow the theme. */
export function SpotIllustration({ art, size = 96 }: { art: SpotArt; size?: number }) {
  const theme = useTheme();
  const [soft, mid, strong, deep] = theme.heat;

  return (
    <View aria-hidden>
      <Svg width={size} height={(size * 72) / 96} viewBox="0 0 96 72">
        <Circle cx={48} cy={38} r={30} fill={soft} opacity={0.7} />
        {art === 'barbell' ? (
          <G>
            <Rect x={10} y={35} width={76} height={3} rx={1.5} fill={theme.textMuted} />
            <Rect x={27} y={20} width={7} height={33} rx={2} fill={strong} />
            <Rect x={62} y={20} width={7} height={33} rx={2} fill={strong} />
            <Rect x={20} y={25} width={6} height={23} rx={2} fill={mid} />
            <Rect x={70} y={25} width={6} height={23} rx={2} fill={mid} />
            <Rect x={35} y={33} width={3} height={7} rx={1} fill={deep} />
            <Rect x={58} y={33} width={3} height={7} rx={1} fill={deep} />
          </G>
        ) : null}
        {art === 'trophy' ? (
          <G>
            <Path d="M34 21h-4a5 5 0 0 0 0 10h3M62 21h4a5 5 0 0 1 0 10h-3" stroke={theme.warning} strokeWidth={3} strokeLinecap="round" fill="none" />
            <Path d="M34 16h28v12a14 14 0 0 1-28 0z" fill={theme.warning} />
            <Path d={sparkle(48, 27, 5)} fill="#ffffff" opacity={0.85} />
            <Rect x={45} y={41} width={6} height={7} fill={theme.warning} />
            <Rect x={37} y={48} width={22} height={7} rx={2} fill={deep} />
          </G>
        ) : null}
        {art === 'target' ? (
          <G>
            <Circle cx={42} cy={40} r={22} fill={strong} />
            <Circle cx={42} cy={40} r={15} fill={theme.backgroundElement} />
            <Circle cx={42} cy={40} r={9} fill={strong} />
            <Circle cx={42} cy={40} r={3.5} fill={theme.warning} />
            <Line x1={43} y1={39} x2={74} y2={14} stroke={theme.text} strokeWidth={3} strokeLinecap="round" />
            <Path d="M74 14l8-2M74 14l2-8" stroke={theme.warning} strokeWidth={3} strokeLinecap="round" />
          </G>
        ) : null}
        {art === 'chart' ? (
          <G>
            <Rect x={16} y={14} width={64} height={44} rx={6} fill={theme.backgroundElement} stroke={theme.border} />
            <Rect x={24} y={42} width={8} height={10} rx={2} fill={mid} />
            <Rect x={36} y={36} width={8} height={16} rx={2} fill={mid} />
            <Rect x={48} y={30} width={8} height={22} rx={2} fill={strong} />
            <Rect x={60} y={22} width={8} height={30} rx={2} fill={deep} />
            <Polyline points="28,36 40,30 52,24 64,15" stroke={theme.warning} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Circle cx={64} cy={15} r={3.5} fill={theme.warning} />
          </G>
        ) : null}
        {art === 'habits' ? (
          <G>
            <Rect x={18} y={14} width={60} height={50} rx={6} fill={theme.backgroundElement} stroke={theme.border} />
            {[1, 2, 0, 3, 2, 3, 1, 3, 3, 0, 2, 3].map((level, i) => (
              <Rect
                key={i}
                x={24 + (i % 4) * 13}
                y={20 + Math.floor(i / 4) * 13}
                width={10}
                height={10}
                rx={2}
                fill={level === 0 ? theme.backgroundSelected : theme.heat[level]}
              />
            ))}
            <Circle cx={76} cy={58} r={10} fill={theme.good} />
            <Path d="M71 58l3.5 3.5 6.5-7" stroke="#ffffff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </G>
        ) : null}
        <Path d={sparkle(84, 14, 5)} fill={theme.warning} />
        <Path d={sparkle(12, 20, 3.5)} fill={mid} />
      </Svg>
    </View>
  );
}

const TREND = [
  [28, 138],
  [78, 124],
  [128, 130],
  [178, 100],
  [228, 94],
  [278, 64],
  [322, 44],
] as const;

/** Wide brand banner: a lifting trend that climbs to a new PR. */
export function HeroIllustration() {
  return (
    // Capped height on wide screens: the drawing stays centered and the backdrop extends sideways.
    <View aria-hidden style={{ width: '100%', aspectRatio: 2, maxHeight: 220, borderRadius: 20, overflow: 'hidden' }}>
      <Svg width="100%" height="100%" viewBox="0 0 360 180" preserveAspectRatio="xMidYMid meet">
        <Defs>
          <LinearGradient id="fittrack-hero-bg" gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={360} y2={180}>
            <Stop offset="0" stopColor={Brand.from} />
            <Stop offset="1" stopColor={Brand.to} />
          </LinearGradient>
        </Defs>
        <Rect x={-600} width={1560} height={180} fill="url(#fittrack-hero-bg)" />

        {/* Weight plates in the background */}
        <Circle cx={36} cy={30} r={52} fill="none" stroke="#ffffff" strokeOpacity={0.08} strokeWidth={14} />
        <Circle cx={36} cy={30} r={22} fill="none" stroke="#ffffff" strokeOpacity={0.08} strokeWidth={8} />
        <Circle cx={330} cy={176} r={40} fill="none" stroke="#ffffff" strokeOpacity={0.08} strokeWidth={12} />

        {[60, 105, 150].map((y) => (
          <Line key={y} x1={-600} y1={y} x2={960} y2={y} stroke="#ffffff" strokeOpacity={0.12} strokeDasharray="4 6" />
        ))}

        {TREND.map(([x, y], i) => (
          <Rect key={x} x={x - 12} y={y + 12} width={24} height={180 - y} rx={5} fill="#ffffff" opacity={0.1 + i * 0.03} />
        ))}

        <Polyline
          points={TREND.map(([x, y]) => `${x},${y}`).join(' ')}
          stroke="#ffffff"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {TREND.slice(0, -1).map(([x, y]) => (
          <Circle key={x} cx={x} cy={y} r={4.5} fill={Brand.to} stroke="#ffffff" strokeWidth={2.5} />
        ))}

        {/* The new personal record */}
        <Circle cx={322} cy={44} r={14} fill="#fab219" opacity={0.3} />
        <Circle cx={322} cy={44} r={7} fill="#fab219" stroke="#ffffff" strokeWidth={3} />
        <Rect x={262} y={14} width={38} height={22} rx={11} fill="#fab219" />
        <SvgText x={281} y={29.5} fontSize={13} fontWeight="800" fontFamily={SVG_FONT} fill="#3a2600" textAnchor="middle">
          PR
        </SvgText>

        <Path d={sparkle(344, 16, 7)} fill="#ffffff" />
        <Path d={sparkle(232, 40, 4)} fill="#ffffff" opacity={0.7} />
        <Path d={sparkle(120, 84, 3.5)} fill="#ffffff" opacity={0.5} />
      </Svg>
    </View>
  );
}
