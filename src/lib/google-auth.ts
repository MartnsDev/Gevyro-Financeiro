import type { SupabaseClient, User } from '@supabase/supabase-js';

// App metadata comes from Auth, never from editable user_metadata.
// Email identities may be linked in shared MCell accounts; the database also requires OAuth AMR.
export function isGoogleUser(user: User | null | undefined): user is User {
  const providers: unknown = user?.app_metadata?.providers;
  return (
    !!user &&
    ['google', 'email'].includes(user.app_metadata.provider ?? '') &&
    Array.isArray(providers) &&
    providers.includes('google') &&
    providers.every((provider) => provider === 'google' || provider === 'email') &&
    new Set(providers).size === providers.length
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
