import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { StartWorkoutButton } from '@/components/start-workout-button';
import { ThemedText } from '@/components/themed-text';
import { Card, Empty, ErrorText, Loading, Pill, Row, Screen, SectionHeader } from '@/components/ui';
import { dayOf, formatDay } from '@/lib/derived';
import { useWorkouts } from '@/lib/queries';
import { setVolume } from '@/lib/stats';

export default function Train() {
  const workouts = useWorkouts();

  return (
    <Screen tabs>
      <ThemedText type="title">Train</ThemedText>
      <StartWorkoutButton />

      <SectionHeader title="History" />
      {workouts.isPending ? <Loading /> : null}
      <ErrorText error={workouts.error} />
      {workouts.data?.length === 0 ? <Empty art="barbell">Your workouts will be listed here.</Empty> : null}
      {workouts.data?.map((w) => {
        const minutes = w.finished_at
          ? Math.round((new Date(w.finished_at).getTime() - new Date(w.started_at).getTime()) / 60000)
          : null;
        const volume = setVolume(w.workout_sets.map((s) => ({ reps: s.reps, weight_kg: Number(s.weight_kg) })));
        return (
          <Pressable
            key={w.id}
            onPress={() => router.push({ pathname: '/workout/[id]', params: { id: w.id } })}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
            <Card>
              <Row style={{ justifyContent: 'space-between' }}>
                <ThemedText type="smallBold">{w.name}</ThemedText>
                {w.finished_at ? (
                  <ThemedText type="caption" themeColor="textMuted">
                    {formatDay(dayOf(w.started_at), true)}
                  </ThemedText>
                ) : (
                  <Pill label="In progress" />
                )}
              </Row>
              <ThemedText type="caption" themeColor="textSecondary">
                {[
                  `${w.workout_sets.length} sets`,
                  volume > 0 ? `${Math.round(volume).toLocaleString()} kg volume` : null,
                  minutes !== null ? `${minutes} min` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </ThemedText>
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}
