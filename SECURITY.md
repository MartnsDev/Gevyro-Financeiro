# Segurança e privacidade

Se encontrar uma vulnerabilidade, **não publique tokens, dados pessoais, backups ou detalhes de exploração em uma issue pública**. Use a opção “Report a vulnerability” da aba Security deste repositório quando ela estiver habilitada. Caso não esteja, solicite ao mantenedor um canal privado sem incluir informações sensíveis.

## Modelo de acesso

- Somente chaves públicas do Supabase podem aparecer no cliente. Elas identificam o projeto e não substituem a autorização no banco.
- Senhas do banco, service role, chaves secretas, Google Client Secret e tokens de deploy permanecem fora do código e de variáveis `NEXT_PUBLIC_*`.
- A nuvem usa Google OAuth com PKCE. Os dados Gevyro exigem sessão OAuth e identidade Google. A identidade de email já existente no MCell pode estar vinculada; login por senha e identidades OAuth adicionais são recusados.
- Não se confia em `user_metadata` para autorização. A migration Google verifica claims de Auth e o método de autenticação, além do proprietário de cada registro.
- Cada usuário só lê seus dados. Escritas diretas nas tabelas são revogadas; os RPCs validam usuário, revisão, valores e integridade em uma transação.
- As tabelas estão no schema privado `gevyro_finance`. Não o exponha na Data API. Não crie RPCs de execução arbitrária de SQL.
- A migration Google não altera os provedores globais do MCell. Administradores, donos do banco e service role possuem privilégios administrativos: RLS não impede esses acessos. Essa credencial nunca pode ir ao navegador.

## Proteção do navegador

Headers preparados para Vercel restringem enquadramento, MIME sniffing, envio de referrer e conexões externas. A CSP permite scripts inline por compatibilidade com o bootstrap da exportação estática Next.js; isso é uma limitação conhecida. Ela não elimina o risco de XSS. Conteúdo do usuário é renderizado como texto pelo React, sem HTML arbitrário.

O service worker só armazena um ícone; não guarda documentos financeiros, páginas, respostas de API ou tokens. A sessão da SPA é persistida pelo SDK no navegador: código malicioso executado na mesma origem poderia acessá-la. Atualizações, revisão de dependências, proteção da origem e evitar scripts externos são essenciais.

Não há persistência financeira local nas novas leituras/gravações. O SDK pode persistir a sessão e o verificador PKCE; dados financeiros ficam na memória enquanto a tela é usada. Ocultar valores é apenas privacidade visual.

A recuperação de versões anteriores lê o banco legado sem criá-lo ou gravar novos registros. A migração exige conta vazia, revisão otimista, conferência do conteúdo relido e verificação de que outra aba não alterou o histórico antes da remoção. Erros preservam a cópia antiga. Backups baixados explicitamente continuam sob responsabilidade do usuário.

## Verificações

`npm run check:security` examina a superfície de publicação, procura padrões conhecidos de segredos e confere controles de Auth, headers e cache. Não detecta toda forma possível de segredo e não certifica ausência de vulnerabilidades.

`npm run test:db:isolated` testa RLS e RPCs em PostgreSQL descartável, sem credenciais ou acesso à produção. `npm run test:db:shared` acrescenta a regressão MCell quando seu checkout local autorizado está disponível. Nunca use backups reais como fixtures públicas.

A aprovação desses testes não prova que as migrations foram instaladas no Supabase real. Consulte o [checklist](docs/CHECKLIST-ENTREGA.md).

## Em caso de exposição

Revogue ou rotacione imediatamente a credencial no provedor, avalie acessos e impacto e remova o material do código e do histórico público. Apagar apenas o arquivo atual não revoga uma credencial já publicada. Preserve evidências em local privado e comunique os usuários afetados conforme a situação.
