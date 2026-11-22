'use client';
import { useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { isGoogleUser, signInWithGoogle } from '@/lib/google-auth';
import { readLegacyWorkspace } from '@/lib/legacy-storage';
import { backupJSON } from '@/lib/backup';
import { LoginScreen } from './login-screen';
export function AccountGate({ children }: { children: (user: User) => ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    let epoch = 0;
    const verify = async () => {
      const attempt = ++epoch;
      try {
        const { data: session, error: sessionError } = await supabase!.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session.session) {
          if (active && attempt === epoch) {
            setUser(null);
            setLoading(false);
          }
          return;
        }
        const { data, error: authError } = await supabase!.auth.getUser();
        if (authError) throw authError;
        if (!isGoogleUser(data.user))
          throw new Error('Entre com uma conta com identidade Google para acessar o Gevyro.');
        if (active && attempt === epoch) {
          setUser(data.user);
          setError('');
        }
      } catch (e) {
        if (active && attempt === epoch) {
          setUser(null);
          setError(e instanceof Error ? e.message : 'Não foi possível validar a sessão.');
        }
      } finally {
        if (active && attempt === epoch) setLoading(false);
      }
    };
    void verify();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      ++epoch;
      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }
      if (event !== 'TOKEN_REFRESHED') {
        setUser(null);
        setLoading(true);
      }
      setTimeout(() => {
        if (active) void verify();
      }, 0);
    });
    return () => {
      active = false;
      ++epoch;
      subscription.unsubscribe();
    };
  }, []);
  if (user) return children(user);
  async function recover() {
    setBusy(true);
    setError('');
    try {
      const saved = await readLegacyWorkspace();
      if (!saved) throw new Error('Não há histórico anterior neste navegador.');
      const url = URL.createObjectURL(
        new Blob([backupJSON(saved.data)], { type: 'application/json' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = 'gevyro-historico-anterior.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível recuperar o histórico.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <LoginScreen
      loading={loading}
      busy={busy}
      available={!!supabase}
      error={error}
      onReload={() => window.location.reload()}
      onRecover={recover}
      onGoogle={async () => {
        setBusy(true);
        setError('');
        try {
          await signInWithGoogle(supabase!, window.location.origin);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Não foi possível entrar.');
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
