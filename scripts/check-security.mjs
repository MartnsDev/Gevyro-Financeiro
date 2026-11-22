import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { repositoryFiles } from './repository-files.mjs';
const findings = [];
const patterns = [
  ['chave privada', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['token GitHub', /\b(?:gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{30,})\b/],
  ['segredo Supabase', /\bsb_secret_[A-Za-z0-9_-]{15,}\b/],
  ['chave AWS', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['senha em conexão', /postgres(?:ql)?:\/\/[^\s/:]+:[^\s@]{4,}@(?!localhost|127\.0\.0\.1)[^\s]+/],
];
for (const path of repositoryFiles()) {
  if (/\.(?:png|jpg|jpeg|webp|ico|woff2?)$/.test(path)) continue;
  const source = readFileSync(path, 'utf8');
  for (const [label, pattern] of patterns)
    if (pattern.test(source)) findings.push(path + ': ' + label);
  for (const token of source.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || []) {
    try {
      if (JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).role === 'service_role')
        findings.push(path + ': JWT administrativo');
    } catch {
      /* Not a JWT. */
    }
  }
  if (/\.(?:tsx?|jsx?)$/.test(path) && path.startsWith('src/')) {
    if (/dangerouslySetInnerHTML|\beval\s*\(|\bnew Function\s*\(/.test(source))
      findings.push(path + ': execução/HTML dinâmico exige revisão');
    if (/NEXT_PUBLIC_[A-Z_]*(?:SERVICE_ROLE|SECRET|PASSWORD|PRIVATE|ACCESS_TOKEN)/.test(source))
      findings.push(path + ': variável privada no cliente');
  }
}
assert.deepEqual(
  findings,
  [],
  'Possível exposição detectada (somente nomes, valores omitidos): ' + findings.join(', '),
);
const app = readFileSync('src/components/finance-app.tsx', 'utf8');
assert.doesNotMatch(app, /signInWithPassword|resetPasswordForEmail|\.signUp\(/);
assert.match(readFileSync('src/lib/supabase.ts', 'utf8'), /flowType:\s*'pkce'/);
const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
const headers = config.headers.flatMap((rule) => rule.headers);
for (const key of [
  'Content-Security-Policy',
  'X-Frame-Options',
  'X-Content-Type-Options',
  'Strict-Transport-Security',
])
  assert.ok(headers.some((h) => h.key === key));
assert.equal(config.outputDirectory, 'out');
const sw = readFileSync('public/sw.js', 'utf8');
assert.match(sw, /url\.pathname !== '\/icon-192\.png'/);
if (existsSync('out')) {
  for (const name of ['.env', '.env.local', '.git/config']) assert.ok(!existsSync('out/' + name));
}
console.log(
  `PASS: ${repositoryFiles().length} arquivos revisados; nenhum segredo reconhecido. Auth Google/PKCE, headers e cache restrito conferidos. Não substitui auditoria manual ou homologação remota.`,
);

const storage = readFileSync('src/lib/storage.ts', 'utf8');
assert.doesNotMatch(storage, /openDB|indexedDB|localStorage|sessionStorage/);
assert.match(storage, /if \(!userId\)/);
assert.match(readFileSync('src/components/finance-app.tsx', 'utf8'), /AccountGate/);
