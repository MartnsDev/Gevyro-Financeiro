# Verificação funcional — 22/11/2026

A atualização de controle financeiro individual passou em **131 testes automatizados, distribuídos em 23 arquivos**. Os formulários novos têm testes de DOM; não são uma homologação visual em navegador/dispositivos reais.

## Cálculos e interface

- Antecipação de uma ou várias parcelas, pagamento parcial, vencimento individual, preservação do original, correção de data/valor/conta e histórico antes/depois.
- Exemplo de dez parcelas / três pagas / sete restantes executado somente nos testes.
- Aporte sem consumo ou perda do principal no patrimônio, compra/venda por unidades, custo proporcional, taxas/impostos, proventos líquidos e estornos ordenados.
- Centavos e unidades com até 12 casas decimais; preço × quantidade conferido com Decimal.
- Reembolso e sua compensação, devolução de juros, reservas e ajustes com estorno vinculado.
- Compra no cartão contabilizada uma vez no consumo, pagamento parcial/antecipado da fatura alocado às parcelas e transferência com tarifa.
- Formulários de investimento, edição de parcela, seleção múltipla e correção de ajuste, além da navegação/persistência cobertas anteriormente.

## Banco

`npm run test:db:isolated` instala as migrations em PostgreSQL descartável e verifica autenticação Google, isolamento de usuários, RLS, anonimato negado, conflitos de revisão, imutabilidade, rollback, parcelas duplicadas, correção de pagamento, sequência/cálculo de investimentos e estornos vinculados.

`npm run test:db:shared` executa as migrations e a regressão comercial do MCell em outro banco descartável, sem consultar ou modificar dados comerciais reais.

A migração `20261122195625_gevyro_financial_control.sql` foi aplicada no projeto autorizado `bcfjhwcsulylodayczkr`. A consulta de verificação confirmou 14 tabelas com RLS, RPC público sem definer/execução anônima e validador privado sem execução pelo cliente. O advisor retornou zero avisos relativos ao Gevyro; os 15 avisos anteriores do restante do projeto não foram alterados.

## Código e publicação

TypeScript, ESLint, Prettier, scanner de segredos, política de custos e build estático são verificados antes do envio ao repositório único autorizado. O CI repete os testes de aplicação e de banco isolado. A Vercel publica o mesmo commit por integração com esse repositório.

A chamada anônima de produção verifica recusa de acesso; nenhuma fixture de teste é gravada no Supabase real. A conclusão do consentimento Google com contas reais e a comparação visual em dois dispositivos não são substituídas por esses testes.
