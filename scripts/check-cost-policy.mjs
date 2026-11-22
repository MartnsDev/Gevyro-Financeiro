import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
// Fails the build instead of silently enabling chargeable infrastructure.
const manifest = {
  static: { directory: JSON.parse(readFileSync('vercel.json', 'utf8')).outputDirectory },
};
assert.equal(
  manifest.static?.directory,
  'out',
  'The zero-extra-budget deployment must remain static.',
);
for (const key of ['d1', 'r2', 'plugins', 'connectors', 'capabilities'])
  if (manifest[key] != null)
    assert.fail(
      `Review required: hosting binding ${key} cannot be enabled under the zero-extra-budget policy.`,
    );
const policy = readFileSync('src/lib/cost-policy.ts', 'utf8');
assert.match(policy, /allowRemoteServices:\s*false/);
const shared = readFileSync('src/lib/shared-supabase.ts', 'utf8');
assert.match(shared, /projectRef:\s*'bcfjhwcsulylodayczkr'/);
assert.match(shared, /hostname:\s*'bcfjhwcsulylodayczkr\.supabase\.co'/);
assert.match(shared, /schema:\s*'gevyro_finance'/);
assert.match(policy, /allowAttachments:\s*false/);
assert.match(policy, /additionalInfrastructureBudgetBRL:\s*0/);
assert.ok(
  !readdirSync('src/app', { recursive: true }).some((file) =>
    /\/(?:route|proxy)\.[cm]?[jt]sx?$/.test('/' + String(file)),
  ),
  'Review server endpoints before publishing.',
);
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
for (const dependency of Object.keys(pkg.dependencies || {}))
  assert.ok(
    !/^(openai|stripe|@vercel\/analytics|@sentry\/nextjs)$/.test(dependency),
    `External service ${dependency} needs review.`,
  );
console.log(
  'Cost policy verified: static hosting, remote services and attachments blocked; no financial data modified. This does not verify the account billing settings.',
);
