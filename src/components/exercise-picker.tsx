import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, ErrorText, Field, Row } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCreateExercise, useExercises } from '@/lib/queries';
import { type Exercise, MUSCLE_GROUPS, type MuscleGroup } from '@/lib/types';

/** Search the exercise library, filter by muscle, or create a custom exercise. */
export function ExercisePicker({ onPick, onCancel }: { onPick: (exercise: Exercise) => void; onCancel: () => void }) {
  const exercises = useExercises();
  const create = useCreateExercise();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<MuscleGroup | null>(null);

  const q = query.trim().toLowerCase();
  const matches = (exercises.data ?? []).filter(
    (e) => (!group || e.muscle_group === group) && (!q || e.name.toLowerCase().includes(q)),
  );
  const exact = (exercises.data ?? []).some((e) => e.name.toLowerCase() === q);

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <ThemedText type="smallBold">Add exercise</ThemedText>
        <Button title="Cancel" variant="ghost" small onPress={onCancel} />
      </Row>
      <Field placeholder="Search exercises" value={query} onChangeText={setQuery} autoFocus />
      <Chips options={MUSCLE_GROUPS} value={group} onChange={setGroup} />
      <View style={{ maxHeight: 280 }}>
        {matches.slice(0, 40).map((e) => (
          <Pressable key={e.id} onPress={() => onPick(e)} style={({ pressed }) => [styles.item, { opacity: pressed ? 0.6 : 1 }]}>
            <ThemedText type="small" style={{ flex: 1 }}>
              {e.name}
            </ThemedText>
            <ThemedText type="caption" themeColor="textMuted">
              {e.muscle_group}
              {e.user_id ? ' · custom' : ''}
            </ThemedText>
          </Pressable>
        ))}
      </View>
      {q && !exact ? (
        <Button
          variant="secondary"
          title={`Create “${query.trim()}”${group ? ` (${group})` : ' (pick a muscle group)'}`}
          disabled={!group}
          loading={create.isPending}
          onPress={() =>
            group && create.mutate({ name: query.trim(), muscle_group: group }, { onSuccess: (exercise) => onPick(exercise) })
          }
        />
      ) : null}
      <ErrorText error={create.error} />
    </Card>
  );
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T | null;
  onChange: (value: T | null) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(selected ? null : option)}
            style={[
              styles.chip,
              { borderColor: selected ? theme.tint : theme.border, backgroundColor: selected ? theme.tint : 'transparent' },
            ]}>
            <ThemedText type="caption" style={{ color: selected ? theme.onTint : theme.textSecondary, fontWeight: 700 }}>
              {option}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  chip: {
    borderWidth: 1,
    borderRadius: Radius.large,
    paddingHorizontal: Spacing.two + Spacing.one,
    paddingVertical: Spacing.one,
  },
});
