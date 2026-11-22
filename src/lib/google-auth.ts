import type { SupabaseClient, User } from '@supabase/supabase-js';

// App metadata comes from Auth, never from editable user_metadata.
// Restrict accounts with linked non-Google identities conservatively.
export function isGoogleUser(user: User | null | undefined): user is User {
  const providers: unknown = user?.app_metadata?.providers;
  return (
    !!user &&
    user.app_metadata.provider === 'google' &&
    Array.isArray(providers) &&
    providers.length === 1 &&
    providers[0] === 'google'
  );
}

export async function signInWithGoogle(client: SupabaseClient, origin: string) {
  const url = new URL(origin);
  if (
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === 'localhost')) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error('Endereço de retorno inválido.');
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: url.origin + '/', queryParams: { prompt: 'select_account' } },
  });
  if (error) throw error;
}
