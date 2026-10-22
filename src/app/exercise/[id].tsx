import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import { LineChart } from '@/components/line-chart';
import { ThemedText } from '@/components/themed-text';
import { Card, Empty, Loading, Pill, Row, Screen, SectionHeader, Stat } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, personalRecordIds, sessionsFor } from '@/lib/derived';
import { useI18n } from '@/lib/i18n';
import { useAllSets, useExercises, useGoals } from '@/lib/queries';
import { formatKg, setVolume, suggestNextSet } from '@/lib/stats';

export default function ExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { t, suggestionTarget, suggestionReason } = useI18n();
  const exercises = useExercises();
  const allSets = useAllSets();
  const goals = useGoals();

  const sessions = useMemo(() => sessionsFor(allSets.data ?? [], id), [allSets.data, id]);
  const prIds = useMemo(() => personalRecordIds(allSets.data ?? []), [allSets.data]);

  if (exercises.isPending || allSets.isPending) return <Loading />;

  const exercise = exercises.data?.find((e) => e.id === id);
  const allExerciseSets = sessions.flatMap((s) => s.sets);
  const bestE1RM = Math.max(0, ...sessions.map((s) => s.bestE1RM));
  const bestWeight = Math.max(0, ...allExerciseSets.map((s) => s.weight_kg));
  const suggestion = suggestNextSet(sessions.at(-1)?.sets ?? []);
  const goal = goals.data?.find((g) => g.type === 'lift' && g.exercise_id === id && !g.completed_at);

  return (
    <Screen>
      <Stack.Screen options={{ title: exercise?.name ?? 'Exercise' }} />
      <ThemedText type="subtitle">{exercise?.name}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {exercise?.muscle_group}
      </ThemedText>

      <Row style={{ flexWrap: 'wrap' }}>
        <Stat label="Est. 1RM" value={bestE1RM ? formatKg(bestE1RM) : '—'} />
        <Stat label="Heaviest set" value={bestWeight ? formatKg(bestWeight) : '—'} />
        <Stat label="Sessions" value={String(sessions.length)} />
      </Row>

      {suggestion ? (
        <Card>
          <ThemedText type="smallBold">Next session</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t.exercise.aimFor(suggestionTarget(suggestion), suggestionReason(suggestion))}
          </ThemedText>
        </Card>
      ) : null}

      <SectionHeader title="Estimated 1RM" />
      <Card>
        {sessions.length >= 2 ? (
          <LineChart
            unit="kg"
            series={[
              {
                key: 'e1rm',
                label: 'Best est. 1RM',
                color: theme.tint,
                kind: 'line',
                points: sessions.map((s) => ({ date: s.date, value: s.bestE1RM })),
              },
            ]}
            reference={goal ? { value: goal.target_value, label: `Goal ${formatKg(goal.target_value)}` } : undefined}
          />
        ) : (
          <Empty>Log this exercise in two sessions to see your trend.</Empty>
        )}
      </Card>

      <SectionHeader title="History" />
      {sessions.length === 0 ? <Empty>No sets logged yet.</Empty> : null}
      {[...sessions].reverse().map((session) => (
        <Card key={session.workoutId}>
          <Row style={{ justifyContent: 'space-between' }}>
            <ThemedText type="smallBold">{formatDay(session.date, true)}</ThemedText>
            <ThemedText type="caption" themeColor="textMuted">
              {Math.round(setVolume(session.sets)).toLocaleString()} kg volume
            </ThemedText>
          </Row>
          {session.sets.map((set, i) => (
            <Row key={set.id}>
              <ThemedText type="caption" themeColor="textMuted" style={{ width: 44 }}>
                Set {i + 1}
              </ThemedText>
              <ThemedText type="small" style={{ flex: 1 }}>
                {set.weight_kg > 0 ? `${set.weight_kg} kg × ${set.reps}` : `${set.reps} reps`}
              </ThemedText>
              {prIds.has(set.id) ? <Pill label="PR" /> : null}
            </Row>
          ))}
        </Card>
      ))}
    </Screen>
  );
}
