import type { ISODate } from '@/lib/stats';

export const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Other'] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export type Exercise = {
  id: string;
  user_id: string | null;
  name: string;
  muscle_group: MuscleGroup;
};

export type Workout = {
  id: string;
  name: string;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
};

export type WorkoutSet = {
  id: string;
  workout_id: string;
  exercise_id: string;
  reps: number;
  weight_kg: number;
  created_at: string;
};

export type WorkoutSummary = Workout & { workout_sets: Pick<WorkoutSet, 'reps' | 'weight_kg'>[] };

export type BodyWeight = { id: string; measured_on: ISODate; weight_kg: number };

export type GoalType = 'weight' | 'lift' | 'consistency';

export type Goal = {
  id: string;
  type: GoalType;
  title: string;
  exercise_id: string | null;
  start_value: number | null;
  target_value: number;
  start_date: ISODate;
  target_date: ISODate | null;
  completed_at: string | null;
};

export type Habit = { id: string; name: string; archived_at: string | null; created_at: string };

export type HabitLog = { habit_id: string; logged_on: ISODate };
