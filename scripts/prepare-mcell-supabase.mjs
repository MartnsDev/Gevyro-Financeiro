import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
const source = process.env.MCELL_ENV_FILE;
if (!source)
  throw new Error(
    'Informe MCELL_ENV_FILE com o caminho local autorizado. Não envie esse arquivo ao Git.',
  );
const env = parseEnv(readFileSync(source, 'utf8'));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Configuração pública do MCell ausente.');
if (new URL(url).hostname !== 'bcfjhwcsulylodayczkr.supabase.co')
  throw new Error('Projeto diferente do Supabase MCell autorizado.');
// Never copy any service-role, payment, PIN, session, Vercel or management credentials.
if (existsSync('.env.local'))
  throw new Error('.env.local já existe; revise a configuração sem sobrescrever.');
writeFileSync(
  '.env.local',
  [
    '# Configuração pública do projeto MCell. Não contém credenciais administrativas.',
    '# Rede continua bloqueada até validar plano Free, migration isolada e Auth.',
    `NEXT_PUBLIC_SUPABASE_URL=${url}`,
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${key}`,
    'NEXT_PUBLIC_SUPABASE_SHARED_PROJECT_ENABLED=false',
    'NEXT_PUBLIC_APP_URL=http://localhost:3000',
    '',
  ].join('\n'),
  { mode: 0o600 },
);
console.log(
  'Configuração pública preparada. Nenhum segredo do MCell foi copiado; conexão remota permanece pendente de validação.',
);
