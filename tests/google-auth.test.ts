import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { isGoogleUser, signInWithGoogle } from '../src/lib/google-auth';
function user(app_metadata: Record<string, unknown>, user_metadata = {}) {
  return { app_metadata, user_metadata } as User;
}
describe('Acesso exclusivo Google', () => {
  it('exige identidade Google confiável, permitindo a identidade email já usada no MCell', () => {
    expect(isGoogleUser(user({ provider: 'google', providers: ['google'] }))).toBe(true);
    expect(isGoogleUser(null)).toBe(false);
    expect(isGoogleUser(user({}, { provider: 'google', providers: ['google'] }))).toBe(false);
    expect(isGoogleUser(user({ provider: 'google', providers: ['google', 'email'] }))).toBe(true);
    expect(isGoogleUser(user({ provider: 'email', providers: ['email', 'google'] }))).toBe(true);
    expect(isGoogleUser(user({ provider: 'google', providers: ['google', 'github'] }))).toBe(false);
    expect(isGoogleUser(user({ provider: 'google', providers: ['google', 'google'] }))).toBe(false);
    expect(isGoogleUser(user({ provider: 'email', providers: ['email'] }))).toBe(false);
  });
  it('solicita apenas Google, sem escopos extras e retorna à mesma origem', async () => {
    const oauth = vi.fn().mockResolvedValue({ error: null });
    await signInWithGoogle(
      { auth: { signInWithOAuth: oauth } } as unknown as SupabaseClient,
      'https://financeiro.example',
    );
    expect(oauth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'https://financeiro.example/',
        queryParams: { prompt: 'select_account' },
      },
    });
  });
  it('rejeita retorno inseguro ou com parâmetros e comunica falha do provedor', async () => {
    const oauth = vi.fn().mockResolvedValue({ error: new Error('Provedor indisponível') });
    const client = { auth: { signInWithOAuth: oauth } } as unknown as SupabaseClient;
    for (const origin of [
      'http://example.test',
      'https://user:pass@example.test',
      'https://example.test/?next=https://evil.test',
      'javascript:alert(1)',
    ])
      await expect(signInWithGoogle(client, origin)).rejects.toThrow();
    expect(oauth).not.toHaveBeenCalled();
    await expect(signInWithGoogle(client, 'http://localhost:3000')).rejects.toThrow(
      'Provedor indisponível',
    );
  });
});
