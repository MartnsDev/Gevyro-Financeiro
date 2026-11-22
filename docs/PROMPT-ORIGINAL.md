# PROMPT MESTRE. GEVYRO FINANÇAS

## 1. SUA MISSÃO

Você é uma equipe sênior de engenharia de software, composta por arquiteto de sistemas, desenvolvedor full stack, especialista em PostgreSQL, engenheiro de segurança, designer de produto e especialista em sistemas financeiros.

Sua missão é desenvolver uma aplicação web completa chamada **Gevyro Finanças**.

O Gevyro Finanças será uma plataforma profissional de controle financeiro pessoal, voltada inicialmente para uso individual, com arquitetura preparada para múltiplos usuários no futuro.

Não crie apenas uma landing page, um protótipo visual ou um dashboard com números fictícios.

Desenvolva um software real, funcional, persistente, seguro, responsivo e preparado para publicação.

O objetivo central é permitir que uma pessoa registre absolutamente todas as suas movimentações financeiras e tenha controle completo de seu dinheiro, sem precisar realizar contas manualmente.

O usuário deverá conseguir responder rapidamente às seguintes perguntas.

Quanto tenho disponível hoje?

Quanto realmente posso gastar sem comprometer minhas contas?

Quanto recebo por mês, em média?

Quanto gastei neste mês?

Quanto ainda preciso pagar?

Quais contas vencem nos próximos dias?

Quais compras estou pagando parceladas?

Quando cada parcelamento terminará?

Quanto meus gastos mensais vão diminuir nos próximos meses?

Quanto gasto com assinaturas?

Quanto tenho comprometido no cartão de crédito?

Quanto posso guardar mensalmente?

Quanto possuo em investimentos?

Quanto vale meu patrimônio total?

Quando conseguirei alcançar minhas metas?

Como estará minha situação financeira nos próximos 3, 6, 12, 24 e 60 meses?

Todas essas respostas deverão ser calculadas usando os dados reais cadastrados pelo usuário.

## 2. REFERÊNCIAS DE PRODUTO

Pesquise e analise as funcionalidades públicas dos seguintes aplicativos.

Organizze, para lançamentos, contas, cartões, categorias e relatórios.

Mobills, para orçamento, cartões, limites, faturas e objetivos.

Monarch Money, para dashboard, patrimônio, fluxo de caixa e planejamento.

YNAB, para orçamento baseado no dinheiro disponível e distribuição de recursos.

Wallet by BudgetBakers, para pagamentos programados, recorrências e planejamento.

Actual Budget, para organização detalhada de orçamento e controle de alocação financeira.

Use essas ferramentas apenas como referências funcionais e de experiência do usuário.

Não copie código proprietário, identidade visual, marcas, imagens protegidas ou interfaces de maneira idêntica.

Crie uma solução original, com identidade própria e experiência superior para o objetivo do Gevyro Finanças.

## 3. TECNOLOGIAS OBRIGATÓRIAS

Utilize Next.js com App Router e TypeScript.

Utilize React e Tailwind CSS.

Utilize componentes shadcn/ui e ícones Lucide.

Utilize Supabase com PostgreSQL para persistência.

Utilize Supabase Auth para autenticação.

Utilize React Hook Form e Zod para formulários e validação.

Utilize TanStack Query quando necessário para cache e sincronização de dados.

Utilize Recharts para gráficos financeiros.

Utilize uma biblioteca de datas madura e compatível com a versão utilizada do projeto.

Utilize uma biblioteca decimal adequada para cálculos monetários que não podem perder precisão.

Configure ESLint, Prettier, testes automatizados e tipagem rigorosa.

Utilize migrations versionadas para toda alteração estrutural do banco.

Crie a aplicação como PWA, preparada para instalação em computadores e dispositivos móveis.

Priorize compatibilidade com Vercel e Supabase.

Antes de instalar qualquer dependência, verifique versões atuais, documentação oficial, compatibilidade e manutenção.

Não adote bibliotecas obsoletas.

## 4. DESIGN E IDENTIDADE

Nome do produto: Gevyro Finanças.

Identidade independente, moderna e profissional, mantendo uma ligação sutil com a marca Gevyro.

Crie um design clean, sofisticado e minimalista, com aparência de produto financeiro premium.

O tema claro deve ser o principal.

Use fundo branco ou cinza extremamente claro, cartões brancos, bordas discretas, tipografia moderna e hierarquia visual bem definida.

Utilize verde esmeralda como cor principal de identidade.

Utilize vermelho moderado para despesas e alertas.

Utilize azul ou violeta para informações complementares.

Implemente tema escuro completo, com persistência da preferência.

Evite gradientes exagerados, efeitos visuais desnecessários e interfaces sobrecarregadas.

O dashboard deverá parecer um produto financeiro profissional, e não um painel administrativo genérico.

A navegação desktop deverá utilizar uma sidebar organizada.

A versão móvel deverá ter navegação adaptada ao toque, com ações rápidas para registrar despesas e receitas.

Implemente modais, drawers, menus contextuais, filtros avançados, tooltips, estados vazios, skeleton loading, notificações e mensagens de confirmação.

Todo botão visível deverá ter uma função real.

Não utilize conteúdo fictício no ambiente de produção. Dados demonstrativos somente em modo de demonstração explicitamente identificado.

## 5. AUTENTICAÇÃO E CONFIGURAÇÃO INICIAL

Implemente cadastro e login por email e senha.

Implemente recuperação de senha e sessões seguras.

Prepare autenticação com Google caso seja configurada posteriormente.

Cada usuário deverá acessar somente seus próprios dados.

Na primeira utilização, apresente um assistente de configuração inicial.

O assistente deverá perguntar a moeda principal, o dia habitual de recebimento, a renda mensal estimada, os bancos utilizados, as contas existentes, cartões, saldo inicial e preferências de notificações.

Permita pular etapas e completá-las posteriormente.

Defina português do Brasil como idioma inicial e BRL como moeda padrão.

Prepare a arquitetura para múltiplas moedas, sem realizar conversões automáticas sem taxas de câmbio confiáveis.

O usuário deverá poder editar todas as informações posteriormente.

## 6. MÓDULO DE CONTAS FINANCEIRAS

Permita cadastrar diversas contas.

Conta corrente, conta digital, poupança, carteira em dinheiro, conta de investimentos e outras.

Cada conta deverá possuir nome, instituição, cor, ícone, saldo inicial, data de referência do saldo, moeda e situação.

O saldo atual deverá ser calculado considerando o saldo inicial, as entradas efetivamente realizadas, as saídas efetivamente realizadas, as transferências e os ajustes.

Lançamentos futuros não poderão diminuir antecipadamente o saldo real da conta.

Permita transferências entre contas.

Uma transferência interna não representa receita nem despesa e não deve aumentar artificialmente o fluxo financeiro consolidado.

Registre data, origem, destino, valor e eventual tarifa.

A tarifa deverá ser contabilizada separadamente como despesa.

Implemente conciliação de saldos e ajustes auditáveis.

Não permita alteração silenciosa do histórico financeiro.

## 7. MÓDULO COMPLETO DE DESPESAS

Este é um dos módulos mais importantes de todo o projeto.

O usuário deverá conseguir cadastrar uma despesa individualmente, uma única vez, com todas as informações necessárias para controlar sua duração e seus pagamentos.

Campos do cadastro.

Nome e descrição da despesa.

Valor monetário.

Categoria e subcategoria.

Estabelecimento, loja ou beneficiário.

Conta ou cartão utilizado.

Forma de pagamento.

Data da compra ou contratação.

Data de competência financeira.

Data do primeiro vencimento.

Dia habitual de vencimento.

Frequência de cobrança.

Quantidade total de parcelas, quando aplicável.

Data de término, quando aplicável.

Tipo de despesa.

Status de pagamento.

Observações.

Tags personalizadas.

Anexos e comprovantes.

O sistema deverá oferecer três tipos principais.

Despesa única.

Despesa parcelada.

Despesa recorrente.

Despesa única representa uma obrigação com apenas um pagamento.

Despesa parcelada representa uma obrigação dividida em uma quantidade definida de parcelas.

Despesa recorrente representa uma obrigação que se repete periodicamente, podendo ter uma data de término ou continuar por prazo indeterminado.

Exemplo de despesa única.

Compra em supermercado no valor de R$ 180.

O sistema registra a despesa no período correto e acompanha se foi paga.

Exemplo de despesa parcelada.

Geladeira comprada por R$ 1.800 em 12 parcelas de R$ 150.

O usuário informa o valor total ou o valor por parcela, escolhe 12 parcelas e define o primeiro vencimento.

O sistema gera um cronograma com as 12 parcelas, seus vencimentos individuais e respectivos valores.

A despesa deverá apresentar quantas parcelas já foram pagas, quantas faltam, total quitado, saldo restante e previsão de encerramento.

Exemplo de despesa recorrente.

Internet residencial de R$ 100 por mês, com vencimento no dia 10.

O sistema registra a obrigação recorrente e cria suas ocorrências conforme o calendário.

O usuário não precisa cadastrar novamente a internet todo mês.

O sistema deve permitir recorrências semanais, quinzenais, mensais, bimestrais, trimestrais, semestrais e anuais, além de intervalos configuráveis.

Permita despesas recorrentes com valores variáveis.

Nesses casos, use o valor planejado até que o usuário registre o valor efetivo daquele período.

Permita editar somente uma ocorrência, todas as ocorrências futuras ou toda a série, com comportamento explícito.

Ao cancelar uma recorrência, preserve o histórico anterior.

Ao antecipar uma parcela, registre a data efetiva e ajuste o saldo da conta corretamente.

Ao quitar antecipadamente uma compra, permita aplicar desconto ou juros efetivamente pagos e encerrar as obrigações restantes sem apagar o histórico.

Suporte pagamentos parciais, multas, juros, descontos e estornos.

Uma parcela somente deverá ser considerada totalmente paga quando a soma de seus pagamentos atingir o valor devido, respeitando ajustes.

Nunca duplique parcelas durante atualizações, carregamentos ou sincronizações.

## 8. MÓDULO DE RECEITAS

Implemente cadastro completo de receitas.

Salário.

Horas extras.

Comissões.

Serviços.

Freelances.

Reembolsos.

Rendimentos.

Outras entradas.

Cada receita deverá possuir descrição, valor, origem, categoria, data prevista, data efetiva, conta de destino, recorrência e status.

Permita receitas únicas, parceladas quando fizer sentido e recorrentes.

Permita registrar salário fixo mensal e receitas variáveis.

Calcule a média mensal de rendimentos usando períodos completos, permitindo selecionar 3, 6, 12 meses ou um intervalo personalizado.

Apresente separadamente renda fixa, renda variável e renda total.

Permita ao usuário cadastrar uma renda planejada mesmo antes de receber.

Diferencie receita prevista de receita efetivamente recebida.

Não aumente o saldo bancário antes do recebimento real.

## 9. PARCELAMENTOS E DÍVIDAS

Crie uma central de parcelamentos.

Exiba todas as compras parceladas ativas e concluídas.

Cada item deverá mostrar descrição, valor original, valor mensal, parcelas totais, parcelas pagas, parcelas restantes, próximo vencimento, saldo devedor e data prevista de término.

Crie um indicador mostrando quanto das despesas mensais será liberado conforme os parcelamentos terminarem.

Exemplo.

Uma geladeira possui parcela de R$ 150 e termina em novembro.

O sistema deverá indicar que, a partir de dezembro, haverá R$ 150 a menos em obrigações mensais, supondo que não existam novos compromissos.

Implemente também dívidas e empréstimos.

Cadastre credor, principal, encargos, taxa contratada, saldo devedor, pagamentos e vencimentos.

Não trate financiamentos complexos como parcelamentos simples sem considerar juros e amortização.

Permita registrar cronogramas de amortização quando conhecidos.

Implemente simulações de quitação antecipada e redução de dívida, distinguindo valores contratuais de estimativas.

## 10. CARTÕES DE CRÉDITO

Crie um módulo completo de cartões.

Cada cartão deverá possuir nome, instituição, bandeira, quatro últimos dígitos opcionais, limite, dia de fechamento, dia de vencimento, conta habitual de pagamento e situação.

Nunca armazene número completo, CVV ou informações sensíveis desnecessárias.

Implemente compras à vista e parceladas no cartão.

Cada compra deverá ser atribuída corretamente a uma fatura.

O cálculo da fatura deverá respeitar fechamento e vencimento, incluindo os casos de virada de mês e ajuste de datas inválidas.

Uma compra parcelada no cartão compromete o limite conforme a regra de limite configurada e aparece nas faturas correspondentes.

Controle limite total, limite utilizado, limite disponível e compromissos futuros.

Implemente visualização de faturas abertas, fechadas, parcialmente pagas, pagas e vencidas.

Permita pagamento integral, parcial e antecipado.

O pagamento da fatura deverá movimentar a conta bancária correspondente e liquidar a obrigação do cartão, sem registrar novamente como despesa de consumo.

O usuário deverá conseguir escolher relatórios por data de compra, competência da despesa ou saída efetiva de dinheiro.

Essas perspectivas devem ser apresentadas separadamente para impedir dupla contagem.

Implemente estornos, créditos na fatura, ajustes e controle de juros do rotativo quando informados.

Permita múltiplos cartões.

Implemente calendário de vencimentos e alertas.

## 11. ASSINATURAS E SERVIÇOS RECORRENTES

Crie uma página exclusiva chamada Assinaturas.

O usuário poderá cadastrar serviços como Spotify, Netflix, internet, armazenamento em nuvem, academia, plataformas digitais e qualquer outra cobrança recorrente.

Cada assinatura terá nome, descrição, valor, periodicidade, data de início, próximo vencimento, forma de pagamento, data de término opcional e situação.

Mostre o gasto mensal equivalente e o custo anual equivalente.

Uma assinatura anual deverá ser identificada como cobrança anual, sem ser artificialmente lançada como despesa paga em todos os meses.

Permita analisar o custo mensal equivalente apenas para planejamento.

Exiba assinaturas ativas, pausadas, canceladas e encerradas.

Permita registrar reajustes sem alterar o histórico das cobranças antigas.

Crie alertas de renovação e vencimento.

Apresente uma análise de quanto o usuário gastaria em um ano mantendo as assinaturas atuais.

Implemente uma ferramenta que permita simular economia ao cancelar assinaturas selecionadas, sem efetivar o cancelamento real no fornecedor.

## 12. DASHBOARD FINANCEIRO

Esta será a tela inicial do aplicativo.

Apresente cartões de indicadores com os seguintes dados.

Saldo real consolidado.

Receitas recebidas no mês.

Despesas efetivamente pagas no mês.

Receitas previstas.

Despesas previstas.

Contas pendentes.

Contas atrasadas.

Saldo livre projetado.

Total comprometido em parcelas.

Total de assinaturas.

Total investido.

Patrimônio líquido estimado.

Permita selecionar mês, ano e intervalos personalizados.

Crie gráficos interativos de receitas e despesas.

Gráfico de evolução do saldo.

Gráfico por categorias.

Gráfico de fluxo de caixa.

Gráfico de gastos fixos e variáveis.

Gráfico de evolução patrimonial.

Exiba uma área de próximos vencimentos.

Exiba movimentações recentes.

Exiba metas financeiras em andamento.

Exiba cartões com alertas importantes.

O dashboard deverá ter filtros e indicadores clicáveis, permitindo navegar até os lançamentos que compõem cada valor.

Nenhum indicador poderá utilizar valores fixos ou dados inventados em produção.

## 13. CALENDÁRIO FINANCEIRO

Crie calendário mensal, semanal e visualização em lista.

Exiba receitas previstas, despesas, parcelas, assinaturas, faturas e outros vencimentos.

Utilize elementos visuais distintos para entradas e saídas.

Destaque valores vencidos e obrigações próximas do vencimento.

Ao clicar em uma data, exiba os compromissos correspondentes.

Permita abrir um lançamento para visualizar detalhes, editar ou registrar pagamento.

Exiba totais previstos por dia.

Mostre o saldo projetado diário, sem alterar o saldo real.

Permita navegar para meses futuros.

O usuário deverá conseguir visualizar as obrigações financeiras de qualquer mês dentro do horizonte de planejamento suportado.

## 14. MOTOR DE PLANEJAMENTO FINANCEIRO

Este é o principal diferencial do Gevyro Finanças.

Crie uma ferramenta de planejamento capaz de projetar a situação financeira futura com base em receitas recorrentes, despesas, parcelamentos, assinaturas, dívidas, metas e eventos extraordinários.

Implemente horizontes de 1, 3, 6, 12, 24 e 60 meses.

Apresente projeções mensais e diárias quando apropriado.

Calcule separadamente os seguintes indicadores.

Saldo real atual.

Saldo previsto após pagamentos pendentes do mês.

Receitas futuras esperadas.

Despesas futuras esperadas.

Saldo projetado no fim de cada mês.

Valor destinado às metas.

Investimentos planejados.

Dinheiro livre após compromissos e reservas.

O dinheiro livre não deverá ser confundido com saldo bancário.

Implemente projeção conservadora, padrão e otimista.

A projeção conservadora pode utilizar renda fixa e receitas já confirmadas.

A projeção padrão utiliza receitas recorrentes e médias variáveis identificadas como estimativas.

A projeção otimista pode utilizar valores de renda estimados pelo usuário.

Nunca apresente uma previsão como garantia.

Crie simulações do tipo.

O que acontece se minha renda aumentar R$ 500?

O que acontece se reduzir R$ 200 de gastos?

Quanto economizo se cancelar duas assinaturas?

Quanto terei em 12 meses se guardar R$ 800 mensalmente?

Em qual mês termino de pagar todas as compras parceladas?

Posso comprar uma moto de R$ 10.000 sem comprometer meus pagamentos?

Quanto posso gastar por dia até o fim do mês?

Ao executar uma simulação, não altere os registros reais.

Permita salvar cenários simulados para comparação.

Crie um painel de despesas que terminarão nos próximos meses.

Exiba a evolução do comprometimento mensal.

Implemente um indicador de comprometimento da renda.

Diferencie projeções baseadas em obrigações confirmadas e hipóteses.

## 15. ORÇAMENTOS E LIMITES

Implemente orçamento por categoria.

Permita definir valores máximos mensais para alimentação, transporte, lazer, moradia, educação e quaisquer categorias personalizadas.

Mostre o valor planejado, utilizado, comprometido, restante e percentual de execução.

Permita usar orçamento por competência ou caixa, com indicação clara da perspectiva escolhida.

Crie alertas quando o usuário atingir 50%, 80%, 100% ou ultrapassar o orçamento.

Os limites deverão ser configuráveis.

Permita copiar orçamentos entre meses e criar orçamentos recorrentes.

Implemente a possibilidade de reservar dinheiro disponível para objetivos específicos.

Não permita contar a mesma quantia duas vezes como disponível.

## 16. METAS FINANCEIRAS

Crie módulo de metas.

Permita cadastrar objetivos como reserva de emergência, compra de moto, viagem, aquisição de imóvel e outros.

Cada meta deverá possuir nome, descrição, valor alvo, valor inicial, data alvo, prioridade e contribuição planejada.

Mostre percentual de conclusão.

Mostre quanto falta.

Mostre quanto precisa guardar mensalmente para alcançar o objetivo na data escolhida.

Calcule data estimada de conclusão considerando o plano atual.

Permita vincular uma conta ou reserva financeira à meta.

Implemente aportes, retiradas e histórico.

A movimentação de dinheiro para uma meta deverá respeitar sua natureza contábil.

Transferir recursos entre contas ou reservar dinheiro não deve ser automaticamente tratado como despesa de consumo.

Permita metas simultâneas e simulações de prioridades.

## 17. INVESTIMENTOS

Crie um módulo de acompanhamento patrimonial de investimentos.

Permita cadastrar renda fixa, ações, fundos imobiliários, ETFs, Tesouro Direto, CDB, fundos e outros tipos de ativos.

Inicialmente, permita atualização manual das posições e preços.

Registre aportes, resgates, dividendos, rendimentos, taxas e impostos informados.

Calcule custo de aquisição, quantidade, valor atual estimado, rentabilidade nominal e evolução do patrimônio conforme os dados disponíveis.

Não invente cotações ou rendimentos.

Quando não houver cotação atualizada, exiba a data da última avaliação.

Não confunda aporte financeiro com despesa de consumo.

Permita exportar o histórico.

Prepare uma interface desacoplada para futura integração com provedores autorizados de dados de mercado, sem torná-la obrigatória para a versão inicial.

## 18. PATRIMÔNIO LÍQUIDO

Crie uma página de patrimônio.

Permita cadastrar ativos e passivos.

Ativos poderão incluir contas bancárias, investimentos, veículos, imóveis e outros bens.

Passivos poderão incluir empréstimos, financiamentos e demais obrigações.

Evite duplicar saldos já representados por contas e investimentos.

Calcule patrimônio líquido como ativos menos passivos.

Apresente gráficos históricos.

Diferencie valores de mercado informados pelo usuário de valores efetivamente disponíveis em caixa.

## 19. RELATÓRIOS

Implemente relatórios completos com filtros.

Relatório de receitas e despesas.

Relatório mensal e anual.

Relatório por categoria e subcategoria.

Relatório por estabelecimento.

Relatório por conta.

Relatório por cartão.

Relatório de assinaturas.

Relatório de despesas fixas e variáveis.

Relatório de parcelamentos.

Relatório de inadimplência e vencimentos.

Relatório de patrimônio.

Relatório de investimentos.

Relatório de orçamento.

Relatório de evolução de renda.

Relatório de economia mensal.

Permita comparar meses e anos.

Implemente exportação em CSV e PDF.

Permita escolher intervalo de datas, categorias, contas, cartões, tags e status.

Cada gráfico deverá permitir consultar os registros que compõem o indicador.

Exiba explicações simples sobre o significado de cada cálculo.

## 20. IMPORTAÇÃO E EXPORTAÇÃO DE DADOS

Implemente importação manual de arquivos CSV, OFX e, quando viável, XLSX.

Permita importar extratos bancários e movimentações de cartão.

Crie uma etapa de prévia antes de confirmar a importação.

O usuário deverá mapear colunas, ajustar datas, definir conta e revisar categorias.

Implemente detecção de possíveis duplicidades.

A importação deverá ser idempotente quando houver identificadores confiáveis.

Não registre automaticamente transações duplicadas.

Permita reverter uma importação em lote de maneira auditável.

Prepare o código para uma futura integração com Open Finance por meio de provedores autorizados, mas não implemente acesso bancário real sem credenciais, consentimento, contratos e requisitos de segurança apropriados.

Implemente exportação completa dos dados do usuário em formato estruturado e documentado.

## 21. NOTIFICAÇÕES E ALERTAS

Crie uma central de notificações.

Alerta de conta próxima do vencimento.

Alerta de conta atrasada.

Alerta de fatura próxima do vencimento.

Alerta de orçamento excedido.

Alerta de assinatura próxima de renovação.

Alerta de meta atingida.

Alerta de receita prevista ainda não recebida.

Permita configurar a antecedência dos lembretes.

Implemente notificações internas persistidas no banco.

Prepare notificações por email e push, condicionadas à configuração real dos serviços e às permissões concedidas.

Utilize tarefas agendadas seguras e idempotentes para gerar os alertas quando necessário.

Evite notificações duplicadas.

## 22. EXPERIÊNCIA DE CADASTRO RÁPIDO

Adicione um botão de nova movimentação sempre acessível.

O cadastro deverá ser rápido, mas também permitir detalhes avançados.

Implemente preenchimento progressivo.

O usuário informa inicialmente descrição, valor e tipo.

Depois poderá informar categoria, conta, data, recorrência, parcelamento, comprovante e observações.

Permita duplicar um lançamento anterior.

Permita criar modelos de despesas frequentes.

Implemente busca de categorias e estabelecimentos já utilizados.

Permita registrar várias despesas individualmente sem sair do fluxo de cadastro.

Cada registro deverá aparecer imediatamente na listagem após confirmação de persistência.

## 23. CATEGORIAS E ORGANIZAÇÃO

Crie categorias iniciais de moradia, alimentação, transporte, saúde, educação, lazer, compras, serviços, assinaturas, investimentos, impostos, tarifas e outros.

Permita criar categorias e subcategorias.

Permita definir ícones e cores.

Implemente tags.

Permita arquivar categorias sem apagar o histórico.

Não permita exclusão destrutiva que deixe movimentações históricas inconsistentes.

## 24. BUSCA GLOBAL

Implemente busca global de movimentações, estabelecimentos, contas, cartões, assinaturas e categorias.

Permita pesquisar por descrição, valor, período e tags.

Crie filtros combináveis.

Permita salvar filtros frequentes.

Otimize consultas para grandes históricos.

Implemente paginação apropriada.

## 25. MODELO DE DADOS

Projete o banco de dados antes de desenvolver as telas.

Utilize PostgreSQL com migrations versionadas.

Implemente entidades ou tabelas equivalentes para os seguintes domínios.

Perfis de usuários.

Preferências financeiras.

Contas financeiras.

Saldos iniciais e ajustes.

Categorias.

Subcategorias.

Estabelecimentos ou beneficiários.

Tags.

Transações financeiras.

Pagamentos ou liquidações.

Obrigações financeiras.

Regras de recorrência.

Ocorrências recorrentes.

Planos de parcelamento.

Parcelas individuais.

Cartões de crédito.

Faturas.

Itens de fatura.

Pagamentos de fatura.

Transferências.

Orçamentos.

Metas financeiras.

Movimentações de metas.

Dívidas e empréstimos.

Cronogramas de amortização.

Ativos e posições de investimento.

Movimentações de investimentos.

Avaliações patrimoniais.

Cenários financeiros.

Notificações.

Anexos.

Lotes de importação.

Itens importados.

Registros de auditoria.

As entidades deverão ser normalizadas, com relacionamentos, chaves estrangeiras, índices e restrições de integridade.

Evite armazenar dados agregados que possam ficar inconsistentes sem um mecanismo confiável de atualização.

Utilize identificadores UUID.

Registre datas de criação e atualização.

Toda entidade privada deverá pertencer explicitamente ao usuário autenticado ou a um escopo de propriedade igualmente seguro.

As tabelas acima são uma proposta de domínio. Refine a modelagem conforme necessário para evitar redundância e assegurar integridade.

## 26. REGRAS MONETÁRIAS OBRIGATÓRIAS

Nunca utilize cálculos de ponto flutuante comuns para representar dinheiro.

Utilize valores inteiros em centavos ou tipos decimais apropriados.

Defina uma única estratégia monetária e aplique consistentemente em toda a aplicação.

Implemente regras explícitas de arredondamento.

Ao dividir uma compra em parcelas, distribua os centavos restantes de forma determinística.

A soma de todas as parcelas deverá ser exatamente igual ao valor total financiado ou contratado.

Utilize o calendário civil corretamente.

Considere meses de 28, 29, 30 e 31 dias.

Defina regras documentadas para vencimentos no dia 29, 30 ou 31 quando o mês não possuir aquele dia.

Considere anos bissextos.

Utilize o fuso horário configurado pelo usuário, inicialmente America/Sao_Paulo.

Diferencie datas civis de instantes de tempo.

Nunca marque uma despesa como paga apenas porque o vencimento passou.

Um vencimento passado sem liquidação representa uma obrigação atrasada.

Toda operação de pagamento deverá ser idempotente e executada em uma transação atômica.

Não permita que erros de comunicação gerem pagamentos duplicados.

Garanta que estornos e cancelamentos não destruam o histórico.

## 27. MOTOR CONTÁBIL E FINANCEIRO

Projete um motor financeiro consistente, separado dos componentes de interface.

Diferencie obrigação, competência, movimento de caixa, liquidação e transferência.

Defina invariantes contábeis documentadas.

Uma compra no cartão gera obrigação e compromete limite, mas não reduz imediatamente o saldo bancário.

O pagamento da fatura reduz o saldo bancário e liquida a obrigação, sem contabilizar novamente o consumo.

Uma transferência entre contas próprias altera os saldos individuais, mas não altera a renda consolidada.

Um aporte em investimento representa alocação patrimonial, não consumo.

Uma dívida recebida aumenta o caixa e o passivo, mas não representa receita operacional.

A amortização reduz caixa e passivo.

Os juros pagos representam despesa.

O sistema deverá permitir relatórios por caixa e por competência, com explicação clara da diferença.

Crie uma camada de serviços para cálculos financeiros, previsões, parcelamentos, orçamento e patrimônio.

Não espalhe regras financeiras complexas dentro dos componentes React.

## 28. SEGURANÇA

Ative RLS em todas as tabelas privadas do Supabase.

Implemente políticas de isolamento de dados.

Um usuário nunca poderá consultar ou alterar movimentações de outra pessoa.

Garanta proteção também em buckets privados de anexos.

Não exponha chaves de serviço no navegador.

Não coloque segredos no repositório.

Valide todas as entradas no servidor.

Implemente autenticação e autorização em operações protegidas.

Adote medidas contra abuso, upload malicioso, consultas excessivas e exposição indevida de dados.

Implemente controle de sessões e proteção contra operações não autorizadas.

Registre eventos críticos em auditoria.

Prepare funcionalidades de exportação e exclusão de dados pessoais.

Considere boas práticas aplicáveis da LGPD.

Não declare conformidade legal ou certificação de segurança sem verificação adequada.

## 29. PWA E RESPONSIVIDADE

A aplicação deverá funcionar bem em desktop, tablet e celular.

Crie manifesto, ícones e configuração de instalação.

Implemente experiência responsiva em todas as telas.

Use estratégias seguras de cache para arquivos estáticos.

Não armazene informações financeiras sensíveis indiscriminadamente em caches públicos.

Se implementar operações offline, utilize armazenamento local apropriado, fila de sincronização e tratamento explícito de conflitos.

Jamais declare uma operação sincronizada antes da confirmação pelo servidor.

Priorize integridade dos dados sobre a aparência de funcionamento offline.

## 30. PERFORMANCE

Implemente carregamento eficiente.

Evite consultas desnecessárias ao banco.

Crie índices adequados.

Utilize paginação.

Evite recalcular integralmente longos históricos quando não for necessário.

Utilize cache apenas onde não houver risco de apresentar dados incorretos.

Implemente estados de carregamento, recuperação de erros e atualização após mutações.

Prepare o sistema para crescer sem precisar reescrever as regras centrais.

## 31. TESTES AUTOMATIZADOS

Implemente testes unitários, de integração e testes de fluxo completo.

Cubra obrigatoriamente os seguintes cenários.

Despesa única paga.

Despesa única pendente.

Despesa atrasada.

Parcelamento de 12 meses.

Parcelamento com valor não divisível exatamente em centavos.

Pagamento parcial.

Antecipação de parcelas.

Cancelamento de recorrência.

Alteração de uma ocorrência futura.

Recorrência no dia 31.

Ano bissexto.

Compra antes e depois do fechamento da fatura.

Pagamento integral da fatura.

Pagamento parcial da fatura.

Estorno de compra no cartão.

Transferência entre contas.

Importação duplicada.

Alteração de saldo inicial.

Receita prevista e receita efetiva.

Cálculo de renda média.

Projeção financeira.

Aporte em investimento.

Amortização de dívida.

Isolamento de usuários por RLS.

Tentativa de consultar registros de outro usuário.

Não considere o projeto concluído enquanto as regras financeiras críticas não estiverem cobertas por testes.

## 32. ESTRUTURA DA APLICAÇÃO

Organize o código por domínios de negócio.

Separe interface, validação, serviços financeiros, acesso a dados, autenticação e lógica de relatórios.

Utilize componentes reutilizáveis.

Centralize os tipos e validações.

Mantenha documentação de arquitetura.

Crie arquivos de configuração e exemplo de variáveis de ambiente.

Utilize padrões claros de nomenclatura.

Evite dependências circulares.

Evite funções excessivamente grandes.

Mantenha consistência visual e técnica em todos os módulos.

## 33. FUNCIONALIDADES DE QUALIDADE DE VIDA

Implemente onboarding guiado.

Adicione atalhos de teclado no desktop.

Crie filtros rápidos.

Permita selecionar períodos financeiros.

Implemente confirmação antes de exclusões ou operações irreversíveis.

Permita desfazer operações quando viável.

Adicione histórico de alterações importantes.

Crie uma central de preferências.

Implemente modo de privacidade para ocultar valores monetários na interface.

Permita personalizar a ordem dos cartões do dashboard, caso isso não comprometa a simplicidade.

Crie uma visão resumida para celular.

Implemente uma página de ajuda explicando saldo, competência, pagamento, orçamento e projeções.

## 34. DOCUMENTAÇÃO

Crie um README completo.

Documente instalação, execução, banco de dados, migrations, variáveis de ambiente, testes e deploy.

Documente as regras financeiras essenciais.

Crie um arquivo de decisões de arquitetura.

Documente limitações conhecidas e funcionalidades que exigem credenciais externas.

Forneça instruções objetivas para publicar em Vercel utilizando Supabase.

Não inclua credenciais reais.

## 35. PLANO DE IMPLEMENTAÇÃO

Não tente criar todas as funcionalidades de maneira superficial em uma única entrega.

Implemente por fases funcionais, mantendo o projeto executável.

Fase 1. Estrutura inicial, design system, autenticação, banco, contas financeiras, categorias e preferências.

Fase 2. Cadastro de receitas, despesas, pagamentos, parcelamentos e recorrências, incluindo motor financeiro e testes.

Fase 3. Cartões, faturas, assinaturas, calendário e alertas.

Fase 4. Dashboard real, orçamento, relatórios e planejamento financeiro.

Fase 5. Metas, dívidas, investimentos, patrimônio e cenários.

Fase 6. Importação, exportação, notificações avançadas, PWA, otimizações e testes de ponta a ponta.

A cada fase, entregue código funcional, migrations, testes e documentação.

Priorize integridade financeira e segurança antes de recursos secundários.

Se uma integração exigir credenciais externas, implemente a estrutura e documente a configuração necessária, sem simular sucesso ou criar integração falsa.

## 36. CRITÉRIOS DE ACEITAÇÃO

O Gevyro Finanças somente estará funcionalmente completo quando o usuário conseguir realizar os seguintes processos.

Criar uma conta e acessar seus próprios dados.

Cadastrar suas contas bancárias e respectivos saldos iniciais.

Cadastrar sua renda mensal.

Cadastrar uma despesa única.

Cadastrar uma despesa parcelada com duração definida.

Cadastrar uma despesa recorrente sem duração definida.

Consultar todas as parcelas futuras.

Registrar pagamentos individuais.

Visualizar obrigações atrasadas.

Cadastrar cartões e compras parceladas.

Consultar e pagar faturas corretamente.

Cadastrar e acompanhar assinaturas.

Visualizar calendário financeiro.

Ver quanto tem de dinheiro real disponível.

Ver quanto está comprometido nos próximos meses.

Descobrir em quais meses cada parcelamento termina.

Consultar quanto poderá guardar.

Criar metas financeiras.

Acompanhar investimentos e patrimônio.

Gerar relatórios.

Importar e exportar dados.

Utilizar todas as telas no computador e no celular.

Encerrar e reabrir a sessão sem perder informações.

Todos os dados devem persistir corretamente.

Todos os cálculos importantes deverão possuir testes.

## 37. INSTRUÇÕES FINAIS

Quero um produto realmente completo, com engenharia séria e experiência profissional.

Não quero um projeto demonstrativo.

Não quero menus sem funcionalidade.

Não quero botões decorativos.

Não quero gráficos com informações fixas.

Não quero módulos que apenas mostrem uma mensagem dizendo que serão implementados futuramente.

Não quero que os dados sejam perdidos quando a página atualizar.

Não quero que a interface esconda erros de persistência.

Não quero cálculos financeiros aproximados apresentados como valores exatos.

Ao encontrar ambiguidades, escolha a solução tecnicamente mais segura e documente a decisão.

Antes de implementar, analise o repositório e a documentação necessária, proponha a arquitetura e registre um plano de execução no projeto.

Depois comece a implementação imediatamente.

Execute as fases em sequência, valide cada entrega e mantenha uma lista objetiva de funcionalidades concluídas, pendentes e bloqueadas.

Se o ambiente não possuir credenciais, serviços externos ou permissões necessárias, deixe a integração preparada e registre exatamente o que falta.

Não afirme que uma funcionalidade foi concluída sem executar as verificações disponíveis.

Ao final, execute lint, checagem de tipos, testes e build de produção, corrigindo os problemas encontrados.

Entregue um sistema chamado **Gevyro Finanças**, pronto para se tornar meu centro de controle financeiro pessoal.