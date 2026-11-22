'use client';
import Image from 'next/image';
import {
  ChartNoAxesColumnIncreasing,
  Layers3,
  LoaderCircle,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { Button } from './ui/button';
export function LoginBrand() {
  return (
    <span className="login-brand">
      <Image
        src="/brand/gevyro-financas-logo-completa.png"
        width={1536}
        height={1024}
        alt="Gevyro Finanças"
        unoptimized
      />
    </span>
  );
}
function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" width="24" height="24" aria-hidden="true" focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.4 38.03 46.98 31.85 46.98 24.55Z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59A14.41 14.41 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.92 23.92 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
      />
    </svg>
  );
}
const benefits = [
  {
    icon: ChartNoAxesColumnIncreasing,
    title: 'Controle financeiro',
    text: 'Gastos, receitas e saldo sempre atualizados.',
  },
  {
    icon: Target,
    title: 'Metas e planejamento',
    text: 'Defina objetivos e acompanhe seu progresso.',
  },
  { icon: Layers3, title: 'Investimentos', text: 'Acompanhe e evolua seu patrimônio.' },
];
export function LoginScreen({
  loading,
  busy,
  available,
  error,
  onGoogle,
  onReload,
  onRecover,
}: {
  loading: boolean;
  busy: boolean;
  available: boolean;
  error: string;
  onGoogle: () => Promise<void>;
  onReload: () => void;
  onRecover: () => Promise<void>;
}) {
  return (
    <div className="login-page">
      <main className="login-layout">
        <section className="login-presentation" aria-label="Conheça o Gevyro Finanças">
          <div className="login-presentation-brand">
            <LoginBrand />
          </div>
          <div className="login-pitch">
            <h1>
              Controle suas
              <br />
              finanças com <span>clareza</span>
            </h1>
            <p>
              Organize gastos, acompanhe investimentos, planeje metas e tenha uma visão completa do
              seu dinheiro.
            </p>
          </div>
          <ul className="login-benefits">
            {benefits.map((b) => (
              <li key={b.title}>
                <span className="login-benefit-icon">
                  <b.icon size={28} strokeWidth={2.2} />
                </span>
                <div>
                  <h2>{b.title}</h2>
                  <p>{b.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <figure className="login-device" aria-label="Prévia do Gevyro Finanças">
            <div className="login-notebook-crop">
              <Image
                src="/brand/login-reference.png"
                width={1672}
                height={941}
                alt="Notebook com a prévia visual do Gevyro Finanças fornecida na referência."
                unoptimized
                sizes="(max-width:1023px) 80vw, 34vw"
              />
            </div>
            <figcaption>Uma visão completa. Em todos os seus dispositivos.</figcaption>
          </figure>
        </section>
        <section className="login-card" aria-labelledby="login-heading">
          <LoginBrand />
          <h2 id="login-heading">Acesse sua conta</h2>
          <p className="login-card-subtitle">Entre e continue controlando suas finanças.</p>
          {loading ? (
            <div className="login-loading" role="status">
              <LoaderCircle className="spin" size={22} />
              Verificando sua conta…
            </div>
          ) : available ? (
            <Button
              className="login-google"
              variant="outline"
              aria-label="Entrar com Google"
              disabled={busy}
              onClick={() => void onGoogle()}
            >
              {busy ? <LoaderCircle className="spin" size={23} /> : <GoogleIcon />}
              <span>{busy ? 'Conectando…' : 'Entrar com o Google'}</span>
            </Button>
          ) : (
            <div className="login-unavailable">
              <p role="status">
                A configuração do acesso à nuvem ainda está pendente. Novos registros estão
                indisponíveis até a ativação.
              </p>
              <Button variant="outline" onClick={onReload}>
                Verificar novamente
              </Button>
            </div>
          )}
          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
          <div className="login-assurance">
            <ShieldCheck size={21} />
            <p>
              Acesso seguro com sua conta Google.
              <br />
              <span>Suas finanças, sincronizadas e organizadas.</span>
            </p>
          </div>
          <p className="login-first-access">
            Seu primeiro acesso?{' '}
            <strong>Continue com o Google para criar sua conta gratuitamente.</strong>
          </p>
          <details className="login-recovery">
            <summary>Usava uma versão anterior neste navegador?</summary>
            <p>Exporte seus registros antigos antes da migração para sua conta.</p>
            <Button variant="outline" disabled={busy} onClick={() => void onRecover()}>
              Recuperar backup anterior
            </Button>
          </details>
        </section>
      </main>
    </div>
  );
}
