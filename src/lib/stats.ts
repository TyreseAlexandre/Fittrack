/**
 * Pure fitness math: dates, 1RM estimates, trends, goal progress, streaks and
 * progression suggestions. No imports, so it runs under `node --test` as-is.
 *
 * Dates are local calendar days formatted as `YYYY-MM-DD` strings, which sort
 * and compare correctly as plain strings.
 */

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

export type ISODate = string;

const DAY_MS = 24 * 60 * 60 * 1000;

export function toISODate(date: Date): ISODate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODate(value: ISODate): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toISODate(parseISODate(value)) === value;
}

export function addDays(value: ISODate, days: number): ISODate {
  const date = parseISODate(value);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** Whole calendar days from `a` to `b` (positive when `b` is later). */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / DAY_MS);
}

/** Monday of the week containing `value`. */
export function startOfWeek(value: ISODate): ISODate {
  const day = parseISODate(value).getDay(); // 0 = Sunday
  return addDays(value, -((day + 6) % 7));
}

// ---------------------------------------------------------------------------
// Lifting
// ---------------------------------------------------------------------------

export type SetLike = { reps: number; weight_kg: number };

/** Estimated one-rep max (Epley). A single rep is its own max. */
export function estimate1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

export function setVolume(sets: SetLike[]): number {
  return sets.reduce((sum, s) => sum + s.reps * s.weight_kg, 0);
}

/** Why a suggestion was made; the UI turns this into text in the current language. */
export type SuggestionReason =
  | { type: 'add-weight'; minReps: number; step: number }
  | { type: 'beat-weakest' }
  | { type: 'add-rep' };

export type Suggestion = { weightKg: number; reps: number; reason: SuggestionReason };

/**
 * Double progression in the 8-12 rep range, based on the sets done at the
 * heaviest weight last session:
 * - every set reached 12+ reps -> add weight and drop back to 8 reps
 * - otherwise -> keep the weight and add a rep to the weakest set
 * Bodyweight movements (0 kg) only ever progress in reps.
 */
export function suggestNextSet(lastSession: SetLike[]): Suggestion | null {
  if (lastSession.length === 0) return null;
  const topWeight = Math.max(...lastSession.map((s) => s.weight_kg));
  const topSets = lastSession.filter((s) => s.weight_kg === topWeight);
  const minReps = Math.min(...topSets.map((s) => s.reps));

  if (topWeight > 0 && minReps >= 12) {
    const step = topWeight >= 20 ? 2.5 : 1;
    return {
      weightKg: roundTo(topWeight + step, 0.25),
      reps: 8,
      reason: { type: 'add-weight', minReps, step },
    };
  }
  return {
    weightKg: topWeight,
    reps: minReps + 1,
    reason: { type: topWeight > 0 ? 'beat-weakest' : 'add-rep' },
  };
}

// ---------------------------------------------------------------------------
// Body weight
// ---------------------------------------------------------------------------

export type DatedValue = { date: ISODate; value: number };

/**
 * Trailing moving average over `windowDays` calendar days (not entries), so
 * missed weigh-ins don't stretch the window. Input must be sorted by date.
 */
export function movingAverage(entries: DatedValue[], windowDays = 7): DatedValue[] {
  return entries.map((entry, i) => {
    const from = addDays(entry.date, -(windowDays - 1));
    let sum = 0;
    let count = 0;
    for (let j = i; j >= 0 && entries[j].date >= from; j--) {
      sum += entries[j].value;
      count++;
    }
    return { date: entry.date, value: sum / count };
  });
}

/**
 * Least-squares slope in units per day over entries in the last `windowDays`
 * days up to `today`. Returns null with fewer than 3 points or under a week of span.
 */
export function trendPerDay(entries: DatedValue[], today: ISODate, windowDays = 28): number | null {
  const from = addDays(today, -windowDays);
  const recent = entries.filter((e) => e.date >= from && e.date <= today);
  if (recent.length < 3) return null;
  const xs = recent.map((e) => daysBetween(from, e.date));
  if (Math.max(...xs) - Math.min(...xs) < 7) return null;
  const n = recent.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = recent.reduce((a, e) => a + e.value, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (recent[i].value - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  return den === 0 ? null : num / den;
}

/** Date the trend reaches `target`, or null if it is moving the wrong way or too slowly. */
export function projectDate(current: number, target: number, perDay: number | null, today: ISODate): ISODate | null {
  if (perDay === null || perDay === 0) return null;
  const days = (target - current) / perDay;
  if (days < 0 || days > 3 * 365) return null;
  return addDays(today, Math.ceil(days - 1e-9));
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

/** Fraction (0-1) of the way from `start` to `target`; works in either direction. */
export function goalProgress(start: number, current: number, target: number): number {
  if (start === target) return current === target ? 1 : 0;
  return clamp((current - start) / (target - start), 0, 1);
}

export type GoalStatus = 'done' | 'ahead' | 'on-track' | 'behind' | 'overdue' | 'no-deadline';

/**
 * Compares actual progress with where a straight line from start date to
 * target date says you should be today.
 */
export function goalStatus(progress: number, startDate: ISODate, targetDate: ISODate | null, today: ISODate): GoalStatus {
  if (progress >= 1) return 'done';
  if (!targetDate) return 'no-deadline';
  if (today > targetDate) return 'overdue';
  const total = daysBetween(startDate, targetDate);
  const expected = total <= 0 ? 1 : clamp(daysBetween(startDate, today) / total, 0, 1);
  const diff = progress - expected;
  if (diff >= 0.05) return 'ahead';
  if (diff >= -0.1) return 'on-track';
  return 'behind';
}

// ---------------------------------------------------------------------------
// Streaks and consistency
// ---------------------------------------------------------------------------

/**
 * Consecutive logged days ending today, or ending yesterday if today isn't
 * logged yet (the streak is still alive until the day is over).
 */
export function currentStreak(days: Set<ISODate>, today: ISODate): number {
  let cursor = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function bestStreak(days: Set<ISODate>): number {
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let prev: ISODate | null = null;
  for (const day of sorted) {
    run = prev !== null && daysBetween(prev, day) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}

/** Number of workout days per week, keyed by the week's Monday. */
export function workoutsByWeek(workoutDays: ISODate[]): Map<ISODate, number> {
  const weeks = new Map<ISODate, number>();
  for (const day of workoutDays) {
    const week = startOfWeek(day);
    weeks.set(week, (weeks.get(week) ?? 0) + 1);
  }
  return weeks;
}

/**
 * Consecutive weeks hitting `target` workouts. The current week counts once
 * it is hit; until then the streak runs through last week.
 */
export function weekStreak(workoutDays: ISODate[], target: number, today: ISODate): number {
  const weeks = workoutsByWeek(workoutDays);
  let cursor = startOfWeek(today);
  if ((weeks.get(cursor) ?? 0) < target) cursor = addDays(cursor, -7);
  let streak = 0;
  while ((weeks.get(cursor) ?? 0) >= target) {
    streak++;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function formatKg(value: number): string {
  return `${Number(value.toFixed(1))} kg`;
}
