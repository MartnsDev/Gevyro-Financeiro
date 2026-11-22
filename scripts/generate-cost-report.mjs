import { readFileSync, writeFileSync } from 'node:fs';
const markdown = readFileSync('docs/CUSTOS-E-BACKUP.md', 'utf8');
const escape = (text) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const inline = (text) =>
  escape(text)
    .replace(
      /\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
    )
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
const paragraphs = markdown
  .trim()
  .split(/\n\s*\n/)
  .map((block) => {
    if (block.startsWith('# ')) return `<h1>${inline(block.slice(2))}</h1>`;
    if (block.startsWith('## ')) return `<h2>${inline(block.slice(3))}</h2>`;
    if (block.startsWith('- '))
      return `<ul>${block
        .split('\n')
        .map((line) => `<li>${inline(line.replace(/^- /, ''))}</li>`)
        .join('')}</ul>`;
    return `<p>${inline(block.replaceAll('\n', ' '))}</p>`;
  })
  .join('\n');
writeFileSync(
  'public/custos-e-backup.html',
  `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Custos e backup | Gevyro Finanças</title><link rel="icon" href="/icon-32.png"><style>:root{color-scheme:light dark;font-family:Inter,system-ui,sans-serif;background:#f5f8f7;color:#243931}*{box-sizing:border-box}body{margin:0;font-size:16px;line-height:1.85}header,main{max-width:880px;margin:auto;padding:24px}header{display:flex;align-items:center;gap:14px}header img{width:42px;height:42px;object-fit:contain}header a{margin-left:auto}main{background:#fff;border:1px solid #e4ece8;border-radius:16px;padding:40px;margin-bottom:48px}h1{font-size:32px;line-height:1.3;letter-spacing:-1px;margin:0 0 25px}h2{font-size:22px;line-height:1.5;margin:40px 0 14px;color:#067651}a{color:#047b56;text-underline-offset:3px}li{margin:12px 0}code{background:#edf5f0;border-radius:4px;padding:2px 5px;overflow-wrap:anywhere;font-size:.9em}@media(prefers-color-scheme:dark){:root{background:#101817;color:#e1eae5}main{background:#17211f;border-color:#2a3833}h2,a{color:#40c598}code{background:#263d32}}@media(max-width:640px){header{padding:16px}main{margin:0 12px 30px;padding:23px 19px}h1{font-size:26px}h2{font-size:20px}body{font-size:16px}header strong{font-size:14px}header a{font-size:14px}}</style></head><body><header><img src="/brand/gevyro-mark.png" alt="Logo Gevyro"><strong>Gevyro Finanças</strong><a href="/">Voltar ao aplicativo</a></header><main>${paragraphs}</main></body></html>`,
);
console.log('Public cost and backup report generated. No user financial data included.');
