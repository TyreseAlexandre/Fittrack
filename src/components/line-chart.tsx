import { useMemo, useState } from 'react';
import { type GestureResponderEvent, Platform, type PointerEvent, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { formatDay } from '@/lib/derived';
import { useTheme } from '@/hooks/use-theme';
import { daysBetween, type DatedValue, type ISODate } from '@/lib/stats';

export type ChartSeries = {
  key: string;
  label: string;
  color: string;
  /** `line` draws a 2px line with an end dot; `dots` draws one marker per point. */
  kind: 'line' | 'dots';
  points: DatedValue[];
};

type Props = {
  series: ChartSeries[];
  unit: string;
  height?: number;
  /** A horizontal goal line, e.g. target weight. */
  reference?: { value: number; label: string };
};

const PAD = { left: 44, right: 16, top: 12, bottom: 24 };
const TOOLTIP_WIDTH = 168;
// SVG text doesn't inherit the page font on web; native already uses the system font.
const AXIS_FONT = Platform.select({ web: 'system-ui, -apple-system, "Segoe UI", sans-serif' });

/**
 * Time-series line chart with a crosshair tooltip (hover on web, drag on touch).
 * A legend appears for two or more series; a single series is named by its section title.
 */
export function LineChart({ series, unit, height = 220, reference }: Props) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<ISODate | null>(null);

  const geometry = useMemo(() => {
    const dates = [...new Set(series.flatMap((s) => s.points.map((p) => p.date)))].sort();
    if (dates.length === 0 || width === 0) return null;
    const values = series.flatMap((s) => s.points.map((p) => p.value));
    if (reference) values.push(reference.value);
    const { min, max, step } = niceScale(Math.min(...values), Math.max(...values));
    const first = dates[0];
    const span = Math.max(1, daysBetween(first, dates.at(-1)!));
    const plotW = width - PAD.left - PAD.right;
    const plotH = height - PAD.top - PAD.bottom;
    const x = (date: ISODate) =>
      dates.length === 1 ? PAD.left + plotW / 2 : PAD.left + (daysBetween(first, date) / span) * plotW;
    const y = (value: number) => PAD.top + (1 - (value - min) / (max - min)) * plotH;
    const ticks: number[] = [];
    for (let v = min; v <= max + step / 2; v += step) ticks.push(v);
    return { dates, x, y, ticks };
  }, [series, width, height, reference]);

  function pick(locationX: number) {
    if (!geometry) return;
    let nearest = geometry.dates[0];
    for (const date of geometry.dates) {
      if (Math.abs(geometry.x(date) - locationX) < Math.abs(geometry.x(nearest) - locationX)) nearest = date;
    }
    setActive(nearest);
  }

  const activeX = geometry && active ? geometry.x(active) : null;

  return (
    <View style={{ gap: Spacing.two }}>
      {series.length >= 2 ? (
        <View style={styles.legend}>
          {series.map((s) => (
            <View key={s.key} style={styles.legendItem}>
              <View style={s.kind === 'line' ? [styles.keyLine, { backgroundColor: s.color }] : [styles.keyDot, { backgroundColor: s.color }]} />
              <ThemedText type="caption" themeColor="textSecondary">
                {s.label}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}

      <View
        style={{ height }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onPointerMove={(e: PointerEvent) => pick(e.nativeEvent.offsetX)}
        onPointerLeave={() => setActive(null)}
        onStartShouldSetResponder={() => true}
        onResponderGrant={(e: GestureResponderEvent) => pick(e.nativeEvent.locationX)}
        onResponderMove={(e: GestureResponderEvent) => pick(e.nativeEvent.locationX)}
        onResponderRelease={() => setActive(null)}
        accessibilityLabel={`Chart of ${series.map((s) => s.label).join(' and ')}`}>
        {geometry ? (
          <Svg width={width} height={height} pointerEvents="none">
            {geometry.ticks.map((t) => (
              <Line
                key={`grid-${t}`}
                x1={PAD.left}
                x2={width - PAD.right}
                y1={geometry.y(t)}
                y2={geometry.y(t)}
                stroke={t === geometry.ticks[0] ? theme.axis : theme.grid}
                strokeWidth={1}
              />
            ))}
            {geometry.ticks.map((t) => (
              <SvgText
                key={`tick-${t}`}
                x={PAD.left - 8}
                y={geometry.y(t) + 4}
                fontSize={11}
                fontFamily={AXIS_FONT}
                fill={theme.textMuted}
                textAnchor="end">
                {formatValue(t)}
              </SvgText>
            ))}
            <SvgText x={PAD.left} y={height - 6} fontSize={11} fontFamily={AXIS_FONT} fill={theme.textMuted} textAnchor="start">
              {formatDay(geometry.dates[0])}
            </SvgText>
            {geometry.dates.length > 1 ? (
              <SvgText
                x={width - PAD.right}
                y={height - 6}
                fontSize={11}
                fontFamily={AXIS_FONT}
                fill={theme.textMuted}
                textAnchor="end">
                {formatDay(geometry.dates.at(-1)!)}
              </SvgText>
            ) : null}

            {reference ? (
              <>
                <Line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={geometry.y(reference.value)}
                  y2={geometry.y(reference.value)}
                  stroke={theme.textSecondary}
                  strokeWidth={1}
                />
                <SvgText
                  x={width - PAD.right}
                  y={geometry.y(reference.value) - 6}
                  fontSize={11}
                  fontFamily={AXIS_FONT}
                  fill={theme.textSecondary}
                  textAnchor="end">
                  {reference.label}
                </SvgText>
              </>
            ) : null}

            {activeX !== null ? (
              <Line x1={activeX} x2={activeX} y1={PAD.top} y2={height - PAD.bottom} stroke={theme.axis} strokeWidth={1} />
            ) : null}

            {series.map((s) =>
              s.kind === 'line' ? (
                <Path
                  key={s.key}
                  d={s.points.map((p, i) => `${i ? 'L' : 'M'}${geometry.x(p.date)},${geometry.y(p.value)}`).join(' ')}
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  fill="none"
                />
              ) : null,
            )}

            {series.flatMap((s) => {
              const points = s.kind === 'dots' ? s.points : s.points.slice(-1);
              return points.map((p) => (
                <Circle
                  key={`${s.key}-${p.date}`}
                  cx={geometry.x(p.date)}
                  cy={geometry.y(p.value)}
                  r={p.date === active ? 5 : 4}
                  fill={s.color}
                  stroke={theme.backgroundElement}
                  strokeWidth={2}
                />
              ));
            })}

            {active
              ? series.map((s) => {
                  const p = s.points.find((pt) => pt.date === active);
                  return p && s.kind === 'line' ? (
                    <Circle
                      key={`active-${s.key}`}
                      cx={geometry.x(p.date)}
                      cy={geometry.y(p.value)}
                      r={5}
                      fill={s.color}
                      stroke={theme.backgroundElement}
                      strokeWidth={2}
                    />
                  ) : null;
                })
              : null}
          </Svg>
        ) : null}

        {geometry && active && activeX !== null ? (
          <View
            pointerEvents="none"
            style={[
              styles.tooltip,
              {
                left: Math.min(Math.max(0, activeX - TOOLTIP_WIDTH / 2), width - TOOLTIP_WIDTH),
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
              },
            ]}>
            <ThemedText type="caption" themeColor="textSecondary">
              {formatDay(active, true)}
            </ThemedText>
            {series.map((s) => {
              const p = s.points.find((pt) => pt.date === active);
              return p ? (
                <View key={s.key} style={styles.legendItem}>
                  <View style={[styles.keyDot, { backgroundColor: s.color }]} />
                  <ThemedText type="caption" themeColor="textSecondary" style={{ flex: 1 }}>
                    {s.label}
                  </ThemedText>
                  <ThemedText type="smallBold">
                    {formatValue(p.value)} {unit}
                  </ThemedText>
                </View>
              ) : null;
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function formatValue(v: number): string {
  return String(Number(v.toFixed(1)));
}

/** Round axis bounds to a "nice" step (1, 2, 5 × 10^n) so tick labels are readable. */
function niceScale(lo: number, hi: number, count = 4) {
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const raw = (hi - lo) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const n = raw / magnitude;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * magnitude;
  return { min: Math.floor(lo / step) * step, max: Math.ceil(hi / step) * step, step };
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  keyLine: {
    width: 14,
    height: 2,
    borderRadius: 1,
  },
  keyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tooltip: {
    position: 'absolute',
    top: 0,
    width: TOOLTIP_WIDTH,
    padding: Spacing.two,
    borderRadius: Radius.small,
    borderWidth: 1,
    gap: Spacing.half,
  },
});
