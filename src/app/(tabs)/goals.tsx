import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { ExercisePicker } from '@/components/exercise-picker';
import { GoalCard } from '@/components/goal-card';
import { HabitHeatmap } from '@/components/habit-heatmap';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, confirm, Empty, ErrorText, Field, parseNumber, Row, Screen, SectionHeader, Segmented } from '@/components/ui';
import { bestsByExercise, evaluateGoal, today, weightSeries } from '@/lib/derived';
import {
  useAllSets,
  useArchiveHabit,
  useBodyWeights,
  useCreateGoal,
  useCreateHabit,
  useDeleteGoal,
  useGoals,
  useHabitLogs,
  useHabits,
  useUpdateGoal,
  useWorkouts,
} from '@/lib/queries';
import { bestStreak, currentStreak, formatKg, type ISODate, isValidISODate } from '@/lib/stats';
import type { Exercise, GoalType } from '@/lib/types';

export default function Goals() {
  return (
    <Screen tabs>
      <ThemedText type="title">Goals</ThemedText>
      <GoalsSection />
      <HabitsSection />
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

function GoalsSection() {
  const day = today();
  const goals = useGoals();
  const weights = useBodyWeights();
  const sets = useAllSets();
  const workouts = useWorkouts();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const [creating, setCreating] = useState(false);

  const ctx = { weights: weights.data ?? [], sets: sets.data ?? [], workouts: workouts.data ?? [], today: day };
  const sorted = [...(goals.data ?? [])].sort((a, b) => Number(!!a.completed_at) - Number(!!b.completed_at));

  return (
    <>
      <SectionHeader
        title="Your goals"
        action={!creating ? <Button title="New goal" variant="ghost" small onPress={() => setCreating(true)} /> : null}
      />
      {creating ? <NewGoalForm onDone={() => setCreating(false)} /> : null}
      {goals.data?.length === 0 && !creating ? (
        <Empty art="target">Set a goal: a target weight, a lift, or how often you want to train.</Empty>
      ) : null}
      {sorted.map((goal) => {
        const evaluation = evaluateGoal(goal, ctx);
        return (
          <GoalCard key={goal.id} goal={goal} evaluation={evaluation}>
            <Row style={{ justifyContent: 'flex-end' }}>
              {!goal.completed_at && goal.type !== 'consistency' ? (
                <Button
                  title="Mark complete"
                  variant={evaluation.progress >= 1 ? 'primary' : 'secondary'}
                  small
                  onPress={() => updateGoal.mutate({ id: goal.id, completed_at: new Date().toISOString() })}
                />
              ) : null}
              <Button
                title="Delete"
                variant="danger"
                small
                onPress={async () => {
                  if (await confirm('Delete goal?', goal.title)) deleteGoal.mutate(goal.id);
                }}
              />
            </Row>
          </GoalCard>
        );
      })}
      <ErrorText error={updateGoal.error ?? deleteGoal.error} />
    </>
  );
}

function NewGoalForm({ onDone }: { onDone: () => void }) {
  const day = today();
  const weights = useBodyWeights();
  const sets = useAllSets();
  const create = useCreateGoal();

  const [type, setType] = useState<GoalType>('weight');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [picking, setPicking] = useState(false);

  const currentWeight = weightSeries(weights.data ?? []).average.at(-1)?.value ?? null;
  const bests = useMemo(() => bestsByExercise(sets.data ?? []), [sets.data]);
  const currentLift = exercise ? (bests.get(exercise.id)?.e1rm ?? 0) : 0;

  const targetValue = parseNumber(target);
  const deadlineOk = deadline === '' || (isValidISODate(deadline) && deadline > day);
  const valid =
    !!targetValue &&
    deadlineOk &&
    (type !== 'weight' || currentWeight !== null) &&
    (type !== 'lift' || !!exercise) &&
    (type !== 'consistency' || (Number.isInteger(targetValue) && targetValue <= 7));

  function submit() {
    if (!valid || !targetValue) return;
    const base = { start_date: day, target_value: targetValue, target_date: deadline || null };
    const input =
      type === 'weight'
        ? { ...base, type, title: `Reach ${formatKg(targetValue)}`, exercise_id: null, start_value: currentWeight }
        : type === 'lift'
          ? {
              ...base,
              type,
              title: `${exercise!.name}: ${formatKg(targetValue)} est. 1RM`,
              exercise_id: exercise!.id,
              start_value: Math.round(currentLift * 100) / 100,
            }
          : { ...base, type, title: `Train ${targetValue}× per week`, exercise_id: null, start_value: 0, target_date: null };
    create.mutate(input, { onSuccess: onDone });
  }

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <ThemedText type="smallBold">New goal</ThemedText>
        <Button title="Cancel" variant="ghost" small onPress={onDone} />
      </Row>
      <Segmented
        value={type}
        onChange={setType}
        options={[
          { value: 'weight', label: 'Body weight' },
          { value: 'lift', label: 'Lift' },
          { value: 'consistency', label: 'Consistency' },
        ]}
      />

      {type === 'weight' ? (
        <ThemedText type="caption" themeColor="textSecondary">
          {currentWeight !== null
            ? `Starting from your 7-day average: ${formatKg(currentWeight)}. Works for losing or gaining.`
            : 'Log a weigh-in first (Today or Progress tab) so there is a starting point.'}
        </ThemedText>
      ) : null}

      {type === 'lift' ? (
        picking ? (
          <ExercisePicker
            onCancel={() => setPicking(false)}
            onPick={(e) => {
              setExercise(e);
              setPicking(false);
            }}
          />
        ) : (
          <Row style={{ justifyContent: 'space-between' }}>
            <ThemedText type="small" themeColor={exercise ? 'text' : 'textMuted'} style={{ flex: 1 }}>
              {exercise
                ? `${exercise.name} · current est. 1RM ${currentLift ? formatKg(currentLift) : 'not logged yet'}`
                : 'No exercise chosen'}
            </ThemedText>
            <Button title={exercise ? 'Change' : 'Choose exercise'} variant="secondary" small onPress={() => setPicking(true)} />
          </Row>
        )
      ) : null}

      <Row style={{ alignItems: 'flex-start' }}>
        <Field
          label={type === 'consistency' ? 'Workouts per week (1–7)' : type === 'lift' ? 'Target est. 1RM (kg)' : 'Target weight (kg)'}
          value={target}
          onChangeText={setTarget}
          keyboardType="decimal-pad"
          inputMode="decimal"
        />
        {type !== 'consistency' ? (
          <Field label="Deadline (optional, YYYY-MM-DD)" value={deadline} onChangeText={setDeadline} autoCapitalize="none" />
        ) : null}
      </Row>
      {!deadlineOk ? (
        <ThemedText type="caption" themeColor="critical">
          The deadline must be a future date written as YYYY-MM-DD.
        </ThemedText>
      ) : null}
      <Button title="Create goal" onPress={submit} disabled={!valid} loading={create.isPending} />
      <ErrorText error={create.error} />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Habits
// ---------------------------------------------------------------------------

const SUGGESTED_HABITS = ['Drink 3 L water', 'Sleep 8 hours', 'Hit protein target', '10k steps', 'Stretch 10 min', 'No junk food'];

function HabitsSection() {
  const day = today();
  const habits = useHabits();
  const logs = useHabitLogs();
  const createHabit = useCreateHabit();
  const archiveHabit = useArchiveHabit();
  const [name, setName] = useState('');

  const activeIds = new Set((habits.data ?? []).map((h) => h.id));
  const daysByHabit = new Map<string, Set<ISODate>>();
  const doneByDay = new Map<ISODate, number>();
  for (const log of logs.data ?? []) {
    if (!activeIds.has(log.habit_id)) continue;
    if (!daysByHabit.has(log.habit_id)) daysByHabit.set(log.habit_id, new Set());
    daysByHabit.get(log.habit_id)!.add(log.logged_on);
    doneByDay.set(log.logged_on, (doneByDay.get(log.logged_on) ?? 0) + 1);
  }

  const existing = new Set((habits.data ?? []).map((h) => h.name.toLowerCase()));
  const suggestions = SUGGESTED_HABITS.filter((s) => !existing.has(s.toLowerCase()));
  const add = (habitName: string) => {
    if (habitName.trim()) createHabit.mutate(habitName.trim(), { onSuccess: () => setName('') });
  };

  return (
    <>
      <SectionHeader title="Habits" />
      {habits.data?.length ? (
        <Card>
          <HabitHeatmap doneByDay={doneByDay} habitCount={habits.data.length} today={day} />
        </Card>
      ) : null}

      <Card>
        {habits.data?.length ? (
          habits.data.map((habit) => {
            const days = daysByHabit.get(habit.id) ?? new Set<ISODate>();
            return (
              <Row key={habit.id} style={{ minHeight: 40 }}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="small">{habit.name}</ThemedText>
                  <ThemedText type="caption" themeColor="textMuted">
                    Current streak {currentStreak(days, day)} · best {bestStreak(days)} · {days.size} days total
                  </ThemedText>
                </View>
                <Button
                  title="Remove"
                  variant="ghost"
                  small
                  onPress={async () => {
                    if (await confirm('Remove habit?', `${habit.name} will stop showing up. Its history is kept.`, 'Remove')) {
                      archiveHabit.mutate(habit.id);
                    }
                  }}
                />
              </Row>
            );
          })
        ) : (
          <Empty art="habits">Habits are small daily wins that add up. Add a few below.</Empty>
        )}

        <Row style={{ alignItems: 'flex-end' }}>
          <Field label="New habit" placeholder="e.g. Walk after dinner" value={name} onChangeText={setName} onSubmitEditing={() => add(name)} />
          <Button title="Add" disabled={!name.trim()} loading={createHabit.isPending} onPress={() => add(name)} />
        </Row>
        {suggestions.length ? (
          <Row style={{ flexWrap: 'wrap', gap: 4 }}>
            {suggestions.map((s) => (
              <Button key={s} title={`+ ${s}`} variant="secondary" small onPress={() => add(s)} />
            ))}
          </Row>
        ) : null}
        <ErrorText error={createHabit.error ?? archiveHabit.error} />
      </Card>
    </>
  );
}
