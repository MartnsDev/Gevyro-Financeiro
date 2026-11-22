# Instalação real do Supabase — 22/11/2026

## Projeto confirmado

A autorização oficial pela CLI identificou `MCELL`, referência `bcfjhwcsulylodayczkr`, na organização `Martinsdev`. O projeto estava ativo e saudável. Não foi criado outro banco, branch ou serviço adicional.

## Alterações aplicadas

As migrations compartilhadas `202611220001_shared_mcell.sql`, `202611220002_financial_events.sql` e `202611220003_google_access.sql` foram aplicadas juntas em uma transação. A migration histórica standalone ficou excluída.

A revisão do advisor identificou dois avisos relativos a funções privilegiadas expostas. A migration `20261122180826_gevyro_private_rpc.sql`, criada pela CLI, moveu as implementações para `gevyro_finance` e manteve os endpoints públicos com `SECURITY INVOKER`. Ela passou nos testes SQL descartáveis e na regressão MCell antes de ser aplicada.

Apenas `https://gevyro-financeiro.vercel.app/` foi acrescentada aos redirects de Auth. O diff mostrou uma única propriedade alterada; Site URL, provedores, SMTP e outras configurações permaneceram como estavam. Os schemas expostos continuam `public` e `graphql_public`.

## Verificação no projeto real

- 14 tabelas financeiras, todas com RLS.
- 14 políticas restritivas de sessão Google, além das políticas de proprietário.
- Nenhuma tabela financeira permite INSERT/UPDATE/DELETE direto ao papel `authenticated`.
- Os RPCs públicos não permitem execução anônima e não são `SECURITY DEFINER`.
- O endpoint `gevyro_load_workspace` respondeu HTTP 401 / código 42501 a uma chamada anônima com chave pública válida.
- As comparações de nomes, tipos e identificadores dos objetos comerciais existentes permaneceram iguais após a instalação. Não foram consultados registros comerciais nem corpos de funções comerciais nessa comparação.
- O advisor, após a correção, retornou zero avisos referentes ao Gevyro. Existem 15 avisos relativos ao restante do projeto compartilhado, que permanecem fora desta alteração. Isso não constitui certificação de segurança de todo o MCell.

Referência do aviso corrigido: [função SECURITY DEFINER acessível a authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

## Ativação Google e Vercel

O proprietário forneceu as credenciais OAuth. Elas foram configuradas somente no provedor Supabase por um arquivo administrativo temporário privado, sem entrar no GitHub ou em variáveis públicas. O diff declarou apenas as propriedades do Google; demais provedores e configurações MCell permaneceram preservados.

O endpoint público confirmou Google habilitado (HTTP 200). A entrada OAuth/PKCE respondeu HTTP 302 para `accounts.google.com`, com Client ID e callback conferidos. O plano Free foi confirmado pelo proprietário nesta conversa; não houve upgrade nem contratação de recursos. Isso não constitui auditoria de faturamento da organização.

A migration adicional `20261122185409_gevyro_linked_google_sessions.sql` permite contas MCell com identidade de email vinculada ao Google, exigindo AMR OAuth e Google como única identidade externa. Sessões por senha, OTP ou outras identidades OAuth continuam recusadas. Ela passou em PostgreSQL descartável, na regressão MCell e em testes de autorização no banco real usando claims sintéticas dentro de transação READ ONLY com rollback, sem inserir usuários ou consultar registros financeiros.

O código foi liberado com `deploymentVerified: true` e a variável de produção habilitada. O aplicativo mantém os dados financeiros somente no Supabase e exige login. A atualização entre dispositivos ocorre a cada 30 segundos com a tela visível e ao retomar a janela/conexão; formulários abertos pausam a atualização para preservar rascunhos.

## Limites da homologação

O consentimento Google, a troca final do código OAuth e a gravação com uma conta Google real precisam ser exercitados pelo usuário entrando no aplicativo. A validação de várias contas/dispositivos em navegador não foi executada nesta sessão. Os testes automatizados de interface usam fixtures e backend simulado; os testes SQL cobrem o motor e a autorização. Nenhum histórico financeiro local foi migrado ou apagado por esta instalação.
