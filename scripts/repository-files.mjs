import { readdirSync } from 'node:fs';
// Explicit publication surface: no environment, runtime, build, database dump or local state.
const roots = ['src', 'public', 'tests', 'scripts', 'supabase', 'docs', '.github'];
const rootFiles = [
  'README.md',
  'SECURITY.md',
  'AGENTS.md',
  '.gitignore',
  '.prettierignore',
  '.prettierrc',
  '.prettierrc.json',
  '.env.example',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'next-env.d.ts',
  'next.config.ts',
  'postcss.config.mjs',
  'eslint.config.mjs',
  'vitest.config.ts',
  'playwright.config.ts',
  'vercel.json',
];
const entries = readdirSync('.', { withFileTypes: true });
export function repositoryFiles() {
  const files = entries.filter((e) => e.isFile() && rootFiles.includes(e.name)).map((e) => e.name);
  for (const root of roots) {
    if (!entries.some((e) => e.name === root && e.isDirectory())) continue;
    for (const name of readdirSync(root, { recursive: true, withFileTypes: true })) {
      if (!name.isFile()) continue;
      const path = name.parentPath + '/' + name.name;
      const relative = path.startsWith(process.cwd() + '/')
        ? path.slice(process.cwd().length + 1)
        : path;
      if (/(^|\/)(\.temp|\.branches|\.cache)(\/|$)/.test(relative)) continue;
      if (
        /(^|\/)(\.env(?:\..*)?|node_modules|\.git|\.next|\.vercel|out|coverage)(\/|$)/.test(
          relative,
        ) ||
        /\.(?:pem|key|p12|pfx|dump|log|tsbuildinfo)$/.test(relative)
      )
        throw new Error('Arquivo privado inesperado na superfície de publicação: ' + relative);
      files.push(relative);
    }
  }
  return files.sort();
}
