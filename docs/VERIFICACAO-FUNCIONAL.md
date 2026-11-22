# Verificação funcional — 22/11/2026

Escopo desta rodada: concluir e verificar os fluxos financeiros essenciais disponíveis no modo local, preservando os dados existentes e a política de R$ 0,00. Integração remota preparada, sem ativação fictícia.

## Fluxos funcionais

- Contas, saldos de referência, conciliação por lançamento auditável, transferências e tarifas.
- Receitas fixas/variáveis, confirmação de renda para projeção conservadora, despesas únicas, recorrentes e parceladas.
- Parcelas em centavos exatos, vencimentos em meses curtos/bissextos, antecipação e quitação com desconto informado.
- Pagamentos integrais/parciais e estorno de pagamento; juros/multas/descontos por ajuste; reembolso efetivamente recebido sem duplicar receita ou reabrir compra quitada.
- Cartões, atribuição a faturas, comprometimento de limite e pagamento alocado aos itens sem repetir consumo.
- Assinaturas com pausa, retomada, cancelamento e simulação seletiva sem cancelamento real do fornecedor.
- Orçamento por competência ou caixa, distinguindo pago e comprometido; categorias arquiváveis sem apagar histórico.
- Metas com aportes/retiradas de reservas e histórico; investimentos com aportes, resgates e rendimentos efetivamente recebidos; dívidas com entrada de principal e amortização separada dos juros.
- Relatórios com intervalo, conta/cartão, categoria e três perspectivas: compra, vencimento e pagamentos. Exportação da seleção e acesso aos registros do indicador.
- Projeções conservadora, padrão e otimista; médias de renda variável explicitamente estimadas, visão diária, referência de gasto por dia e meses de liberação de parcelas.
- Cadastro com estabelecimento/origem, subcategoria e tags; busca em descrições, categorias, notas, estabelecimento e tags.
- CSV e OFX com prévia editável, remoção de linhas, opção explícita para coincidências sem ID e deduplicação obrigatória de identificadores FITID no mesmo banco/conta.
- Backups completos JSON/CSV, restauração, compatibilidade com backups antigos, proteção contra conflito entre abas e contra estouro do limite local.
- Alertas de despesas e receitas, leitura persistida e notificações materializadas nas gravações. Não existem tarefas remotas de email/push habilitadas.

## Evidência executável

`npm test` cobre motor financeiro, regressões, relatórios, projeções, importação, persistência, cópia local/nuvem isolada, políticas de custo e interface em DOM. O teste `all-pages.test.tsx` percorre todos os módulos com fixtures exclusivas de teste e confirma gravação de ajuste, pausa/retomada e leitura de alerta. O teste inicial de conta → despesa paga → remontagem continua presente.

`npm run test:db:shared` aplica as migrations do MCell em PostgreSQL descartável, aplica o schema Gevyro e a evolução de movimentos, executa testes reais de RLS, autorização, imutabilidade, juros, reembolso, leitura de notificação, revisão e rollback, verifica fingerprints das tabelas/funções MCell e executa sua regressão comercial.

Comandos finais: lint, checagem estrita de tipos, testes, formatação, guarda de custos e build de produção. O resultado final da execução é comunicado na entrega; este arquivo não substitui o log de execução.

## Limites importantes

A instalação real no Supabase ainda depende de conexão administrativa, confirmação do plano Free e aplicação sequencial das migrations `202611220001_shared_mcell.sql` , `202611220002_financial_events.sql` e `202611220003_google_access.sql`. Não executar a migration standalone no banco MCell. A nuvem, emails de autenticação, redirects e expiração de sessão não foram homologados no projeto real. Nenhum dado local foi enviado à nuvem por esta rodada.

Não há navegador conectado: o teste de DOM não valida layout renderizado, responsividade visual, gráficos reais Recharts ou instalação PWA em dispositivos. O service worker não guarda dados financeiros ou sessões. Anexos e notificações externas permanecem bloqueados pela política de custo zero.

Continuam fora desta entrega: financiamento contratual com tabela de amortização/juros composta, livro de ativos com quantidade de cotas e impostos, atualização de cotações, histórico dedicado de avaliações manuais, múltiplas moedas com conversão, XLSX, integração Open Finance, controle de entrega de email/push e consultas incrementais para históricos muito grandes. O resgate manual usa custo proporcional da posição informada; não é apuração fiscal ou cálculo de rendimento garantido.

Todas as funções implementadas possuem caminhos reais de persistência; a existência de uma tela ou de um teste não significa que todas as 37 seções do prompt integral estejam concluídas. Os recursos bloqueados e avançados acima não devem ser apresentados como ativos.

## Revisão GitHub / Vercel / Google

O formulário de senha foi substituído por Google OAuth/PKCE. A terceira migration restringe RPCs e RLS às contas somente Google e sessões OAuth, incluindo teste de falsificação de metadados. Os testes são locais; Auth e RLS do Supabase real continuam pendentes. Veja [CHECKLIST-ENTREGA.md](CHECKLIST-ENTREGA.md) e [PUBLICACAO.md](PUBLICACAO.md).
