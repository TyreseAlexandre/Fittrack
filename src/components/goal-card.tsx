import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card, ProgressBar, Row, StatusBadge } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { formatDay, type GoalEvaluation } from '@/lib/derived';
import type { Goal } from '@/lib/types';

export function GoalCard({ goal, evaluation, children }: { goal: Goal; evaluation: GoalEvaluation; children?: React.ReactNode }) {
  const deadline = goal.type !== 'consistency' && goal.target_date ? `by ${formatDay(goal.target_date, true)}` : null;
  return (
    <Card style={goal.completed_at ? { opacity: 0.6 } : undefined}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <ThemedText type="smallBold">{goal.title}</ThemedText>
          {deadline ? (
            <ThemedText type="caption" themeColor="textMuted">
              {deadline}
            </ThemedText>
          ) : null}
        </View>
        <StatusBadge status={goal.completed_at ? 'done' : evaluation.status} />
      </Row>
      <ProgressBar value={goal.completed_at ? 1 : evaluation.progress} />
      <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.one }}>
        <ThemedText type="caption" themeColor="textSecondary">
          {evaluation.summary}
        </ThemedText>
        {evaluation.projection ? (
          <ThemedText type="caption" themeColor="textSecondary">
            {evaluation.projection}
          </ThemedText>
        ) : null}
      </Row>
      {children}
    </Card>
  );
}
