import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, type PropsWithChildren, use, useEffect, useState } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type AuthState = { session: Session | null; isLoading: boolean };

const AuthContext = createContext<AuthState>({ session: null, isLoading: true });

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ session: null, isLoading: isSupabaseConfigured });

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data }) => {
      setState({ session: data.session, isLoading: false });
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Never show one account's cached data to another.
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') queryClient.clear();
      setState({ session, isLoading: false });
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  return <AuthContext value={state}>{children}</AuthContext>;
}

export function useAuth() {
  return use(AuthContext);
}

/** The signed-in user's id. Only call this inside screens behind the auth guard. */
export function useUserId(): string {
  const { session } = useAuth();
  if (!session) throw new Error('useUserId called while signed out');
  return session.user.id;
}
