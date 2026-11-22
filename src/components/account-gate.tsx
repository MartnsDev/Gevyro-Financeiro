'use client';
import { useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { Cloud, LoaderCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { isGoogleUser, signInWithGoogle } from '@/lib/google-auth';
import { readLegacyWorkspace } from '@/lib/legacy-storage';
import { backupJSON } from '@/lib/backup';
import { GevyroLogo } from './gevyro-logo';
import { Button } from './ui/button';
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
          throw new Error('Entre com uma conta que use somente Google para acessar o Gevyro.');
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
    <main className="account-gate">
      <section className="account-card">
        <GevyroLogo />
        <p className="eyebrow">GEVYRO FINANÇAS</p>
        <h1>Seu dinheiro, com você em todos os dispositivos.</h1>
        <p>
          Entre com a mesma conta Google no computador ou no celular para acessar suas informações.
        </p>
        <div className="notice">
          <Cloud size={22} />
          <span>
            Seus registros financeiros serão salvos somente no Supabase. O aplicativo não mantém uma
            cópia financeira neste dispositivo.
          </span>
        </div>
        {loading ? (
          <p role="status">
            <LoaderCircle className="spin" /> Verificando sua conta…
          </p>
        ) : supabase ? (
          <Button
            disabled={busy}
            onClick={async () => {
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
          >
            <ShieldCheck size={18} />
            Entrar com Google
          </Button>
        ) : (
          <div className="stack">
            <p role="status">
              A configuração do acesso à nuvem ainda está pendente. Novos registros estão
              indisponíveis até a ativação.
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Verificar novamente
            </Button>
          </div>
        )}
        {error && <p role="alert">{error}</p>}
        <details>
          <summary>Usava uma versão anterior neste navegador?</summary>
          <p>
            Exporte uma cópia dos registros antigos antes da migração. Essa recuperação não cria
            novos registros locais.
          </p>
          <Button variant="outline" disabled={busy} onClick={() => void recover()}>
            Recuperar backup anterior
          </Button>
        </details>
        <small>
          A sessão de acesso pode ser mantida pelo provedor neste navegador. Os dados financeiros
          ficam na sua conta.
        </small>
      </section>
    </main>
  );
}
