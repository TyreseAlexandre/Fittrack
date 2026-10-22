import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Empty } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useHabitLogs, useHabits, useToggleHabit } from '@/lib/queries';
import { currentStreak, type ISODate } from '@/lib/stats';

/** Today's habits as tappable check rows, each with its current streak. */
export function HabitChecklist({ day }: { day: ISODate }) {
  const theme = useTheme();
  const habits = useHabits();
  const logs = useHabitLogs();
  const toggle = useToggleHabit();

  if (!habits.data?.length) return <Empty art="habits">No habits yet. Add some on the Goals tab.</Empty>;

  return (
    <View style={{ gap: Spacing.one }}>
      {habits.data.map((habit) => {
        const days = new Set((logs.data ?? []).filter((l) => l.habit_id === habit.id).map((l) => l.logged_on));
        const done = days.has(day);
        const streak = currentStreak(days, day);
        return (
          <Pressable
            key={habit.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done }}
            onPress={() => toggle.mutate({ habit_id: habit.id, logged_on: day, done: !done })}
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
            <View
              style={[
                styles.box,
                { borderColor: done ? theme.tint : theme.axis, backgroundColor: done ? theme.tint : 'transparent' },
              ]}>
              {done ? <ThemedText style={{ color: theme.onTint, fontSize: 14, lineHeight: 16 }}>✓</ThemedText> : null}
            </View>
            <ThemedText style={{ flex: 1 }} themeColor={done ? 'textSecondary' : 'text'}>
              {habit.name}
            </ThemedText>
            {streak > 0 ? (
              <ThemedText type="caption" themeColor="textSecondary">
                {streak}-day streak
              </ThemedText>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 44,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: Radius.small - 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
