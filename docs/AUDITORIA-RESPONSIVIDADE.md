# Auditoria de responsividade — 22/11/2026

Escopo: preservar Gevyro, integrações e regras financeiras; adaptar a apresentação e navegação sem alterar dados existentes. A correção de vencimentos solicitada antes desta auditoria permanece na mesma entrega.

## Estado encontrado antes da adaptação

| Área                    | Problema identificado no código                                          | Adaptação planejada                                                                        |
| ----------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Navegação               | Drawer próprio sem barra inferior e controles pequenos                   | Cinco destinos fixos, menu com foco gerenciado e acesso a todos os módulos                 |
| Dashboard               | Quatro indicadores em grade, valores grandes e regras mobile sobrepostas | Uma coluna em telas mínimas, duas quando couber, valores completos e ações fluidas         |
| Movimentações           | Tabela larga como única apresentação; busca mobile dependente de hover   | Cartões com dados e ações completos; busca visível; filtros de tipo/status/categoria/conta |
| Formulários             | Grade de duas colunas em celulares e modais centrados                    | Uma coluna, painel completo, altura do viewport visível, rolagem e confirmação acessível   |
| Parcelamentos           | Resumo sem total pago e próximo vencimento; detalhes em tabela           | Resumo completo, parcelas em cartões e edição individual preservada                        |
| Investimentos           | Posições em tabela e ações concentradas na última coluna                 | Posições em cartões, indicadores legíveis e histórico com rolagem interna                  |
| Calendário              | Textos de compromissos em sete colunas estreitas                         | Dias compactos com contagem e lista cronológica completa abaixo                            |
| Planejamento/relatórios | Tabelas e filtros largos em telas menores                                | Contenção por componente, controles fluidos e rolagem localizada quando necessária         |
| Gráficos                | Carga estática da biblioteca e legendas pequenas                         | Carregamento por demanda, dimensões fluidas e legenda completa                             |
| PWA                     | Manifesto existente, ícones Gevyro e SW limitado a ícone                 | Preservar; viewport e áreas seguras sem cache de dados financeiros                         |

## Sistema de layout

- Base fluida e `minmax(0, 1fr)` para impedir que conteúdo intrínseco alargue a página.
- Navegação mobile abaixo de 768px; sidebar a partir de 768px.
- Formulários em uma coluna abaixo de 640px; indicadores em uma coluna nas larguras mínimas e duas a partir de 360px, conforme o componente.
- Touch targets de 44px, foco visível, movimento reduzido, áreas seguras e altura visível de modais.
- As referências 320, 360, 375, 390, 430, 768, 1024, 1280 e 1440px serão verificadas com conteúdo de teste, sem dados reais.

## Ambiente de verificação

O navegador interativo da conversa não está conectado. Os testes de renderização usam Playwright em um navegador isolado e um servidor local de testes. O aplicativo e os gráficos são os componentes reais; autenticação e RPC são substituídos apenas nesse servidor de teste por um backend em memória. Não existe bypass de autenticação na aplicação de produção, rota de demonstração no build publicado ou cache financeiro offline.

A emulação não substitui um iPhone/Android físico, teclado nativo, Safari real ou navegador Edge instalado. Os resultados efetivamente executados e as limitações serão registrados no relatório de entrega.
