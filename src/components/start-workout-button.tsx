import { router } from 'expo-router';

import { Button, ErrorText } from '@/components/ui';
import { useStartWorkout, useWorkouts } from '@/lib/queries';

/** Resumes the unfinished workout if there is one, otherwise starts a new one. */
export function StartWorkoutButton() {
  const workouts = useWorkouts();
  const start = useStartWorkout();
  const active = workouts.data?.find((w) => !w.finished_at);

  const open = (id: string) => router.push({ pathname: '/workout/[id]', params: { id } });

  if (active) return <Button title={`Resume ${active.name}`} onPress={() => open(active.id)} />;

  return (
    <>
      <Button
        title="Start workout"
        loading={start.isPending}
        disabled={workouts.isPending}
        onPress={() => {
          const weekday = new Date().toLocaleDateString(undefined, { weekday: 'long' });
          start.mutate(`${weekday} workout`, { onSuccess: (workout) => open(workout.id) });
        }}
      />
      <ErrorText error={start.error} />
    </>
  );
}
