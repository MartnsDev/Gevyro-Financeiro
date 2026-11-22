# Experiência mobile do Gevyro Finanças

## Páginas adaptadas

Visão geral, movimentações, parcelamentos, investimentos, calendário, planejamento, orçamentos, metas, relatórios, contas e carteiras, cartões, assinaturas, patrimônio e dívidas, aportes e ajustes, importação/exportação, configurações e ajuda usam a mesma estrutura fluida. A tela de acesso tem um layout próprio documentado em [NOVO-LOGIN.md](NOVO-LOGIN.md).

A barra inferior oferece Visão geral, Movimentações, Parcelamentos, Investimentos e Menu. O menu completo permite chegar aos demais módulos com foco gerenciado e retorno ao controle de origem. No computador, a navegação lateral permanece disponível.

Movimentações recebem cartões com categoria, conta, vencimento, situação e ações; filtros de tipo, situação, categoria e conta continuam disponíveis. Parcelamentos mostram total, valor pago, próximo vencimento e acesso às parcelas individuais. Posições de investimento também usam cartões; tabelas históricas conservam todos os dados com rolagem dentro do componente.

Formulários passam a uma coluna no celular, com controles de toque, altura do viewport visível e rolagem do modal. Mudanças de tamanho e orientação não remontam o formulário nem descartam o rascunho. A validação monetária aponta o campo e preserva os valores digitados. O calendário apresenta dias compactos e a lista cronológica dos compromissos.

## Arquivos principais

- `src/app/responsive.css` e `src/app/layout.tsx`: layout, breakpoints, área segura e viewport.
- `src/components/mobile-navigation.tsx` e `src/components/transaction-cards.tsx`: navegação e movimentações no celular.
- `src/components/finance-app.tsx`: integração da navegação, busca, filtros, calendário e ações existentes.
- `src/components/ui/dialog.tsx` e `src/components/entry-form.tsx`: foco, viewport e formulários.
- `src/components/installment-control.tsx` e `src/components/investment-panel.tsx`: apresentação dos registros financeiros.
- `src/components/charts-lazy.tsx`: carregamento da biblioteca de gráficos por demanda.
- `playwright.config.ts`, `scripts/serve-responsive.mjs` e `tests/responsive/`: testes reais dos componentes com backend isolado.
- `.github/workflows/ci.yml`: verificação responsiva automática no Chromium.
- `scripts/check-security.mjs`: impede a inclusão do backend simulado no build público.

## Dados e segurança

A adaptação preserva o armazenamento financeiro no Supabase. O servidor de testes substitui Auth/RPC apenas no processo local de verificação; ele não faz parte do aplicativo exportado. Os testes financeiros usam fixtures e bancos descartáveis, sem alterar os registros da conta real.

O PWA existente continua com cache restrito ao ícone. Não foi criada persistência financeira offline. Credenciais privadas, sessões e dados reais não entram nas imagens de apresentação ou no repositório.

## Limites da validação

As larguras verificadas são 320, 360, 375, 390, 430, 768, 1024, 1280 e 1440px. A suíte cobre os três motores Chromium, Firefox e WebKit, incluindo navegação, menu, foco, nova movimentação, vencimento individual, releitura, investimento, filtros, CSV, tema escuro e formulário com mudança de orientação/altura.

WebKit em Linux não equivale ao Safari de um iPhone físico. Toque e viewport são emulados; teclado nativo, recortes reais de aparelhos e instalação na tela inicial precisam de validação física. Edge e Chrome Android nativos não foram executados. O Firefox não oferece emulação móvel de toque no Playwright; esse caso tem exclusão explícita e os demais testes são executados normalmente.

O consentimento real do Google requer interação do titular. A suíte verifica o encaminhamento à integração existente, carregamento e recuperação de erros; não declara ter concluído consentimento por uma conta real.

## Execução registrada nesta revisão

- 144 testes de unidade/interface em 27 arquivos passaram (`vitest run --maxWorkers=1`), executados sem concorrência com build e navegadores.
- PostgreSQL isolado: passaram autorização Google, RLS, atomicidade, histórico, operações financeiras e transferência individual de novembro para dezembro com releitura do RPC.
- Regressão compartilhada: passou em PostgreSQL descartável, incluindo as regras do comércio MCell.
- Chromium: os 16 cenários internos passaram, incluindo os 15 módulos principais nas nove larguras e as páginas de configurações/ajuda. Os 11 cenários do login também passaram.
- Lint, TypeScript, build de produção e scanner de segredos passaram. A formatação foi conferida. O scanner também foi executado sobre o build exportado para conferir a ausência do backend simulado.
- A matriz completa foi concluída em lotes após uma interrupção do ambiente: 27 cenários aprovados no Chromium, 26 no Firefox e 27 no WebKit. Total: **80 aprovados e um caso de toque ignorado no Firefox**, sem falhas. Os onze cenários de login passaram nos três navegadores com os arquivos originais aplicados.

Os arquivos originais enviados pelo proprietário foram aplicados à tela de acesso. O notebook utiliza o enquadramento da própria referência, preservando seus pixels e proporções. Os arquivos foram conferidos visualmente no computador e no celular emulado. A publicação utiliza o repositório `MartnsDev/Gevyro-Financeiro` e a integração Vercel existente.
