/**
 * Turns raw rows into the numbers the screens show: PRs, per-exercise history,
 * and how each goal is going.
 */
import {
  addDays,
  daysBetween,
  type DatedValue,
  estimate1RM,
  goalProgress,
  goalStatus,
  type GoalStatus,
  type ISODate,
  movingAverage,
  projectDate,
  startOfWeek,
  toISODate,
  trendPerDay,
  weekStreak,
} from '@/lib/stats';
import type { BodyWeight, Goal, WorkoutSet, WorkoutSummary } from '@/lib/types';

export const today = (): ISODate => toISODate(new Date());

export const dayOf = (timestamp: string): ISODate => toISODate(new Date(timestamp));

/** Ids of sets that beat every earlier estimated 1RM for their exercise. Sets must be oldest first. */
export function personalRecordIds(sets: WorkoutSet[]): Set<string> {
  const best = new Map<string, number>();
  const prs = new Set<string>();
  for (const set of sets) {
    const e1rm = estimate1RM(set.weight_kg, set.reps);
    const previous = best.get(set.exercise_id);
    if (e1rm > 0 && (previous === undefined || e1rm > previous)) {
      // The very first set of an exercise is a baseline, not a record.
      if (previous !== undefined) prs.add(set.id);
      best.set(set.exercise_id, e1rm);
    }
  }
  return prs;
}

export type ExerciseBest = { e1rm: number; weightKg: number; lastDone: ISODate; sessions: number };

export function bestsByExercise(sets: WorkoutSet[]): Map<string, ExerciseBest> {
  const bests = new Map<string, ExerciseBest & { workouts: Set<string> }>();
  for (const set of sets) {
    const b = bests.get(set.exercise_id) ?? { e1rm: 0, weightKg: 0, lastDone: '', sessions: 0, workouts: new Set() };
    b.e1rm = Math.max(b.e1rm, estimate1RM(set.weight_kg, set.reps));
    b.weightKg = Math.max(b.weightKg, set.weight_kg);
    b.lastDone = dayOf(set.created_at);
    b.workouts.add(set.workout_id);
    b.sessions = b.workouts.size;
    bests.set(set.exercise_id, b);
  }
  return bests;
}

export type Session = { workoutId: string; date: ISODate; sets: WorkoutSet[]; bestE1RM: number };

/** One exercise's sets grouped by workout, oldest first. */
export function sessionsFor(sets: WorkoutSet[], exerciseId: string): Session[] {
  const sessions = new Map<string, Session>();
  for (const set of sets) {
    if (set.exercise_id !== exerciseId) continue;
    const s = sessions.get(set.workout_id) ?? {
      workoutId: set.workout_id,
      date: dayOf(set.created_at),
      sets: [],
      bestE1RM: 0,
    };
    s.sets.push(set);
    s.bestE1RM = Math.max(s.bestE1RM, estimate1RM(set.weight_kg, set.reps));
    sessions.set(set.workout_id, s);
  }
  return [...sessions.values()];
}

/** Days you trained (workouts with at least one set). */
export function trainingDays(workouts: WorkoutSummary[]): ISODate[] {
  return workouts.filter((w) => w.workout_sets.length > 0).map((w) => dayOf(w.started_at));
}

export function weightSeries(weights: BodyWeight[]): { daily: DatedValue[]; average: DatedValue[] } {
  const daily = weights.map((w) => ({ date: w.measured_on, value: w.weight_kg }));
  return { daily, average: movingAverage(daily) };
}

export type GoalEvaluation = {
  current: number | null;
  progress: number;
  status: GoalStatus;
  /** One-line human summary, e.g. "84.2 kg now · 4.2 kg to go". */
  summary: string;
  /** e.g. "At this pace: Feb 12" */
  projection: string | null;
};

type GoalContext = { weights: BodyWeight[]; sets: WorkoutSet[]; workouts: WorkoutSummary[]; today: ISODate };

const kg = (v: number) => `${Number(v.toFixed(1))} kg`;

/** "At this pace: Feb 12", flagging when that lands after the deadline even if you're ahead of plan so far. */
function describeProjection(projected: ISODate | null, deadline: ISODate | null): string | null {
  if (!projected) return null;
  const late = deadline !== null && projected > deadline;
  return `At this pace: ${formatDay(projected, true)}${late ? ' (after deadline)' : ''}`;
}

export function formatDay(date: ISODate, withYear = false): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
  });
}

export function evaluateGoal(goal: Goal, ctx: GoalContext): GoalEvaluation {
  const start = goal.start_value ?? 0;
  const target = goal.target_value;

  if (goal.type === 'consistency') {
    const days = trainingDays(ctx.workouts);
    const weekStart = startOfWeek(ctx.today);
    const thisWeek = new Set(days.filter((d) => d >= weekStart)).size;
    const progress = Math.min(1, thisWeek / target);
    const daysIntoWeek = daysBetween(weekStart, ctx.today) + 1;
    const expected = (target * daysIntoWeek) / 7;
    const status: GoalStatus = progress >= 1 ? 'done' : thisWeek >= Math.floor(expected) ? 'on-track' : 'behind';
    const streak = weekStreak(days, target, ctx.today);
    return {
      current: thisWeek,
      progress,
      status,
      summary: `${thisWeek} of ${target} workouts this week`,
      projection: streak > 0 ? `${streak}-week streak` : null,
    };
  }

  if (goal.type === 'weight') {
    const { daily, average } = weightSeries(ctx.weights);
    const current = average.at(-1)?.value ?? null;
    if (current === null) {
      return { current, progress: 0, status: 'no-deadline', summary: 'Log a weigh-in to start tracking', projection: null };
    }
    const progress = goalProgress(start, current, target);
    const projected = projectDate(current, target, trendPerDay(daily, ctx.today), ctx.today);
    return {
      current,
      progress,
      status: goalStatus(progress, goal.start_date, goal.target_date, ctx.today),
      summary: `${kg(current)} (7-day avg) · ${kg(Math.abs(target - current))} to go`,
      projection: progress >= 1 ? null : (describeProjection(projected, goal.target_date) ?? 'Not trending toward target yet'),
    };
  }

  // lift: target estimated 1RM
  const sessions = goal.exercise_id ? sessionsFor(ctx.sets, goal.exercise_id) : [];
  const current = sessions.reduce((best, s) => Math.max(best, s.bestE1RM), 0);
  const progress = goalProgress(start, current, target);
  const trend = trendPerDay(
    sessions.map((s) => ({ date: s.date, value: s.bestE1RM })),
    ctx.today,
    56,
  );
  const projected = projectDate(current, target, trend, ctx.today);
  return {
    current,
    progress,
    status: goalStatus(progress, goal.start_date, goal.target_date, ctx.today),
    summary: current > 0 ? `Est. 1RM ${kg(current)} · ${kg(Math.max(0, target - current))} to go` : 'Log this lift to start tracking',
    projection: progress >= 1 ? null : describeProjection(projected, goal.target_date),
  };
}

/** Last `weeks` weeks of days (Monday-first columns), ending with the current week. */
export function heatmapDays(todayDate: ISODate, weeks: number): ISODate[][] {
  const firstMonday = addDays(startOfWeek(todayDate), -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(firstMonday, w * 7 + d)),
  );
}
