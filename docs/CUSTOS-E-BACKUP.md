# Gevyro Finanças: custos, proteção e backup

Verificação em 20/11/2026, America/Sao_Paulo. Orçamento adicional autorizado: **R$ 0,00**. Não foi comprado crédito, ativado serviço pago, alterado plano, contratado domínio nem executada migração.

## Atualização de 22/11/2026: Supabase MCell autorizado

O proprietário autorizou reutilizar o Supabase do MCell, sem contratar outro projeto. A integração foi preparada com isolamento das tabelas Gevyro e permanece **pendente de ativação**: o hostname encontrado na configuração local retornou falha de DNS e não há conexão administrativa confirmada para validar endereço, plano e migration. Nenhum dado local foi enviado, e nenhuma tabela ou configuração do MCell foi alterada. A proteção geral contra serviços externos permanece; a futura exceção será restrita ao projeto MCell confirmado. As constatações de 20/11 abaixo representam a auditoria original. A configuração pública local agora foi preparada, mas a nuvem não está conectada.

## 1. Onde está hospedado

O Gevyro Finanças continua no **ChatGPT Sites**, no mesmo endereço: [abrir aplicativo](https://gevyro-financas-pessoal.trustworthyfrog8.chatgpt.site/). A consulta oficial do Site confirmou publicação ativa, proprietário como único usuário permitido, nenhum grupo ou visitante externo e nenhuma automação. Não houve alteração de domínio ou compartilhamento.

A saída é estática, gerada pelo Next.js, em `out/`. A hospedagem é gerenciada pelo Sites; o projeto não possui contratação direta de Cloudflare, Vercel ou Supabase. O provedor interno da infraestrutura não equivale a uma conta paga externa contratada pelo usuário.

## 2. Serviços e recursos utilizados

O navegador carrega HTML, JavaScript, CSS e imagens da própria origem. Cálculos, relatórios e registros financeiros funcionam localmente; os dados persistem no IndexedDB `gevyro-financas-v1`, na mesma versão e chave anteriores.

Na inspeção: nenhuma variável hospedada configurada, nenhuma vinculação de banco D1 ou storage R2 no manifesto e nenhum uso de conectores pelo Site. O código não tem polling, cron, envio de email/push, analytics adicional, API de IA, Open Finance ou upload de comprovantes. O SDK Supabase permanece preparado no código, mas sua inicialização está bloqueada pela política de custo zero, inclusive se alguém apenas preencher as variáveis de ambiente.

O acesso privado da plataforma usa sua sessão ChatGPT; isso não representa um banco remoto das finanças. Atualizações do código não leem nem enviam os dados que já estão no seu navegador.

## 3. O que está incluído e o que não pude verificar

O Help Center informa que a hospedagem Sites está atualmente incluída no Plus/Pro; criar e editar usa a franquia Codex. Isso não é garantia de gratuidade permanente. [Fonte oficial: disponibilidade e limites](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites).

A documentação Learn anuncia gratuidade até **31/12/2026**, franquia Plus de **125 créditos mensais compartilhada entre todos os Sites**, e excedentes a partir de **01/01/2027**, com tarifas propostas. Essas condições futuras precisam ser reconfirmadas antes da mudança. [Fonte oficial: preços e cronograma](https://learn.chatgpt.com/docs/sites).

Não tive acesso à sua assinatura, faturas, saldo de créditos, recarga automática ou configuração de cobrança. Os aproximadamente R$ 100 mensais são informação fornecida por você, não valor de fatura auditado. O painel do aplicativo não mostra uma conta de hospedagem fictícia.

## 4. Recursos que poderiam gerar custo adicional

O risco está em excedentes futuros de hospedagem ou no uso de serviços habilitados fora desta configuração: banco/arquivos remotos, domínio personalizado, infraestrutura paga, SMS/SMTP comercial, APIs e créditos extras. Nenhum deles foi contratado nesta tarefa.

Créditos disponíveis podem ser consumidos automaticamente ao continuar usando recursos elegíveis depois da franquia; recarga automática compra créditos adicionais se estiver ativada. Uma instrução em texto não cria uma aprovação de faturamento. [Fonte oficial: créditos e recarga](https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage-in-chatgpt-personal-plans).

## 5. Proteções realmente implementadas

- Política explícita de orçamento adicional zero e conexões externas bloqueadas antes de criar o cliente Supabase. Tentativas remotas retornam erro, sem gravar silenciosamente em outro espaço.
- Verificação obrigatória antes do build: hospedagem estática, ausência de bindings de dados, anexos bloqueados e nenhuma dependência conhecida de cobrança/analytics habilitada. Essa checagem é preventiva e não é uma certificação de todo o código ou do faturamento.
- Gravação local limitada a 12 MiB por workspace, sem exclusão de histórico. Uma operação acima do limite é recusada antes de gravar; os registros anteriores e os backups continuam acessíveis. Esse número é limite do app, não franquia oficial de provedor.
- Transações atômicas, controle de revisão e fechamento das conexões IndexedDB; falhas não são tratadas como sucesso.
- Limites de importação de 5 MiB e 3.000 linhas por lote, incluindo OFX. Listas de movimentações exibem lotes de 30, sem consultas automáticas adicionais. O workspace continua sendo carregado localmente por inteiro; não há paginação remota implementada.
- Backups manuais completos em JSON e CSV de todas as entidades, sem filtro de mês. O CSV do relatório mensal continua disponível separadamente.
- Painel de tamanho local e consulta opcional à cota/persistência do navegador. Sem métricas de tráfego, crédito ou fatura inventadas.
- Logo original Gevyro em sidebar, cartões, rodapé, favicon e ícones PWA; versões de exibição reduzidas para evitar carregar os originais grandes a cada visita.

O código não pode recusar uma requisição antes de ela chegar à hospedagem, nem desligar cobrança de uma conta. Um limite no navegador não é um limite financeiro do CDN.

## 6. Configurações que você precisa verificar na conta

**ChatGPT:** Configurações → Usage/Uso. **Codex:** Usage & Billing/Uso e faturamento. Se disponível, mantenha **Automatic reload/recarga automática desligada** e não compre créditos. Confira saldo, compras e consumo. Desligar recarga impede novas recargas, mas não comprova que créditos já existentes não serão utilizados. Não alterei essas opções nem confirmei seu estado. [Instruções oficiais de créditos](https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage-in-chatgpt-personal-plans).

**Sites:** abra o Gevyro na lista de Sites → More actions/Mais ações → Analytics para visitas e visualizações; em More actions → Settings consulte as configurações. Essas visitas não equivalem a número de requisições ou créditos faturáveis. [Instruções oficiais de Analytics e Settings](https://learn.chatgpt.com/docs/sites/managing-a-site).

Quando a plataforma disponibilizar controle de excedentes, confirme que o comportamento é interromper ao atingir a franquia. Não localizei um controle oficial de limite financeiro zero que pudesse verificar/aplicar com as ferramentas disponíveis. Se não houver esse controle, a ausência de cobranças futuras permanece sem garantia: confirme com o suporte OpenAI antes de depender da hospedagem após a mudança anunciada. Não inventei o nome de uma opção de bloqueio de Sites.

## 7. Limites a acompanhar

No Sites: tráfego, armazenamento e franquia compartilhada da conta. Learn anuncia métricas de consumo por Site a partir de **01/12/2026**; não há acesso a esses números nesta auditoria. O painel local não os substitui. [Fonte do cronograma e franquia](https://learn.chatgpt.com/docs/sites).

No navegador: tamanho do workspace e cota da origem, que pode incluir caches e outros arquivos. `navigator.storage.estimate` é uma estimativa do navegador. `navigator.storage.persist` pode ser negado e não é garantia de backup ou retenção ilimitada.

Não foram criados keep-alives ou tarefas para burlar limites de planos gratuitos.

## 8. Existe risco de cobrança automática?

**Não é possível afirmar que todas as cobranças estão bloqueadas na sua conta.** No aplicativo, serviços externos estão bloqueados e nenhuma contratação foi feita. Na plataforma, o estado da recarga/faturamento é desconhecido e condições futuras podem gerar excedentes. Não foi configurado nenhum desligamento automático do Site, pois não há acesso a um limite financeiro verificável e não devemos interromper operações com uma falsa garantia.

Sua preferência foi aplicada às gravações do app: ao exceder o limite local, a operação é recusada com erro sem apagar os dados. Qualquer suspensão do Site deve ocorrer somente após backup e confirmação das condições reais; apagar o Site não é uma medida de proteção recomendada.

## 9. Como fazer backup e preservar o histórico

Abra **Importar e exportar → Exportar seus dados** ou **Configurações → Proteção de custos e dados**. Clique **Backup completo JSON** e **Backup completo CSV**. O JSON é o formato para restauração completa; o CSV inclui `entity`, `id` e `record_json`, preservando todos os campos e centavos inteiros. O CSV de movimentações do mês é um relatório separado e não substitui o backup completo.

Guarde os arquivos em local privado e confira se o download terminou. O aplicativo informa apenas que o download foi iniciado; não consegue garantir que o navegador salvou o arquivo. Faça backup após alterações importantes e antes de trocar navegador, limpar dados, migrar ou deixar de acessar por um longo período. Não foi necessário acessar seus registros pessoais para implementar essa função.

A ausência de acesso por algum tempo não provoca exclusão pelo código. Ainda assim, o navegador pode remover armazenamento, você pode limpar o perfil, e a hospedagem pode ficar indisponível. Solicitar persistência reduz um risco local quando concedida, mas não substitui backup. Não há garantia de retenção indefinida. Nenhuma migration destrutiva, limpeza financeira ou alteração do banco local foi executada.

## 10. Alternativa gratuita preparada, sem migração automática

**Primeira opção:** manter o app estático e os dados locais, usando backup manual. Para independência da hospedagem, `npm run build` e `npm start` permitem executá-lo no próprio computador. Isso não gera tarifa de nuvem, embora dependa do seu equipamento e ambiente. Outra opção é Vercel Hobby para o mesmo `out/`, mantendo o banco local.

**Vercel Hobby:** gratuito; a documentação atual inclui 100 GB de transferência e 1.000.000 de requisições CDN. Ao exceder limites, recursos podem ficar indisponíveis até o reset. Não aderir a Pro/trial, integrações de marketplace ou adicionais pagos. Verifique o plano selecionado em Dashboard → Settings → Billing e o uso em Usage; não é preciso contratar armazenamento para servir este app estático. [Plano Hobby oficial](https://vercel.com/docs/plans/hobby).

**Supabase Free, somente se você quiser sincronização futuramente:** 500 MB de banco, 1 GB de arquivos, 50.000 usuários ativos/mês, 5 GB de egress e 5 GB de egress em cache, até dois projetos ativos. Backups automáticos não estão incluídos. [Limites oficiais](https://supabase.com/pricing). No plano Free não há cobrança de uso; Spend Cap pertence ao Pro e não torna uma assinatura paga gratuita. [Controle oficial de custos](https://supabase.com/docs/guides/platform/cost-control). Inatividade pode pausar o projeto após sete dias; a documentação atual prevê janela de um ano para retomada na plataforma. [Pausa e restauração](https://supabase.com/docs/guides/platform/free-project-pausing).

**Sequência futura:** exportar JSON/CSV e código; confirmar Vercel Hobby e, se necessário, Supabase Free nos painéis; publicar em novo endereço de teste; somente com nova autorização revisar o bloqueio de conexões e configurar a integração; testar restauração e isolamento com dados de teste; validar contagens e saldos após uma migração autorizada; manter o endereço atual e seus registros até a validação. Não foram criadas contas externas nem feita migração. Nenhum domínio ou provedor será trocado automaticamente.
