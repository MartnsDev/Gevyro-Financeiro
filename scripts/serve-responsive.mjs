// Isolated local test surface: no production route, credential, service or financial storage.
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/postcss';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const harness = path.join(root, 'tests/responsive/harness');
let workspace = null,
  revision = 0;
const server = await createServer({
  configFile: false,
  root: harness,
  cacheDir: path.join(root, '.openai/local/vite-responsive'),
  publicDir: path.join(root, 'public'),
  resolve: {
    alias: [
      {
        find: /^(?:@\/lib\/supabase|\.\/supabase)$/,
        replacement: path.join(harness, 'mock-supabase.ts'),
      },
      { find: 'next/image', replacement: path.join(harness, 'image.tsx') },
      { find: '@', replacement: path.join(root, 'src') },
    ],
  },
  define: {
    'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(
      'https://bcfjhwcsulylodayczkr.supabase.co',
    ),
    'process.env.NEXT_PUBLIC_SUPABASE_SHARED_PROJECT_ENABLED': JSON.stringify('true'),
  },
  css: { postcss: { plugins: [tailwindcss()] } },
  server: { host: '127.0.0.1', port: 4178, strictPort: true, fs: { allow: [root] } },
  plugins: [
    {
      name: 'gevyro-memory-rpc',
      configureServer(vite) {
        vite.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith('/__test/')) return next();
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const input = JSON.parse(Buffer.concat(chunks).toString() || '{}');
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          if (req.url === '/__test/oauth') {
            res.end(JSON.stringify({ received: input }));
            return;
          }
          if (req.url === '/__test/reset') {
            workspace = input;
            revision = 1;
            res.end('{}');
            return;
          }
          if (req.url === '/__test/rpc') {
            if (input.name === 'gevyro_load_workspace') {
              res.end(
                JSON.stringify({ data: workspace ? { workspace, revision } : null, error: null }),
              );
              return;
            }
            if (input.name === 'gevyro_save_workspace') {
              if (input.args.p_revision !== revision) {
                res.end(JSON.stringify({ data: null, error: { message: 'revision_conflict' } }));
                return;
              }
              workspace = input.args.p_workspace;
              revision++;
              res.end(JSON.stringify({ data: revision, error: null }));
              return;
            }
          }
          res.statusCode = 404;
          res.end('{}');
        });
      },
    },
  ],
});
await server.listen();
console.log('Gevyro responsive tests: http://127.0.0.1:4178');
