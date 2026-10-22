import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { LineChart } from '@/components/line-chart';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, confirm, Empty, ErrorText, Field, parseNumber, Row, Screen, SectionHeader, Segmented } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { bestsByExercise, formatDay, today, weightSeries } from '@/lib/derived';
import { useAllSets, useBodyWeights, useDeleteWeight, useExercises, useGoals, useLogWeight } from '@/lib/queries';
import { addDays, formatKg, isValidISODate } from '@/lib/stats';

type Range = '30' | '90' | '365' | 'all';

export default function Progress() {
  return (
    <Screen tabs>
      <ThemedText type="title">Progress</ThemedText>
      <BodyWeightSection />
      <LiftsSection />
    </Screen>
  );
}

function BodyWeightSection() {
  const theme = useTheme();
  const day = today();
  const weights = useBodyWeights();
  const goals = useGoals();
  const deleteWeight = useDeleteWeight();
  const [range, setRange] = useState<Range>('90');

  const { daily, average } = useMemo(() => weightSeries(weights.data ?? []), [weights.data]);
  const from = range === 'all' ? '' : addDays(day, -Number(range));
  const goal = goals.data?.find((g) => g.type === 'weight' && !g.completed_at);

  return (
    <>
      <SectionHeader title="Body weight" />
      <Card>
        <Segmented
          value={range}
          onChange={setRange}
          options={[
            { value: '30', label: '30d' },
            { value: '90', label: '90d' },
            { value: '365', label: '1y' },
            { value: 'all', label: 'All' },
          ]}
        />
        {daily.length ? (
          <LineChart
            unit="kg"
            series={[
              { key: 'daily', label: 'Daily weigh-in', color: theme.dataMuted, kind: 'dots', points: daily.filter((p) => p.date >= from) },
              { key: 'avg', label: '7-day average', color: theme.tint, kind: 'line', points: average.filter((p) => p.date >= from) },
            ]}
            reference={goal ? { value: goal.target_value, label: `Goal ${formatKg(goal.target_value)}` } : undefined}
          />
        ) : (
          <Empty art="chart">Log your weight to see your trend. Daily weigh-ins + the 7-day average smooth out water-weight noise.</Empty>
        )}
      </Card>

      <LogWeightCard />

      {weights.data?.length ? (
        <Card>
          <ThemedText type="smallBold">Recent weigh-ins</ThemedText>
          {weights.data
            .slice(-10)
            .reverse()
            .map((w) => (
              <Row key={w.id} style={{ minHeight: 32 }}>
                <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>
                  {formatDay(w.measured_on, true)}
                </ThemedText>
                <ThemedText type="smallBold">{formatKg(w.weight_kg)}</ThemedText>
                <Button
                  title="✕"
                  variant="ghost"
                  small
                  onPress={async () => {
                    if (await confirm('Delete weigh-in?', `${formatKg(w.weight_kg)} on ${formatDay(w.measured_on, true)}`)) {
                      deleteWeight.mutate(w.id);
                    }
                  }}
                />
              </Row>
            ))}
          <ErrorText error={deleteWeight.error} />
        </Card>
      ) : null}
    </>
  );
}

function LogWeightCard() {
  const [date, setDate] = useState(today());
  const [weight, setWeight] = useState('');
  const logWeight = useLogWeight();
  const value = parseNumber(weight);
  const dateOk = isValidISODate(date) && date <= today();

  return (
    <Card>
      <ThemedText type="smallBold">Log a weigh-in</ThemedText>
      <Row style={{ alignItems: 'flex-end' }}>
        <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} autoCapitalize="none" />
        <Field label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" inputMode="decimal" />
        <Button
          title="Save"
          disabled={!value || !dateOk}
          loading={logWeight.isPending}
          onPress={() => value && logWeight.mutate({ measured_on: date, weight_kg: value }, { onSuccess: () => setWeight('') })}
        />
      </Row>
      {!dateOk ? (
        <ThemedText type="caption" themeColor="critical">
          Enter a past or current date as YYYY-MM-DD.
        </ThemedText>
      ) : null}
      <ErrorText error={logWeight.error} />
    </Card>
  );
}

function LiftsSection() {
  const sets = useAllSets();
  const exercises = useExercises();
  const bests = useMemo(() => bestsByExercise(sets.data ?? []), [sets.data]);

  const rows = (exercises.data ?? [])
    .filter((e) => bests.has(e.id))
    .map((e) => ({ exercise: e, best: bests.get(e.id)! }))
    .sort((a, b) => b.best.lastDone.localeCompare(a.best.lastDone));

  return (
    <>
      <SectionHeader title="Lifts" />
      <Card>
        {rows.length ? (
          <>
            <Row>
              <ThemedText type="caption" themeColor="textMuted" style={{ flex: 1 }}>
                Exercise
              </ThemedText>
              <ThemedText type="caption" themeColor="textMuted" style={{ width: 80, textAlign: 'right' }}>
                Best
              </ThemedText>
              <ThemedText type="caption" themeColor="textMuted" style={{ width: 80, textAlign: 'right' }}>
                Est. 1RM
              </ThemedText>
            </Row>
            {rows.map(({ exercise, best }) => (
              <Pressable
                key={exercise.id}
                onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: exercise.id } })}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                <Row style={{ minHeight: 40 }}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="small">{exercise.name}</ThemedText>
                    <ThemedText type="caption" themeColor="textMuted">
                      {best.sessions} sessions · last {formatDay(best.lastDone)}
                    </ThemedText>
                  </View>
                  <ThemedText type="small" style={{ width: 80, textAlign: 'right', fontVariant: ['tabular-nums'] }}>
                    {best.weightKg > 0 ? formatKg(best.weightKg) : '—'}
                  </ThemedText>
                  <ThemedText type="smallBold" style={{ width: 80, textAlign: 'right', fontVariant: ['tabular-nums'] }}>
                    {best.e1rm > 0 ? formatKg(best.e1rm) : '—'}
                  </ThemedText>
                </Row>
              </Pressable>
            ))}
          </>
        ) : (
          <Empty art="barbell">Finish a workout and your lifts show up here.</Empty>
        )}
        <ThemedText type="caption" themeColor="textMuted" style={{ marginTop: Spacing.one }}>
          Est. 1RM uses the Epley formula: weight × (1 + reps ÷ 30).
        </ThemedText>
      </Card>
    </>
  );
}
