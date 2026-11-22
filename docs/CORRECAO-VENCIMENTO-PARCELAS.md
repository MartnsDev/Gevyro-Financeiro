# Correção de vencimento individual — 22/11/2026

## Causa reproduzida

O lápis de uma linha em Movimentações chamava `editPlan`, abrindo a edição da série. Esse formulário grava `plans.date` e chama `revisePlan`. Por regra de preservação do histórico, `revisePlan` mantém as parcelas vencidas, com pagamentos ou ajustes. Assim, alterar a data da série podia salvar corretamente o registro principal e manter a parcela individual em `obligations` com seu vencimento anterior e status atrasado.

Havia dois problemas adicionais: uma busca preenchida trocava o conjunto mensal por todas as parcelas de todos os meses, embora a página continuasse indicando o mês selecionado; e uma edição posterior da série podia regenerar parcelas futuras que já tinham recebido ajustes individuais.

## Correção

- O lápis da movimentação abre **Editar parcela / Editar ocorrência**, identificando o registro por `obligation.id` e salvando por `editOccurrence`. A edição da série continua disponível como ação separada **Editar série futura**, com indicação das parcelas que serão preservadas.
- O lápis da central de parcelamentos abre a seleção de parcelas. Cada linha oferece sua edição individual.
- Detalhes guardam apenas o identificador da parcela e leem seu estado atual em `w.obligations`, evitando uma cópia antiga do objeto.
- A busca respeita o mês selecionado e informa esse escopo no campo. O filtro usa o vencimento atual `obligations.date`.
- `revisePlan` preserva parcelas marcadas com ajustes individuais, além do histórico anteriormente protegido.
- A interface recebe o workspace confirmado somente depois da gravação no Supabase. Dashboard, calendário, movimentações e parcelamentos derivam desse mesmo estado; não há recarregamento manual nem sucesso fictício em caso de falha do servidor.

## Banco e datas

Foi feita uma consulta somente de leitura às rotinas Gevyro instaladas no projeto autorizado. Ela confirmou que o RPC atualiza o documento individual e `due_date` no conflito de identificador, permite a edição individual e preserva o vencimento original. Não houve consulta a registros financeiros pessoais nem gravação de fixtures na produção.

Não é necessária migration: o defeito estava no caminho de edição e na seleção de dados da aplicação. O contrato do RPC e o esquema existente já suportam a mudança.

Os vencimentos continuam sendo datas civis `YYYY-MM-DD`, sem conversão de input para timestamp UTC. O mês deriva da mesma string, e “hoje” usa America/Sao_Paulo. O status compara o vencimento atual com hoje e considera o saldo efetivamente em aberto. `originalDate` é apenas a referência histórica, não a base do filtro mensal ou de atraso.

## Verificações

- Cenário reproduzido com Cama Queen Ortobom, dez parcelas e três pagamentos, exclusivamente em fixtures de teste.
- Mudança de 05/11/2026 para 05/12/2026: saída de novembro, entrada em dezembro, situação pendente antes do vencimento e atraso somente após o novo vencimento, caso continue em aberto.
- Pagamentos, valores, contrato e outras parcelas preservados; pagamentos parciais ou completos continuam contabilizados.
- Busca mensal, dashboard, calendário e central de parcelas atualizados sem recarregar; remontagem do aplicativo lê a data nova do backend simulado.
- Falha do Supabase mantém o formulário aberto e o dado persistido anterior.
- Testes em UTC, America/Sao_Paulo e Pacific/Kiritimati, inclusive no limite de mês UTC/São Paulo.
- PostgreSQL descartável verifica RPC real, `document.date`, índice `due_date`, associação mensal, nova leitura, isolamento e preservação das outras parcelas/pagamentos. O teste é executado também na regressão compartilhada do MCell em ambiente isolado.

A correção não tenta inferir qual parcela real ou qual dia de dezembro havia sido pretendido em uma edição anterior da série. Nenhum registro real é remarcado automaticamente. Para salvar uma correção individual, abra o lápis da linha, ajuste **Vencimento** e confirme a edição da parcela.

## Arquivos da correção

- `src/components/finance-app.tsx`
- `src/components/entry-form.tsx`
- `src/domain/operations.ts`
- `tests/fixtures/rescheduling.ts`
- `tests/rescheduling.test.ts`
- `tests/rescheduling-storage.test.ts`
- `tests/rescheduling-ui.test.tsx`
- `supabase/tests/rescheduling.integration.sql`
- `scripts/test-gevyro-db.sh`
- `scripts/test-shared-db.sh`
- Este relatório.
