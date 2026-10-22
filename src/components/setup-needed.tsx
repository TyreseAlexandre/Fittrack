import { Logo } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { Card, Screen } from '@/components/ui';

/** Shown instead of the app until Supabase keys are in `.env.local`. */
export function SetupNeeded() {
  return (
    <Screen tabs>
      <Logo size={44} />
      <Card>
        <ThemedText type="heading">Connect your database</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          1. Create a free project at supabase.com.{'\n'}
          2. In the SQL Editor, run supabase/migrations/20261019000000_init.sql.{'\n'}
          3. Copy .env.example to .env.local and fill in your Project URL and publishable key (Connect button, or Settings → API Keys).
          {'\n'}
          4. Restart the dev server: npm run web
        </ThemedText>
      </Card>
    </Screen>
  );
}
