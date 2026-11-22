# Integração Gevyro com o Supabase do MCell

Autorização do proprietário em 22/11/2026: reutilizar o Supabase do MCell, mantendo orçamento adicional de R$ 0,00. Não criar um segundo projeto, contratar serviços ou alterar planos.

## Situação verificada

- A configuração foi localizada em `../Martins Cell/.env.local`. Apenas URL e chave pública foram copiados para o `.env.local` ignorado do Gevyro. Nenhuma chave service role, credencial de pagamentos, PIN ou segredo de sessão foi copiado para o aplicativo.
- O endereço encontrado foi `bcfjhwcsulylodayczkr.supabase.co`. O proprietário confirmou esse mesmo endereço nesta conversa. Em consulta em 22/11/2026, `supabase.com` resolveu normalmente, mas o hostname do projeto retornou `ENOTFOUND`. Isso não prova que o projeto foi apagado: é necessário confirmar o endereço e o estado no painel.
- Não há conexão administrativa Supabase confirmada nesta sessão. Não foi possível conferir plano, uso, tabelas instaladas, Auth ou aplicar SQL remoto.
- A rede do aplicativo permanece bloqueada por `deploymentVerified: false` e `NEXT_PUBLIC_SUPABASE_SHARED_PROJECT_ENABLED=false`. Portanto, a preparação não é uma conexão ativa e não envia dados locais.
- Não houve alteração nos arquivos, banco de produção, catálogo, pedidos ou configurações Auth do MCell.

## Nova verificação após a retomada do projeto — 22/11/2026

O hostname voltou a resolver e a autenticação respondeu HTTP 200. Os metadados locais do vínculo identificam o projeto como MCELL, com a mesma referência confirmada pelo proprietário. A API respondeu normalmente e seu catálogo de metadados foi consultado sem ler registros comerciais.

A função `gevyro_load_workspace` retornou HTTP 404 / PGRST202: a migração Gevyro ainda não foi aplicada. A integração administrativa Supabase continua aparecendo como não instalada e não há navegador conectado, token de administração ou senha PostgreSQL disponíveis. A chave pública e a service role existente não fornecem um executor SQL; nenhuma função genérica foi criada para contornar isso. Ainda não foi possível verificar o plano efetivo ou aplicar a migração. O bloqueio de ativação permanece e os dados locais/comerciais não foram alterados.

## Isolamento e migração correta

**Não aplique a migração standalone `202611200001_financial_workspace.sql` no projeto compartilhado do MCell.** Ela foi escrita para um banco dedicado e usa nomes genéricos no schema public.

Use, em ordem, `supabase/migrations/202611220001_shared_mcell.sql`, `supabase/migrations/202611220002_financial_events.sql` e `supabase/migrations/202611220003_google_access.sql`. A terceira restringe o acesso Gevyro a sessões Google OAuth e adiciona RLS restritiva, sem desabilitar provedores MCell. Não aplique a migration standalone. A segunda migração acrescenta o livro imutável de movimentos e as notificações, preservando todos os objetos anteriores. Ela abre uma transação, cria o schema `gevyro_finance`, as tabelas financeiras e duas funções públicas com nomes exclusivos:

- `public.gevyro_load_workspace()`
- `public.gevyro_save_workspace(jsonb, bigint)`

As tabelas e o histórico ficam em `gevyro_finance`, com RLS, chaves compostas por proprietário, validação de pagamentos, revisão otimista e auditoria. Não adicione o schema privado aos schemas expostos da API: somente as funções públicas são necessárias. Uma colisão de nomes interrompe a migração; ela não substitui objetos existentes.

A gravação atualiza apenas documentos alterados. A auditoria registra as versões anteriores dos registros efetivamente modificados/removidos, em vez de duplicar o workspace inteiro em cada operação. Há limite de 12 MiB por payload e 32 MiB de documentos de auditoria por usuário. Esses limites são locais ao domínio Gevyro, não métricas do plano Supabase. Ao atingir o limite, a transação falha e preserva os dados anteriores. Não há poda automática de histórico.

A mesma instância compartilha Auth, infraestrutura, franquias e administração. Os administradores do Supabase continuam tendo os poderes próprios do projeto. As políticas do MCell não são copiadas para as tabelas financeiras. Não se atribui função administrativa do MCell a usuários Gevyro. O trigger de perfil já existente no MCell poderá criar um perfil ao cadastrar uma nova conta Auth, conforme o comportamento atual desse projeto; não será alterado por esta migração.

## Etapas para ativação

1. Conectar o Supabase nesta sessão ou confirmar no painel qual é o projeto MCell atual. Se o endereço tiver mudado, atualizar a restrição de projeto e a configuração pública após identificar o projeto correto, sem aproveitar chaves privadas no navegador.
2. Verificar a organização e o projeto: o plano precisa continuar Free, sem novos adicionais ou alterações de faturamento. Se estiver em plano pago, não prosseguir sem esclarecer como manter o orçamento adicional zero. Não alterar o plano da loja.
3. Inspecionar schemas e funções existentes somente em leitura e fazer o backup operacional adequado antes de uma alteração de estrutura. Não consultar/exportar registros comerciais sem necessidade.
4. Aplicar somente as três migrações isoladas acima, em ordem em uma transação. Não executar `supabase db push` indiscriminadamente, pois a pasta também contém a migração standalone histórica.
5. Validar os RPCs e a RLS com dois usuários de teste exclusivos, sem remover usuários comerciais existentes. Não criar uma função genérica que execute SQL remoto pelo navegador.
6. Em Authentication → URL Configuration, **acrescentar** `https://gevyro-financas-pessoal.trustworthyfrog8.chatgpt.site` à lista de redirects autorizados, preservando todos os endereços existentes. **Não trocar a Site URL do MCell**, nem alterar provedores, SMTP ou callbacks já usados pela loja. Confira os templates: um template que force Site URL pode exigir ajuste cuidadoso antes de permitir recuperação/cadastro no Gevyro.
7. Só depois de validar projeto/Free/migração/Auth, registrar `deploymentVerified: true` e `NEXT_PUBLIC_SUPABASE_SHARED_PROJECT_ENABLED=true`, executar os testes/build e atualizar o mesmo Site. A exceção autoriza exclusivamente o hostname confirmado do MCell; APIs e serviços arbitrários continuam bloqueados.
8. Entrar no Gevyro. A sessão usa a chave de armazenamento `gevyro-financas-auth-v1`, evitando confusão de sessões quando se trabalha com origens locais.
9. Exportar o JSON/CSV local. Se a conta remota estiver vazia, usar Perfil → Copiar dados locais para esta conta. A cópia exige confirmação, usa revisão otimista e preserva o original IndexedDB. Contas remotas com espaço existente não são sobrescritas ou mescladas automaticamente. Falhas mantêm ambos os históricos.

Não há promessa de sincronização offline. Falhas de rede devem ser exibidas e a aplicação não pode apresentar uma gravação remota como concluída antes da confirmação.

## Testes disponíveis

```bash
npm run test:db:shared
npm test
npm run lint
npm run typecheck
npm run build
```

`test:db:shared` cria um PostgreSQL descartável em `/tmp`, aplica as migrações locais do MCell, registra fingerprints das tabelas e funções existentes, aplica a migração Gevyro, exercita RLS, pagamentos, estorno, conflitos e rollback, confirma a preservação do MCell e executa a regressão comercial. Não acessa nenhum Supabase real. Usa o checkout vizinho por padrão; `MCELL_SOURCE_DIR` permite indicar outro checkout local. A migration histórica standalone e seu teste separado continuam preservados.

## Fontes e restrições

RLS e permissões precisam ser verificadas no projeto real, não apenas em fixtures. As regras de Auth e os limites são compartilhados quando a mesma instância é usada. [RLS oficial](https://supabase.com/docs/guides/database/postgres/row-level-security), [schemas e exposição de API](https://supabase.com/docs/guides/api/using-custom-schemas), [redirects de Auth](https://supabase.com/docs/guides/auth/redirect-urls).

O plano Free não cobra uso, mas pode restringir serviços ao ultrapassar cotas. O Spend Cap do Pro não torna esse plano gratuito e não cobre todos os adicionais. O plano efetivo do MCell não pôde ser verificado nesta sessão. [Controle de custos oficial](https://supabase.com/docs/guides/platform/cost-control).

## Publicação solicitada no GitHub e Vercel

O destino atual de código é exclusivamente `MartnsDev/Gevyro-Financeiro`. A autenticação do Gevyro agora foi preparada somente com Google/PKCE. Não usar instruções históricas de senha/cadastro. Consulte [PUBLICACAO.md](PUBLICACAO.md) para as três migrations e redirects da origem Vercel definitiva. A homologação remota continua pendente.
