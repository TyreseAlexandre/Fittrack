import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addDays,
  bestStreak,
  currentStreak,
  estimate1RM,
  goalProgress,
  goalStatus,
  isValidISODate,
  movingAverage,
  projectDate,
  startOfWeek,
  suggestNextSet,
  trendPerDay,
  weekStreak,
} from '../src/lib/stats.ts';

describe('dates', () => {
  it('adds days across month and year boundaries', () => {
    assert.equal(addDays('2026-01-31', 1), '2026-02-01');
    assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  });

  it('finds Monday of the week', () => {
    assert.equal(startOfWeek('2026-10-19'), '2026-10-19'); // Monday
    assert.equal(startOfWeek('2026-10-25'), '2026-10-19'); // Sunday
  });

  it('validates ISO dates', () => {
    assert.ok(isValidISODate('2026-02-28'));
    assert.ok(!isValidISODate('2026-02-30'));
    assert.ok(!isValidISODate('26-2-1'));
  });
});

describe('estimate1RM', () => {
  it('uses Epley and treats a single as the max', () => {
    assert.equal(estimate1RM(100, 1), 100);
    assert.equal(estimate1RM(60, 10), 80);
    assert.equal(estimate1RM(60, 0), 0);
  });
});

describe('suggestNextSet', () => {
  it('adds weight once every top set hits 12 reps', () => {
    const s = suggestNextSet([
      { weight_kg: 60, reps: 12 },
      { weight_kg: 60, reps: 12 },
      { weight_kg: 40, reps: 8 },
    ]);
    assert.deepEqual([s?.weightKg, s?.reps], [62.5, 8]);
  });

  it('otherwise asks for one more rep on the weakest top set', () => {
    const s = suggestNextSet([
      { weight_kg: 60, reps: 10 },
      { weight_kg: 60, reps: 8 },
    ]);
    assert.deepEqual([s?.weightKg, s?.reps], [60, 9]);
  });

  it('uses small jumps for light weights and none for bodyweight', () => {
    assert.equal(suggestNextSet([{ weight_kg: 10, reps: 12 }])?.weightKg, 11);
    assert.deepEqual(suggestNextSet([{ weight_kg: 0, reps: 15 }]), { weightKg: 0, reps: 16, reason: { type: 'add-rep' } });
    assert.equal(suggestNextSet([]), null);
  });
});

describe('movingAverage', () => {
  it('averages over calendar days, not entries', () => {
    const avg = movingAverage([
      { date: '2026-10-01', value: 80 },
      { date: '2026-10-02', value: 82 },
      { date: '2026-10-10', value: 78 },
    ]);
    assert.deepEqual(avg.map((a) => a.value), [80, 81, 78]);
  });
});

describe('trend and projection', () => {
  const entries = Array.from({ length: 15 }, (_, i) => ({
    date: addDays('2026-10-01', i),
    value: 90 - i * 0.1,
  }));

  it('measures the slope per day', () => {
    const slope = trendPerDay(entries, '2026-10-15');
    assert.ok(slope !== null && Math.abs(slope + 0.1) < 1e-9);
  });

  it('projects when the target will be reached', () => {
    assert.equal(projectDate(88.6, 85, -0.1, '2026-10-15'), '2026-11-20');
    assert.equal(projectDate(88.6, 95, -0.1, '2026-10-15'), null);
  });

  it('needs enough data', () => {
    assert.equal(trendPerDay(entries.slice(0, 2), '2026-10-15'), null);
  });
});

describe('goals', () => {
  it('measures progress for losing and gaining', () => {
    assert.equal(goalProgress(90, 85, 80), 0.5);
    assert.equal(goalProgress(100, 110, 120), 0.5);
    assert.equal(goalProgress(90, 95, 80), 0);
  });

  it('compares progress with the expected pace', () => {
    // halfway through the timeline
    assert.equal(goalStatus(0.5, '2026-10-01', '2026-10-31', '2026-10-16'), 'on-track');
    assert.equal(goalStatus(0.8, '2026-10-01', '2026-10-31', '2026-10-16'), 'ahead');
    assert.equal(goalStatus(0.2, '2026-10-01', '2026-10-31', '2026-10-16'), 'behind');
    assert.equal(goalStatus(0.5, '2026-10-01', '2026-10-31', '2026-11-01'), 'overdue');
    assert.equal(goalStatus(1, '2026-10-01', '2026-10-31', '2026-11-01'), 'done');
    assert.equal(goalStatus(0.5, '2026-10-01', null, '2026-11-01'), 'no-deadline');
  });
});

describe('streaks', () => {
  const days = new Set(['2026-10-15', '2026-10-16', '2026-10-17', '2026-10-01', '2026-10-02']);

  it('keeps the streak alive until the day is over', () => {
    assert.equal(currentStreak(days, '2026-10-18'), 3);
    assert.equal(currentStreak(days, '2026-10-17'), 3);
    assert.equal(currentStreak(days, '2026-10-19'), 0);
  });

  it('finds the best streak', () => {
    assert.equal(bestStreak(days), 3);
  });

  it('counts consecutive weeks hitting a workout target', () => {
    const workouts = [
      '2026-10-05', '2026-10-07', '2026-10-09', // week of Oct 5: 3
      '2026-10-12', '2026-10-14', '2026-10-16', // week of Oct 12: 3
      '2026-10-19', // this week: 1 so far
    ];
    assert.equal(weekStreak(workouts, 3, '2026-10-20'), 2);
    assert.equal(weekStreak([...workouts, '2026-10-20', '2026-10-21'], 3, '2026-10-21'), 3);
  });
});
