import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ExercisePicker } from '@/components/exercise-picker';
import { RestTimer } from '@/components/rest-timer';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, confirm, Empty, ErrorText, Field, Loading, parseNumber, Pill, Row, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { personalRecordIds, sessionsFor } from '@/lib/derived';
import { useI18n } from '@/lib/i18n';
import { useAddSet, useAllSets, useDeleteSet, useDeleteWorkout, useExercises, useUpdateWorkout, useWorkouts } from '@/lib/queries';
import { setVolume, suggestNextSet } from '@/lib/stats';
import type { Exercise, WorkoutSet } from '@/lib/types';

const REST_SECONDS = 90;

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workouts = useWorkouts();
  const allSets = useAllSets();
  const exercises = useExercises();
  const update = useUpdateWorkout();
  const remove = useDeleteWorkout();

  const [picking, setPicking] = useState(false);
  const [added, setAdded] = useState<string[]>([]); // exercises added but with no sets yet
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);

  const workout = workouts.data?.find((w) => w.id === id);
  const sets = useMemo(() => (allSets.data ?? []).filter((s) => s.workout_id === id), [allSets.data, id]);
  const prIds = useMemo(() => personalRecordIds(allSets.data ?? []), [allSets.data]);

  if (workouts.isPending || allSets.isPending) return <Loading />;
  if (!workout) {
    return (
      <Screen>
        <Empty>Workout not found.</Empty>
      </Screen>
    );
  }

  const exerciseIds = [...new Set([...sets.map((s) => s.exercise_id), ...added])];
  const exerciseById = new Map((exercises.data ?? []).map((e) => [e.id, e]));
  const finished = !!workout.finished_at;

  async function deleteWorkout() {
    if (await confirm('Delete workout?', 'This removes the workout and all its sets.')) {
      remove.mutate(id, { onSuccess: () => router.back() });
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: workout.name }} />

      <NameField key={workout.name} name={workout.name} onSave={(name) => update.mutate({ id, name })} />

      <Row style={{ flexWrap: 'wrap' }}>
        <ThemedText type="caption" themeColor="textSecondary">
          {sets.length} sets · {Math.round(setVolume(sets)).toLocaleString()} kg volume
          {finished ? ` · finished ${new Date(workout.finished_at!).toLocaleString()}` : ''}
        </ThemedText>
      </Row>

      <RestTimer endsAt={restEndsAt} totalSeconds={REST_SECONDS} onChange={setRestEndsAt} />

      {exerciseIds.length === 0 && !picking ? <Empty>Add your first exercise to start logging sets.</Empty> : null}

      {exerciseIds.map((exerciseId) => (
        <ExerciseBlock
          key={exerciseId}
          workoutId={id}
          exercise={exerciseById.get(exerciseId)}
          exerciseId={exerciseId}
          sets={sets.filter((s) => s.exercise_id === exerciseId)}
          previous={sessionsFor(allSets.data ?? [], exerciseId).filter((s) => s.workoutId !== id).at(-1)?.sets ?? []}
          prIds={prIds}
          onSetAdded={() => setRestEndsAt(Date.now() + REST_SECONDS * 1000)}
        />
      ))}

      {picking ? (
        <ExercisePicker
          onCancel={() => setPicking(false)}
          onPick={(exercise) => {
            setAdded((list) => [...list, exercise.id]);
            setPicking(false);
          }}
        />
      ) : (
        <Button title="Add exercise" variant="secondary" onPress={() => setPicking(true)} />
      )}

      <View style={{ gap: Spacing.two, marginTop: Spacing.three }}>
        {!finished ? (
          <Button
            title="Finish workout"
            loading={update.isPending}
            disabled={sets.length === 0}
            onPress={() =>
              update.mutate({ id, finished_at: new Date().toISOString() }, { onSuccess: () => router.back() })
            }
          />
        ) : null}
        <Button title="Delete workout" variant="danger" loading={remove.isPending} onPress={deleteWorkout} />
        <ErrorText error={update.error ?? remove.error} />
      </View>
    </Screen>
  );
}

function NameField({ name, onSave }: { name: string; onSave: (name: string) => void }) {
  const [value, setValue] = useState(name);
  const save = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== name) onSave(trimmed);
    else setValue(name);
  };
  return <Field label="Workout name" value={value} onChangeText={setValue} onBlur={save} onSubmitEditing={save} />;
}

function ExerciseBlock({
  workoutId,
  exerciseId,
  exercise,
  sets,
  previous,
  prIds,
  onSetAdded,
}: {
  workoutId: string;
  exerciseId: string;
  exercise: Exercise | undefined;
  sets: WorkoutSet[];
  previous: WorkoutSet[];
  prIds: Set<string>;
  onSetAdded: () => void;
}) {
  const addSet = useAddSet();
  const deleteSet = useDeleteSet();
  const { t, suggestionTarget, suggestionReason } = useI18n();
  const suggestion = suggestNextSet(previous);
  const lastWeight = sets.at(-1)?.weight_kg ?? suggestion?.weightKg;
  const [weight, setWeight] = useState(lastWeight !== undefined ? String(lastWeight) : '');
  const [reps, setReps] = useState('');

  const weightValue = parseNumber(weight) ?? 0;
  const repsValue = parseNumber(reps);
  const canAdd = repsValue !== null && Number.isInteger(repsValue) && repsValue > 0;

  function add() {
    if (!canAdd || repsValue === null) return;
    addSet.mutate(
      { workout_id: workoutId, exercise_id: exerciseId, reps: repsValue, weight_kg: weightValue },
      {
        onSuccess: () => {
          setReps('');
          onSetAdded();
        },
      },
    );
  }

  return (
    <Card>
      <Pressable onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: exerciseId } })}>
        <ThemedText type="heading">{exercise?.name ?? 'Exercise'}</ThemedText>
      </Pressable>

      {previous.length ? (
        <ThemedText type="caption" themeColor="textSecondary">
          Last time: {previous.map((s) => `${s.weight_kg}×${s.reps}`).join(', ')}
        </ThemedText>
      ) : null}
      {suggestion ? (
        <ThemedText type="caption" themeColor="textSecondary">
          {t.workout.tryNext(suggestionTarget(suggestion), suggestionReason(suggestion))}
        </ThemedText>
      ) : null}

      {sets.map((set, i) => (
        <Row key={set.id} style={{ minHeight: 36 }}>
          <ThemedText type="caption" themeColor="textMuted" style={{ width: 44 }}>
            Set {i + 1}
          </ThemedText>
          <ThemedText type="smallBold" style={{ flex: 1 }}>
            {set.weight_kg > 0 ? `${set.weight_kg} kg × ${set.reps}` : `${set.reps} reps`}
          </ThemedText>
          {prIds.has(set.id) ? <Pill label="PR" /> : null}
          <Button
            title="✕"
            variant="ghost"
            small
            onPress={() => deleteSet.mutate(set.id)}
            disabled={deleteSet.isPending}
          />
        </Row>
      ))}

      <Row style={{ alignItems: 'flex-end' }}>
        <Field label="kg" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" inputMode="decimal" placeholder="0" />
        <Field
          label="Reps"
          value={reps}
          onChangeText={setReps}
          keyboardType="number-pad"
          inputMode="numeric"
          placeholder={suggestion ? String(suggestion.reps) : '10'}
          onSubmitEditing={add}
        />
        <Button title="Add set" onPress={add} disabled={!canAdd} loading={addSet.isPending} />
      </Row>
      <ErrorText error={addSet.error ?? deleteSet.error} />
    </Card>
  );
}
