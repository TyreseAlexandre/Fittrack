import { useState } from 'react';
import { View } from 'react-native';

import { HeroIllustration, type SpotArt, SpotIllustration } from '@/components/illustrations';
import { Logo } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, ErrorText, Field, Row, Screen, Segmented } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const FEATURES: { art: SpotArt; title: string; text: string }[] = [
  { art: 'barbell', title: 'Log workouts', text: 'Sets, reps and weight, with a rest timer and PR alerts.' },
  { art: 'chart', title: 'See progress', text: 'Estimated 1RM and body-weight trends over time.' },
  { art: 'habits', title: 'Build habits', text: 'Daily check-ins, streaks and a 16-week heatmap.' },
];

export default function SignIn() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    setNotice(null);
    const credentials = { email: email.trim(), password };
    const { data, error } =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);
    setBusy(false);
    if (error) setError(error);
    // With email confirmation on, sign-up succeeds but returns no session yet.
    else if (mode === 'sign-up' && !data.session) setNotice('Check your email to confirm your account, then sign in.');
  }

  return (
    <Screen tabs>
      <View style={{ marginTop: Spacing.five }}>
        <Logo size={44} />
      </View>
      <ThemedText themeColor="textSecondary">Track workouts, body weight and habits, and hit your goals.</ThemedText>
      <HeroIllustration />
      <Card>
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'sign-in', label: 'Sign in' },
            { value: 'sign-up', label: 'Create account' },
          ]}
        />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          inputMode="email"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
          onSubmitEditing={submit}
        />
        <ErrorText error={error} />
        {notice ? <ThemedText type="small">{notice}</ThemedText> : null}
        <Button
          title={mode === 'sign-in' ? 'Sign in' : 'Create account'}
          onPress={submit}
          loading={busy}
          disabled={!email.trim() || password.length < 6}
        />
      </Card>
      <Row style={{ flexWrap: 'wrap', alignItems: 'stretch' }}>
        {FEATURES.map((feature) => (
          <Card key={feature.art} style={{ flex: 1, minWidth: 150, alignItems: 'center' }}>
            <SpotIllustration art={feature.art} size={80} />
            <ThemedText type="smallBold">{feature.title}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary" style={{ textAlign: 'center' }}>
              {feature.text}
            </ThemedText>
          </Card>
        ))}
      </Row>
    </Screen>
  );
}
