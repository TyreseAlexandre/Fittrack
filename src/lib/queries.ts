/**
 * All database reads and writes, as React Query hooks.
 * Row level security scopes every query to the signed-in user.
 */
import type { PostgrestError } from '@supabase/supabase-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/lib/auth';
import { addDays, type ISODate, toISODate } from '@/lib/stats';
import { supabase } from '@/lib/supabase';
import type {
  BodyWeight,
  Exercise,
  Goal,
  Habit,
  HabitLog,
  MuscleGroup,
  Workout,
  WorkoutSet,
  WorkoutSummary,
} from '@/lib/types';

const keys = {
  exercises: ['exercises'],
  workouts: ['workouts'],
  sets: ['sets'],
  weights: ['weights'],
  goals: ['goals'],
  habits: ['habits'],
  habitLogs: ['habit-logs'],
} as const;

type Result<T> = { data: T | null; error: PostgrestError | null };

function unwrap<T>({ data, error }: Result<T>): T {
  if (error) throw error;
  return data as T;
}

/** PostgREST caps responses at 1000 rows, so page through larger tables. */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<Result<T[]>>): Promise<T[]> {
  const size = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += size) {
    const batch = unwrap(await page(from, from + size - 1)) ?? [];
    rows.push(...batch);
    if (batch.length < size) return rows;
  }
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return (...queryKeys: (readonly string[])[]) =>
    Promise.all(queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

// ---------------------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------------------

export function useExercises() {
  return useQuery({
    queryKey: keys.exercises,
    queryFn: async () =>
      unwrap<Exercise[]>(await supabase.from('exercises').select('id, user_id, name, muscle_group').order('name')),
  });
}

export function useCreateExercise() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: { name: string; muscle_group: MuscleGroup }) =>
      unwrap<Exercise>(await supabase.from('exercises').insert(input).select().single()),
    onSuccess: () => invalidate(keys.exercises),
  });
}

// ---------------------------------------------------------------------------
// Workouts and sets
// ---------------------------------------------------------------------------

export function useWorkouts() {
  return useQuery({
    queryKey: keys.workouts,
    queryFn: async () =>
      unwrap<WorkoutSummary[]>(
        await supabase
          .from('workouts')
          .select('id, name, started_at, finished_at, notes, workout_sets(reps, weight_kg)')
          .order('started_at', { ascending: false })
          .limit(200),
      ),
  });
}

/** Every set you have ever logged, oldest first. Powers PRs, history and suggestions. */
export function useAllSets() {
  return useQuery({
    queryKey: keys.sets,
    queryFn: async () => {
      const rows = await fetchAll<WorkoutSet>((from, to) =>
        supabase
          .from('workout_sets')
          .select('id, workout_id, exercise_id, reps, weight_kg, created_at')
          .order('created_at')
          .range(from, to),
      );
      return rows.map((s) => ({ ...s, weight_kg: Number(s.weight_kg) }));
    },
  });
}

export function useStartWorkout() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (name: string) =>
      unwrap<Workout>(await supabase.from('workouts').insert({ name }).select().single()),
    onSuccess: () => invalidate(keys.workouts),
  });
}

export function useUpdateWorkout() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Workout> & { id: string }) =>
      unwrap(await supabase.from('workouts').update(patch).eq('id', id)),
    onSuccess: () => invalidate(keys.workouts),
  });
}

export function useDeleteWorkout() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('workouts').delete().eq('id', id)),
    onSuccess: () => invalidate(keys.workouts, keys.sets),
  });
}

export function useAddSet() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: Pick<WorkoutSet, 'workout_id' | 'exercise_id' | 'reps' | 'weight_kg'>) =>
      unwrap(await supabase.from('workout_sets').insert(input)),
    onSuccess: () => invalidate(keys.sets, keys.workouts),
  });
}

export function useDeleteSet() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('workout_sets').delete().eq('id', id)),
    onSuccess: () => invalidate(keys.sets, keys.workouts),
  });
}

// ---------------------------------------------------------------------------
// Body weight
// ---------------------------------------------------------------------------

export function useBodyWeights() {
  return useQuery({
    queryKey: keys.weights,
    queryFn: async () => {
      const rows = await fetchAll<BodyWeight>((from, to) =>
        supabase.from('body_weights').select('id, measured_on, weight_kg').order('measured_on').range(from, to),
      );
      return rows.map((w) => ({ ...w, weight_kg: Number(w.weight_kg) }));
    },
  });
}

/** One weigh-in per day; logging again the same day replaces it. */
export function useLogWeight() {
  const userId = useUserId();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: { measured_on: ISODate; weight_kg: number }) =>
      unwrap(
        await supabase
          .from('body_weights')
          .upsert({ ...input, user_id: userId }, { onConflict: 'user_id,measured_on' }),
      ),
    onSuccess: () => invalidate(keys.weights),
  });
}

export function useDeleteWeight() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('body_weights').delete().eq('id', id)),
    onSuccess: () => invalidate(keys.weights),
  });
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

export function useGoals() {
  return useQuery({
    queryKey: keys.goals,
    queryFn: async () => {
      const rows = unwrap<Goal[]>(
        await supabase
          .from('goals')
          .select('id, type, title, exercise_id, start_value, target_value, start_date, target_date, completed_at')
          .order('created_at'),
      );
      return rows.map((g) => ({
        ...g,
        start_value: g.start_value === null ? null : Number(g.start_value),
        target_value: Number(g.target_value),
      }));
    },
  });
}

export function useCreateGoal() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: Omit<Goal, 'id' | 'completed_at'>) =>
      unwrap(await supabase.from('goals').insert(input)),
    onSuccess: () => invalidate(keys.goals),
  });
}

export function useUpdateGoal() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Goal> & { id: string }) =>
      unwrap(await supabase.from('goals').update(patch).eq('id', id)),
    onSuccess: () => invalidate(keys.goals),
  });
}

export function useDeleteGoal() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('goals').delete().eq('id', id)),
    onSuccess: () => invalidate(keys.goals),
  });
}

// ---------------------------------------------------------------------------
// Habits
// ---------------------------------------------------------------------------

export function useHabits() {
  return useQuery({
    queryKey: keys.habits,
    queryFn: async () =>
      unwrap<Habit[]>(
        await supabase
          .from('habits')
          .select('id, name, archived_at, created_at')
          .is('archived_at', null)
          .order('created_at'),
      ),
  });
}

export function useCreateHabit() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (name: string) => unwrap(await supabase.from('habits').insert({ name })),
    onSuccess: () => invalidate(keys.habits),
  });
}

export function useArchiveHabit() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(await supabase.from('habits').update({ archived_at: new Date().toISOString() }).eq('id', id)),
    onSuccess: () => invalidate(keys.habits),
  });
}

/** Habit check-ins for roughly the last 13 months: enough for streaks and the heatmap. */
export function useHabitLogs() {
  return useQuery({
    queryKey: keys.habitLogs,
    queryFn: async () => {
      const since = addDays(toISODate(new Date()), -400);
      return fetchAll<HabitLog>((from, to) =>
        supabase.from('habit_logs').select('habit_id, logged_on').gte('logged_on', since).range(from, to),
      );
    },
  });
}

/** Checks a habit on or off for a day, updating the UI before the server answers. */
export function useToggleHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ habit_id, logged_on, done }: HabitLog & { done: boolean }) =>
      done
        ? unwrap(await supabase.from('habit_logs').insert({ habit_id, logged_on }))
        : unwrap(await supabase.from('habit_logs').delete().match({ habit_id, logged_on })),
    onMutate: async ({ habit_id, logged_on, done }) => {
      await queryClient.cancelQueries({ queryKey: keys.habitLogs });
      const previous = queryClient.getQueryData<HabitLog[]>(keys.habitLogs);
      queryClient.setQueryData<HabitLog[]>(keys.habitLogs, (logs = []) =>
        done
          ? [...logs, { habit_id, logged_on }]
          : logs.filter((l) => !(l.habit_id === habit_id && l.logged_on === logged_on)),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => queryClient.setQueryData(keys.habitLogs, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.habitLogs }),
  });
}
