import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { GoalCard } from '@/components/goal-card';
import { HabitChecklist } from '@/components/habit-checklist';
import { SpotIllustration } from '@/components/illustrations';
import { StartWorkoutButton } from '@/components/start-workout-button';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Empty, ErrorText, Field, parseNumber, Pill, Row, Screen, SectionHeader, Stat } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { dayOf, evaluateGoal, formatDay, personalRecordIds, today, trainingDays, weightSeries } from '@/lib/derived';
import {
  useAllSets,
  useBodyWeights,
  useExercises,
  useGoals,
  useHabitLogs,
  useHabits,
  useLogWeight,
  useWorkouts,
} from '@/lib/queries';
import { addDays, startOfWeek } from '@/lib/stats';
import { supabase } from '@/lib/supabase';

export default function Today() {
  const day = today();
  const workouts = useWorkouts();
  const sets = useAllSets();
  const weights = useBodyWeights();
  const goals = useGoals();
  const habits = useHabits();
  const habitLogs = useHabitLogs();
  const exercises = useExercises();

  const weekStart = startOfWeek(day);
  const workoutsThisWeek = new Set(trainingDays(workouts.data ?? []).filter((d) => d >= weekStart)).size;

  const { average } = weightSeries(weights.data ?? []);
  const currentAvg = average.at(-1);
  const weekAgoAvg = average.findLast((a) => a.date <= addDays(day, -7));
  const weeklyChange = currentAvg && weekAgoAvg ? currentAvg.value - weekAgoAvg.value : null;

  const habitsDoneToday = (habitLogs.data ?? []).filter((l) => l.logged_on === day).length;

  const recentPRs = useMemo(() => {
    const all = sets.data ?? [];
    const prIds = personalRecordIds(all);
    return all.filter((s) => prIds.has(s.id)).slice(-5).reverse();
  }, [sets.data]);
  const exerciseName = (id: string) => exercises.data?.find((e) => e.id === id)?.name ?? 'Exercise';

  const activeGoals = (goals.data ?? []).filter((g) => !g.completed_at);
  const ctx = { weights: weights.data ?? [], sets: sets.data ?? [], workouts: workouts.data ?? [], today: day };

  return (
    <Screen tabs>
      <Row style={{ justifyContent: 'space-between' }}>
        <View>
          <ThemedText type="caption" themeColor="textSecondary">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </ThemedText>
          <ThemedText type="title">Today</ThemedText>
        </View>
        <Button title="Sign out" variant="ghost" small onPress={() => supabase.auth.signOut()} />
      </Row>

      <Card>
        <Row style={{ gap: Spacing.three }}>
          <View style={{ flex: 1, gap: Spacing.two }}>
            <ThemedText type="heading">{greeting()}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {workoutsThisWeek === 0
                ? 'No workouts yet this week. A good day to start.'
                : `${workoutsThisWeek} ${workoutsThisWeek === 1 ? 'workout' : 'workouts'} this week. Keep it going.`}
            </ThemedText>
            <StartWorkoutButton />
          </View>
          <SpotIllustration art="barbell" size={112} />
        </Row>
      </Card>

      <Row style={{ flexWrap: 'wrap' }}>
        <Stat label="Workouts this week" value={String(workoutsThisWeek)} />
        <Stat
          label="Weight (7-day avg)"
          value={currentAvg ? `${currentAvg.value.toFixed(1)} kg` : '—'}
          hint={weeklyChange !== null ? `${weeklyChange > 0 ? '+' : ''}${weeklyChange.toFixed(1)} kg vs last week` : undefined}
        />
        <Stat label="Habits today" value={habits.data?.length ? `${habitsDoneToday}/${habits.data.length}` : '—'} />
      </Row>

      <QuickWeighIn day={day} />

      <SectionHeader title="Habits" />
      <Card>
        <HabitChecklist day={day} />
      </Card>

      <SectionHeader
        title="Goals"
        action={<Button title="Manage" variant="ghost" small onPress={() => router.navigate('/goals')} />}
      />
      {activeGoals.length ? (
        activeGoals.map((goal) => <GoalCard key={goal.id} goal={goal} evaluation={evaluateGoal(goal, ctx)} />)
      ) : (
        <Empty art="target">No active goals. Set one on the Goals tab.</Empty>
      )}

      <SectionHeader title="Recent PRs" />
      <Card>
        {recentPRs.length ? (
          recentPRs.map((set) => (
            <Pressable
              key={set.id}
              onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: set.exercise_id } })}>
              <Row style={{ minHeight: 36 }}>
                <Pill label="PR" />
                <ThemedText type="small" style={{ flex: 1 }}>
                  {exerciseName(set.exercise_id)}
                </ThemedText>
                <ThemedText type="smallBold">
                  {set.weight_kg} kg × {set.reps}
                </ThemedText>
                <ThemedText type="caption" themeColor="textMuted" style={{ width: 56, textAlign: 'right' }}>
                  {formatDay(dayOf(set.created_at))}
                </ThemedText>
              </Row>
            </Pressable>
          ))
        ) : (
          <Empty art="trophy">Records show up here as you beat your best lifts.</Empty>
        )}
      </Card>
    </Screen>
  );
}

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

function QuickWeighIn({ day }: { day: string }) {
  const [text, setText] = useState('');
  const logWeight = useLogWeight();
  const value = parseNumber(text);

  return (
    <Card>
      <ThemedText type="smallBold">Weigh-in</ThemedText>
      <Row style={{ alignItems: 'flex-end', gap: Spacing.two }}>
        <Field
          placeholder="Weight in kg"
          value={text}
          onChangeText={setText}
          keyboardType="decimal-pad"
          inputMode="decimal"
        />
        <Button
          title="Log"
          disabled={!value}
          loading={logWeight.isPending}
          onPress={() =>
            value && logWeight.mutate({ measured_on: day, weight_kg: value }, { onSuccess: () => setText('') })
          }
        />
      </Row>
      <ErrorText error={logWeight.error} />
    </Card>
  );
}
