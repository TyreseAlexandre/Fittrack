import { useEffect, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, ProgressBar, Row } from '@/components/ui';

/** Countdown between sets. `endsAt` is a timestamp in ms; null hides the timer. */
export function RestTimer({
  endsAt,
  totalSeconds,
  onChange,
}: {
  endsAt: number | null;
  totalSeconds: number;
  onChange: (endsAt: number | null) => void;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endsAt === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  if (endsAt === null) return null;
  const remaining = Math.max(0, Math.round((endsAt - now) / 1000));
  const label = remaining > 0 ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}` : 'Go!';

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <ThemedText type="smallBold">Rest</ThemedText>
        <ThemedText type="stat" style={{ fontVariant: ['tabular-nums'] }}>
          {label}
        </ThemedText>
        <Row>
          <Button title="+30s" variant="secondary" small onPress={() => onChange(Math.max(endsAt, now) + 30_000)} />
          <Button title={remaining > 0 ? 'Skip' : 'Done'} variant="ghost" small onPress={() => onChange(null)} />
        </Row>
      </Row>
      <ProgressBar value={Math.min(1, remaining / totalSeconds)} />
    </Card>
  );
}
