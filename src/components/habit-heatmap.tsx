import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { formatDay, heatmapDays } from '@/lib/derived';
import { useTheme } from '@/hooks/use-theme';
import type { ISODate } from '@/lib/stats';

const CELL = 14;
const GAP = 3;

/**
 * GitHub-style grid of the last N weeks: each cell is a day, shaded by the
 * share of habits completed. Hover or tap a cell for the exact count.
 */
export function HabitHeatmap({
  doneByDay,
  habitCount,
  today,
  weeks = 16,
}: {
  doneByDay: Map<ISODate, number>;
  habitCount: number;
  today: ISODate;
  weeks?: number;
}) {
  const theme = useTheme();
  const [selected, setSelected] = useState<ISODate | null>(null);
  const columns = heatmapDays(today, weeks);

  function shade(day: ISODate): string {
    if (day > today) return 'transparent';
    const ratio = habitCount ? (doneByDay.get(day) ?? 0) / habitCount : 0;
    if (ratio === 0) return theme.backgroundSelected;
    return theme.heat[Math.min(3, Math.ceil(ratio * 4) - 1)];
  }

  return (
    <View style={{ gap: Spacing.two }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.grid}>
          {columns.map((week) => (
            <View key={week[0]} style={styles.column}>
              {week.map((day) => (
                <Pressable
                  key={day}
                  disabled={day > today}
                  onPress={() => setSelected(day)}
                  onHoverIn={() => setSelected(day)}
                  accessibilityLabel={`${formatDay(day)}: ${doneByDay.get(day) ?? 0} of ${habitCount} habits`}
                  hitSlop={GAP / 2}
                  style={[
                    styles.cell,
                    { backgroundColor: shade(day) },
                    day === selected && { borderWidth: 2, borderColor: theme.text },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <ThemedText type="caption" themeColor="textSecondary" style={{ flex: 1 }}>
          {selected
            ? `${formatDay(selected)}: ${doneByDay.get(selected) ?? 0} of ${habitCount} habits`
            : `Last ${weeks} weeks`}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted">
          Less
        </ThemedText>
        {[theme.backgroundSelected, ...theme.heat].map((color) => (
          <View key={color} style={[styles.cell, { backgroundColor: color }]} />
        ))}
        <ThemedText type="caption" themeColor="textMuted">
          More
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: GAP,
  },
  column: {
    gap: GAP,
  },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GAP,
  },
});
