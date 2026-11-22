# Controle financeiro individual — 22/11/2026

Esta atualização amplia o aplicativo existente. Não recria o projeto, não importa o exemplo da Cama Queen e não altera automaticamente os registros financeiros anteriores.

## Parcelas e pagamentos

- A compra mantém seu contrato e cada parcela mantém seu identificador. O valor original contratado continua disponível mesmo quando uma parcela recebe uma correção individual.
- Na central de parcelamentos, **Consultar parcelas** mostra valores, vencimentos, situação, total pago, saldo e progresso. É possível selecionar uma, várias ou todas as parcelas abertas para pagar ou antecipar.
- A edição individual aceita descrição, categoria, valor, vencimento, observações e situação. O primeiro ajuste preserva o vencimento e o valor anteriores nos campos `originalDate` e `originalAmount`. Não há preenchimento automático dos registros antigos durante a migração.
- Antecipação é a natureza do pagamento, calculada pela data efetiva anterior ao vencimento original. A situação financeira continua paga, parcial, pendente, vencida ou cancelada. Uma parcela quitada não passa a vencida.
- Data, valor e conta de um pagamento podem ser corrigidos por estorno do original e registro do substituto em uma única gravação. Pagamentos anteriores nunca são apagados.
- Tornar pendente ou cancelar estorna os pagamentos ativos. Reembolsos e ajustes dependentes podem impedir a operação; nesse caso a gravação inteira é rejeitada.

## Investimentos

A carteira tem oito classes: renda fixa, ações, fundos imobiliários, ETFs, Tesouro Direto, fundos de investimento, criptomoedas e outros investimentos. Posições antigas sem classificação continuam legíveis; é necessário classificá-las para registrar novas operações.

Cada ativo pode ter ticker, subcategoria, instituição, quantidade, custo e avaliação manual. Há operações de compra, venda, aporte, resgate, rendimento e provento, com conta, data, valor financeiro, quantidade/preço unitário quando aplicáveis, taxas, impostos e observações.

Aporte reduz caixa e aumenta a posição. O principal não entra no consumo. Taxas/impostos pagos podem reduzir o patrimônio. Venda com unidades baixa custo e avaliação proporcionalmente; proventos líquidos aumentam caixa sem aumentar o principal. Nenhuma cotação é consultada ou inventada.

A carteira mostra custo remanescente da posição, avaliação informada, variação nominal percentual quando há custo, distribuição por classe, operações, evolução das avaliações e histórico de alterações. A variação da posição **não é** rentabilidade total ajustada por fluxos, retorno anualizado ou apuração fiscal.

A última operação de investimento pode ser estornada ou corrigida, desde que nenhuma avaliação ou operação posterior invalide sua posição. A correção acrescenta um estorno e uma nova operação, preservando o original. As datas devem respeitar a última avaliação e a ordem das operações. Para uma posição com unidades, informe unidades também nos novos aportes/resgates. Um resgate sem unidades fica limitado à avaliação disponível; para vender com lucro por unidades, cadastre a quantidade real antes da operação.

## Dashboard, cartão e relatórios

- Indicadores separados de consumo na data da compra, pagamentos de caixa, pendências, vencidas, parcelas futuras, aportes, transferências próprias, pagamentos de dívidas/faturas, caixa e patrimônio financeiro líquido.
- O consumo de uma compra parcelada aparece integralmente na perspectiva de compra; os vencimentos aparecem na competência; pagamentos aparecem somente no caixa. Pagar a fatura aloca pagamentos às compras e reduz a dívida, sem criar outra obrigação de consumo.
- Projeções de 3, 6 e 12 meses, encerramento de parcelamentos e orçamento liberado continuam disponíveis. São projeções das obrigações e hipóteses informadas, sem prever automaticamente novas operações de investimento.
- Transferências existentes podem ser editadas, com recálculo das duas contas na mesma transação.

## Histórico e desfazer

As novas alterações registram antes/depois e data em um histórico por registro e global. Registros antigos não recebem um histórico fictício. O banco também mantém sua auditoria anterior com revisão e estado anterior.

O comando **Desfazer alteração** permite restaurar edições estruturais quando o registro ainda corresponde ao estado editado e não há edição posterior ou dependências incompatíveis. Movimentos monetários usam correções/estornos próprios. Ajustes, reembolsos, reservas e movimentos de dívida podem ser corrigidos por estorno vinculado e novo movimento. Reembolsos estornados recompõem também o consumo líquido; juros devolvidos recompõem caixa e relatórios. Estornos dependentes ou duplicados são bloqueados. Eventos antigos do livro permanecem imutáveis; a atualização não reescreve ou reconstrói suas posições históricas.

## Migração e segurança

Arquivo: `20261122195625_gevyro_financial_control.sql`, gerado inicialmente pela CLI oficial.

A migração altera somente validações e rotinas do esquema privado `gevyro_finance` e suas restrições de taxas/tipos do livro. Não executa backfill, não apaga dados, não adiciona serviços e não altera tabelas ou rotinas comerciais do MCell. Preserva os RPCs públicos invoker, isolamento por usuário, sessão Google, RLS, revisão otimista e transação única.

O banco rejeita parcelas lógicas duplicadas, sobrescrita do vencimento/valor original, redução abaixo do pago, alteração ou exclusão do histórico de pagamentos/eventos, perda do histórico de alterações e operações de investimento com caixa, custo, quantidade ou avaliação incompatíveis. O controle de revisão impede que um segundo dispositivo sobrescreva silenciosamente uma gravação mais recente.

## Validação e limites

Os testes incluem o exemplo de dez parcelas em ambiente isolado, antecipação múltipla, mudança individual de vencimento, correção de pagamento, centavos/unidades fracionárias, taxas/impostos, compra/venda/provento/estorno, cartão parcial/antecipado, transferência com tarifa e formulários de interface.

Também são executados TypeScript, ESLint, formatação, compilação estática, verificações de custo/segredos, testes de RLS/atomicidade e regressão do MCell em PostgreSQL descartável. Os testes de interface são de DOM com gráficos substituídos; não equivalem a uma sessão Google real nem a uma homologação visual em dispositivos físicos.

Não há cotações automáticas, Open Finance, corretora conectada, apuração fiscal ou sincronização offline. Os dados financeiros novos continuam exclusivamente no Supabase. Em conflito ou falha de conexão, a gravação não é substituída por uma cópia financeira local.
