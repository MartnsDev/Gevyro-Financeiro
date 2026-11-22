# Publicação e acesso Google

## Destino autorizado

Repositório único: **https://github.com/MartnsDev/Gevyro-Financeiro**. Antes de enviar código, confira proprietário e nome completos. Não use o repositório de hospedagem anterior nem outro projeto GitHub.

A superfície de publicação está em `scripts/repository-files.mjs`: código, documentação, imagens, testes e configuração de produção. Não inclui `.env.local`, `.git`, `.next`, `node_modules`, `out`, `.vercel`, credenciais ou estado local de Sites. `npm run check:security` examina essa superfície antes do envio.

## Vercel

Importe exclusivamente esse repositório. A configuração versionada usa `npm run build`, saída estática `out` e headers de segurança em `vercel.json`. Não é necessário contratar banco, Blob, analytics ou outro adicional Vercel. Preserve orçamento adicional zero e confira o plano da conta antes de criar recursos.

O código público não contém credenciais administrativas. Configure no ambiente Vercel apenas:

- `NEXT_PUBLIC_SUPABASE_URL`: URL pública do projeto MCell confirmado.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: chave pública publishable (ou a anon pública compatível).
- `NEXT_PUBLIC_SUPABASE_SHARED_PROJECT_ENABLED`: `true` somente após homologar migrations/Auth.
- `NEXT_PUBLIC_APP_URL`: origem HTTPS definitiva, sem domínio provisório inventado.

As variáveis públicas entram no bundle por definição. Não são um cofre. O aplicativo nunca precisa de service role, senha PostgreSQL ou Google Client Secret no build ou no navegador.

A trava `deploymentVerified: false` em `src/lib/shared-supabase.ts` permanece até a verificação real. Somente alterar env não ativa a nuvem. Registrar a verificação em código e refazer build/deploy é uma etapa posterior à homologação. Enquanto a nuvem estiver desabilitada, o acesso financeiro fica bloqueado. Não há modo financeiro local.

## Supabase compartilhado

1. Confirme projeto `bcfjhwcsulylodayczkr`, plano Free e escopo MCell. Inspecione estrutura e faça backup operacional sem publicar dados reais.
2. Aplique, em ordem, somente `202611220001_shared_mcell.sql`, `202611220002_financial_events.sql` e `202611220003_google_access.sql`. Se uma já estiver instalada, valide a versão antes de prosseguir. Não execute a migration standalone `202611200001_financial_workspace.sql` nem `supabase db push` indiscriminado.
3. Mantenha `gevyro_finance` fora dos schemas expostos pela Data API. São necessários apenas os dois RPCs públicos prefixados Gevyro. Não crie executor SQL genérico.
4. Habilite Google OAuth com as credenciais próprias no painel Supabase. O Google Client Secret fica no provedor. No Google Cloud, a URI de retorno é a URI `/auth/v1/callback` informada pelo Supabase; siga a tela do projeto confirmado. Não desabilite nem substitua provedores usados pelo MCell.
5. Acrescente apenas a origem HTTPS definitiva do Gevyro, com `/` final, aos redirects autorizados do Supabase. Preserve os redirects e a Site URL do MCell. Evite curingas amplos e não libere indiscriminadamente todas as previews Vercel.
6. O Gevyro oferece só Google e usa PKCE. A terceira migration exige sessão OAuth e Google como único provedor da conta para acessar qualquer dado Gevyro. Contas com provedores vinculados adicionais são recusadas; não remova identidades existentes de usuários da loja.
7. Com duas contas Google de teste autorizadas, teste retorno, leitura/gravação, expiração/refresh, logout, nova sessão, conflito e acesso cruzado via API. Aplique e confirme RLS no projeto real, não só no banco descartável.
8. Só após aprovação, marque a verificação em código, habilite a variável de ambiente e faça novo build/deploy. Exporte um backup local antes de copiar explicitamente para uma conta vazia.

RLS protege dados de outros usuários e acessos anônimos; não retira privilégios administrativos do dono do banco ou da service role. A segurança depende de manter essas credenciais privadas.

## Checklist de homologação remota

- Deploy concluído com URL e commit conferidos, sem bundle contendo segredo.
- Headers Vercel recebidos por HTTPS e comportamento CSP validado.
- Google consent/redirect reais funcionam; nenhum formulário de senha no Gevyro.
- Sessão inválida não carrega dados; logout e troca de usuário não mostram o espaço anterior.
- Usuário A não consulta ou grava no espaço B, inclusive por RPC/API direta.
- Sessões por senha, anônimas ou com claims de usuário editáveis não acessam dados Gevyro.
- Pagamento, ajuste, importação e backup testados sem registros financeiros reais.
- Layout desktop/mobile, gráficos e PWA verificados em navegador/dispositivo.
- Histórico MCell, login da loja e configurações compartilhadas preservados.

## Referências oficiais

[Google no Supabase](https://supabase.com/docs/guides/auth/social-sign-in/auth-google), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [redirects](https://supabase.com/docs/guides/auth/redirect-urls) e [configuração Vercel](https://vercel.com/docs/project-configuration).

## Persistência exclusiva por conta

A nova edição exige Google, remove o fallback IndexedDB e atualiza os dados a cada 30 segundos com a tela visível e ao retomar conexão/janela. A sessão pode persistir pelo SDK, mas registros financeiros não são armazenados no dispositivo. Recuperação do histórico anterior é somente explícita; exclusão ocorre apenas após conferência na nuvem. Nenhuma migração local pode substituir um espaço remoto existente.
