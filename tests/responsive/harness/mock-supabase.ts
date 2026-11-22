// Only aliased by the isolated test server. Never imported by production code.
const user = {
  id: 'responsive-test-user',
  email: 'responsive@example.test',
  app_metadata: { provider: 'google', providers: ['google'] },
  user_metadata: {},
};
let signedIn = !new URLSearchParams(window.location.search).has('login');
let oauthAttempts = 0;
const listeners = new Set<(event: string, session: unknown) => void>();
export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: signedIn ? { user } : null }, error: null }),
    getUser: async () => ({ data: { user: signedIn ? user : null }, error: null }),
    onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
      listeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe() {
              listeners.delete(callback);
            },
          },
        },
      };
    },
    signOut: async () => {
      signedIn = false;
      for (const callback of listeners) callback('SIGNED_OUT', null);
      return { error: null };
    },
    signInWithOAuth: async (input: unknown) => {
      const r = await fetch('/__test/oauth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      await r.json();
      if (new URLSearchParams(window.location.search).has('oauthError') && oauthAttempts++ === 0)
        return {
          data: {},
          error: new Error('Não foi possível conectar ao Google. Tente novamente.'),
        };
      return { data: {}, error: null };
    },
  },
  rpc: async (name: string, args?: unknown) => {
    const r = await fetch('/__test/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, args }),
    });
    return r.json();
  },
};
