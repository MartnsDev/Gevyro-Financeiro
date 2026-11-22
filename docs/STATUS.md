# Estado atual — somente Supabase

A versão atual exige conta Google, não grava novos dados financeiros em IndexedDB/localStorage e não oferece fallback local. Sincronização entre dispositivos usa a mesma conta, consulta a cada 30 segundos com a tela visível e revisão otimista para impedir sobrescritas. O histórico antigo só é removido depois de migração conferida.

A Vercel está publicada em https://gevyro-financeiro.vercel.app, com variáveis públicas configuradas. O acesso administrativo ao projeto MCell continua recusado; a migração e o Google ainda não foram ativados. A nova versão bloqueia a tela financeira enquanto essa pendência existir. Não considerar a nuvem homologada.

## Registro da entrega anterior

# Estado atual do Gevyro Finanças

Atualização: 22/11/2026. Esta lista distingue implementação de validação em produção. A entrega possui fluxos financeiros essenciais reais no modo local; o escopo integral das 37 seções ainda não pode ser considerado concluído.

## Implementado e coberto por verificações automatizadas

- Contas e carteiras com saldo de referência, movimentos efetivos, transferências/tarifas e conciliação auditável.
- Receitas fixas/variáveis/confirmadas, despesas únicas/parceladas/recorrentes, categorias, subcategorias, estabelecimento e tags.
- Parcelas exatas em centavos; pagamentos parciais e antecipados; edição individual/futura com histórico preservado; quitação antecipada com desconto informado.
- Ajustes de juros/multas/descontos, reembolso efetivamente recebido e estorno de pagamento, separados do valor original.
- Cartões com limite comprometido, atribuição mensal a faturas e pagamentos integrais/parciais alocados sem repetir consumo.
- Assinaturas mensais/anuais e intervalos configuráveis, pausa/retomada/cancelamento e cenário de economia das selecionadas.
- Metas, reservas, aportes/retiradas e histórico; dinheiro reservado não é despesa de consumo.
- Investimentos manuais com aportes, resgates, custo proporcional e rendimentos recebidos. Dívidas manuais com principal recebido e amortização que separa juros.
- Dashboard calculado; calendário mensal/lista/próximos sete dias; relatórios de caixa, vencimento e compra, intervalo personalizado e filtros de conta/cartão/categoria.
- Orçamento por caixa ou competência, pago/comprometido/limite/restante e alertas visuais; cópia entre meses; arquivamento de categorias sem apagar histórico.
- Projeções conservadora/padrão/otimista, médias variáveis identificadas como estimativas, horizonte mensal/diário, referência de gasto diário e término de parcelamentos.
- Notificações internas de despesas/receitas e estado de leitura persistido; materialização nas gravações, sem jobs externos pagos.
- Importação CSV/OFX, prévia editável, remoção de linhas, FITID, tratamento explícito de coincidências e reversão auditável do lote; backup completo JSON/CSV e restauração.
- Persistência local atômica em IndexedDB, isolamento do espaço local/nuvem, revisão otimista, tratamento de falhas e compatibilidade com backups anteriores.
- Tema claro/escuro, privacidade, logo original, navegação adaptada, modais, atalhos, onboarding e ajuda; manifesto/ícones PWA.
- Política de orçamento adicional zero, bloqueio de serviços arbitrários e limite local sem exclusão de dados. Relatório em CUSTOS-E-BACKUP.md.

## Supabase compartilhado com o MCell

O proprietário autorizou reutilizar o projeto `bcfjhwcsulylodayczkr`, identificado como MCELL. O hostname voltou a responder, mas os RPCs Gevyro ainda não estão instalados. Não há acesso administrativo conectado nesta sessão para confirmar plano Free, aplicar migrações e configurar redirects. Por isso `deploymentVerified` continua false e a nuvem não foi ativada.

Migrações preparadas, em ordem:

1. `202611220001_shared_mcell.sql`: schema exclusivo `gevyro_finance`, RPCs prefixados, RLS, FKs e auditoria.
2. `202611220002_financial_events.sql`: livro imutável de movimentos, notificações, RLS e evolução dos RPCs.

Não aplicar a migration standalone no banco MCell e não executar db push indiscriminadamente. Nenhuma tabela/dado/rota/Auth do MCell foi alterada. A chave service role não é copiada ao app. A cópia local → nuvem exige ação explícita, conta remota vazia e mantém o original. Ver SUPABASE-MCELL.md.

## Verificação executada

- Suíte de testes do motor, relatórios, planejamento, importações, backups, custos e persistência.
- Teste React em DOM percorrendo todos os módulos com fixtures exclusivas de teste, registrando ajuste, pausando/retomando assinatura, marcando alerta e arquivando categoria sem apagar obrigações.
- Fluxo conta → despesa paga → remontagem → saldo preservado, tema e privacidade.
- PostgreSQL descartável com migrações MCell e Gevyro; testes de RLS entre usuários, referências, pagamentos, ajustes, reembolsos, imutabilidade, notificações, revisão e rollback. Fingerprints e regressão comercial comprovam preservação das tabelas/funções MCell no teste.
- Lint, tipos, formatação, guarda de custos e build de produção devem permanecer aprovados. O total final de testes consta na entrega; detalhes em VERIFICACAO-FUNCIONAL.md.

## Bloqueios e limites de validação

- Sem acesso administrativo Supabase: não homologados Auth real, emails, redirects, sessão, RPCs via API real e migração em produção.
- Nenhum navegador conectado: teste de DOM não é E2E e não confirma aparência renderizada, responsividade visual, Recharts real ou instalação PWA nos dispositivos.
- Faturamento/recarga da conta não puderam ser verificados; a política do app não é limite de cobrança da plataforma. Nenhum serviço/plano/crédito foi contratado.

## Recursos avançados ainda pendentes

- Anexos privados, Open Finance, cotações, SMTP/push e tarefas externas: não habilitados, conforme custo zero e dependências externas.
- Financiamentos com juros compostos/cronogramas contratuais e simulações de amortização; o livro atual registra principal e juros reais informados.
- Quantidade/cotas, impostos e histórico dedicado de avaliações de investimentos; o livro atual usa posições manuais e custo proporcional, sem apuração fiscal.
- XLSX, formatos OFX não padronizados, importação especializada de fatura, paginação/sincronização remota incremental e históricos muito grandes.
- Estados contratuais formais de fechamento/rotativo do cartão e regras alternativas de limite; a versão atual calcula saldos e vencimentos por item.
- Múltiplas moedas com câmbio confiável, PDF de layout dedicado (hoje impressão/PDF nativo), ordem personalizável do dashboard e navegação por URL por módulo.
- Google OAuth, exclusão de conta pessoal, política operacional de retenção, CSP/revisão de segurança e testes E2E em dispositivos reais.

Esses pontos não devem ser apresentados como funcionalidades concluídas ou como simples credenciais ausentes. A implementação e validação adicionais continuam necessárias para declarar o prompt integralmente atendido.
