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

## Estado do aplicativo

O código da Vercel exige conta e não faz novas gravações financeiras locais. A chave pública fornecida pelo proprietário foi validada e atualizada no ambiente de produção. A ativação permanece bloqueada até concluir Google e conferir o plano; a trava de verificação em código e a variável de habilitação ainda não foram liberadas.

O Google respondeu como desativado no endpoint público de Auth. O proprietário informou que vai conferir a configuração. É necessário preencher Client ID e Client Secret diretamente no painel Supabase. A URI de callback do provedor é `https://bcfjhwcsulylodayczkr.supabase.co/auth/v1/callback`; o redirect do aplicativo já está autorizado. Não enviar esses segredos ao repositório.

O plano da organização MCell não pôde ser confirmado pelas consultas disponíveis da CLI. Nenhum plano, faturamento ou adicional foi alterado. A confirmação do plano Free continua pendente.

A homologação com duas contas Google, criação de registros reais de teste e sincronização entre dispositivos ainda depende dessa ativação. Os testes automatizados da aplicação usam fixtures e backend simulado; os testes SQL usam PostgreSQL descartável. Nenhum histórico financeiro local foi migrado ou apagado por esta instalação.
