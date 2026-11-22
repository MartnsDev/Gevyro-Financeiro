# Decisões de arquitetura

## Autorização de Supabase MCell — 22/11/2026

A política agora admite uma exceção restrita ao Supabase do MCell, somente depois de confirmar o endereço, plano Free, migration isolada e Auth. `shared-supabase.ts` mantém `deploymentVerified: false`; o SDK não é inicializado enquanto a verificação estiver pendente. Chaves privadas do MCell não entram no Gevyro. RPCs Gevyro acessam tabelas no schema exclusivo `gevyro_finance`; o schema não precisa ser exposto na API. O uso real está bloqueado pela indisponibilidade DNS do endereço salvo e falta de acesso administrativo. Ver SUPABASE-MCELL.md.

## Proteção de custos

A revisão solicitada pelo proprietário aplica orçamento adicional de R$ 0,00. `cost-policy.ts` bloqueia serviços remotos e anexos antes de inicializar qualquer cliente. O adaptador rejeita operações remotas sem fallback local silencioso. `check-cost-policy.mjs` interrompe builds com bindings de dados ou política alterada. Isso é proteção de código e não um hard cap financeiro no CDN ou na conta ChatGPT. A integração Supabase descrita a seguir está preparada, mas permanece bloqueada nessa configuração. O workspace local mantém a mesma base e esquema; nenhuma migração destrutiva foi feita.

## Plataforma e implantação

Next.js App Router, React e TypeScript estrito, compilação estática (`output: export`). Operações remotas são executadas por funções PostgreSQL autenticadas no Supabase; não existem endpoints Next que finjam executar operações em um servidor ausente. Essa escolha permite Vercel e hospedagem estática, mantendo a autorização junto aos dados. A interface é uma SPA com navegação de domínio; os módulos compartilham filtros e período. Não há cookies de sessão no servidor estático.

Node testado: 20.20.2. Next 16.4.6 e React 19.3.1. Supabase JS foi fixado em 2.99.0 porque a versão corrente do SDK requer Node 22. Vitest 4 é compatível com Node 20. Bibliotecas instaladas após consulta à documentação e ao registro npm; o lockfile deve ser usado via `npm ci`.

## Camadas

- `domain/types.ts`: contratos entre interface, cálculos e persistência.
- `domain/finance.ts`: dinheiro em centavos inteiros, parcelas, datas, faturas, saldos e projeções.
- `domain/operations.ts`: edição de séries e ocorrências, extensão de recorrências, estornos e reversão de importação.
- `domain/validation.ts`: schemas Zod, limites e integridade de referências para entrada, restauração e gravação.
- `lib/storage.ts`: adaptador IndexedDB / RPC Supabase com confirmação e revisão otimista.
- `components/ui`: componentes locais no padrão shadcn (CVA, Slot e Dialog Radix), com foco, fechamento por Escape e rótulos acessíveis.
- `components`: formulários React Hook Form, gráficos Recharts e coordenação da aplicação.

Não há TanStack Query porque a versão atual mantém um único espaço carregado e não se beneficia de um segundo cache. Consultas incrementais e separação da coordenação por domínio devem preceder suporte a históricos muito grandes.

## Banco

Cada entidade tem uma linha, propriedade explícita e chave composta `(user_id, id)`. Campos de apresentação ficam em documento JSONB. Identificadores relacionais, valores monetários e datas de caixa/vencimento são extraídos em colunas tipadas, com checks, índices e FKs compostas que impedem referências entre usuários. IDs-base são UUIDs; ocorrências derivam deterministicamente do UUID do plano e do índice da parcela; pagamentos de fatura acrescentam a chave da operação ao identificador do item.

Essa é uma modelagem documental por entidade, com integridade relacional nas fronteiras financeiras, e não a normalização completa proposta no prompt. Uma evolução deve normalizar metadados e reduzir o volume de sincronização.

`load_workspace` e `save_workspace` obtêm o usuário de `auth.uid()`. Não aceitam um user_id do cliente. Escrita direta é revogada. A gravação usa advisory lock por usuário, revisão otimista, transação e verificação de sobrepagamento. RLS protege leituras em todas as tabelas. Campos liquidados e pagamentos históricos não podem ser reescritos silenciosamente. Estornos preservam os registros. O servidor mantém a revisão anterior em auditoria, privada e isolada. A política de retenção desses snapshots deve ser definida antes de escalar.

O modo local é um espaço separado, identificado na interface e salvo por transações IndexedDB. Não se mistura automaticamente com a conta autenticada. A migração entre espaços pode usar exportação/restauração com confirmação, respeitando as restrições de histórico da nuvem. IndexedDB não é criptografado pela aplicação. O navegador pode remover seu armazenamento; o backup exportado é necessário.

## Invariantes financeiras

1. Todos os cálculos financeiros usam centavos inteiros seguros. Decimal.js converte entradas e aplica arredondamento half-up. Divisões de parcelas distribuem o resto nas primeiras parcelas.
2. Datas civis são strings ISO. A referência de hoje usa America/Sao_Paulo. Dias 29–31 são ajustados ao último dia do mês, sempre a partir da data original, evitando deriva.
3. Obrigações não são movimentos de caixa. Somente pagamentos efetivos não estornados movimentam saldos.
4. Transferências internas não são receitas ou despesas. Somente a tarifa entra nas despesas de caixa.
5. Compras no cartão comprometem o limite. Pagamentos de fatura são alocados aos próprios itens, sem criar nova despesa. Compra no dia de fechamento entra na fatura que está fechando. Limite segue a regra de principal total restante.
6. Reservas de metas não são consumo e não alteram o saldo bancário. Reduzem dinheiro livre. Reservas cadastradas não podem exceder o saldo existente.
7. Dinheiro livre deduz pendências até o fim do mês selecionado, inclusive atrasos anteriores, e reservas. Receitas previstas não são saldo disponível.
8. Recorrências são estendidas em horizonte móvel de 60 meses, com IDs estáveis. A leitura deriva ocorrências faltantes e a próxima gravação as materializa. Cancelamentos e edições não recriam ocorrências existentes.
9. Alteração de série preserva ocorrências passadas ou com pagamentos. Parcelamentos redistribuem somente o total restante entre parcelas futuras. Edição individual não muda o valor de uma parcela de contrato finito.
10. Posições e dívidas nesta versão são avaliações manuais. Não geram caixa nem rentabilidade fictícia. Não duplicar o mesmo ativo em conta e posição.
11. Projeções usam compromissos cadastrados, incorporam atrasos e são estimativas. Cenários não modificam o livro real. A renda média usa meses completos, incluindo períodos sem recebimento.
12. Importação tem prévia e mapeamento, SHA-256 do conteúdo e deduplicação conservadora por descrição, tipo, valor, data e conta. Coincidências legítimas podem ser ignoradas; revisar o lote é necessário. A reversão estorna e cancela sem apagar o histórico.

## Segurança e limites de verificação

Não há service role no cliente ou credenciais no código. Supabase precisa de confirmação de email, limites de autenticação, SMTP, políticas de senha e URLs autorizadas. A validação Zod protege o adaptador local; a nuvem aplica autorização, checks, FKs e regras contábeis no PostgreSQL. O teste SQL usa um PostgreSQL 16 isolado com `auth.uid()` de teste e exercita RLS real. Isso não substitui a validação de Auth/REST contra um projeto Supabase real.

O service worker só guarda o ícone público. Não intercepta HTML, tokens, documentos financeiros ou API. O manifesto contém ícones PNG 192/512. Não foi implementada fila offline de operações remotas. A interface só confirma gravações depois do sucesso da persistência.

## Referências consultadas

- Next.js: https://nextjs.org/docs/app/getting-started/installation e documentação distribuída em `node_modules/next/dist/docs`.
- Supabase: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- shadcn: https://ui.shadcn.com/docs/installation/next
- Recharts: https://recharts.github.io/en-US/
- React Hook Form: https://react-hook-form.com/get-started
- Zod: https://zod.dev/
- Decimal.js: https://mikemcl.github.io/decimal.js/
- date-fns: https://date-fns.org/

Pesquisa funcional: Organizze (contas, cartões, relatórios), Mobills (organização e cartões), YNAB e Actual (alocação de recursos), Wallet (pagamentos planejados). A URL de recursos Monarch retornou 404; análise aprofundada desse produto não foi concluída. Gevyro.com.br não ficou acessível; a identidade segue o briefing, sem afirmar equivalência visual validada.
