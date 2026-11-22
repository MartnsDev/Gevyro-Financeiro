# Custos, dados e backup

## Persistência somente no Supabase

O Gevyro exige uma conta Google. Contas, lançamentos, pagamentos, cartões, metas, investimentos, preferências e histórico financeiro são lidos e gravados no Supabase. Não há modo financeiro local, cache IndexedDB de novos registros ou fila de alterações offline.

O aplicativo só confirma uma gravação após receber a revisão do servidor. Quando há falha de rede ou conflito entre dispositivos, mostra erro e preserva o estado já confirmado no servidor. Um formulário aberto permanece apenas na memória da aba e não é uma gravação concluída.

## Vários dispositivos

Use a mesma conta Google em todos os dispositivos. Cada conta acessa o mesmo proprietário no banco. A atualização acontece a cada 30 segundos enquanto a tela está visível e ao retomar a janela ou recuperar a conexão. Formulários abertos pausam essa atualização para preservar o rascunho; revisão otimista impede sobrescrever alterações de outro dispositivo.

## O que o navegador pode manter

A sessão de autenticação e o verificador do login Google podem ser mantidos pelo SDK. Isso permite continuar autenticado e concluir PKCE; não é uma cópia dos dados financeiros. Durante o uso, a interface precisa carregar dados na memória para exibi-los. O service worker armazena somente um ícone, sem HTML, dados financeiros ou respostas da API.

## Histórico de versões antigas

Registros locais preexistentes não são apagados durante a atualização. Na tela de entrada, “Recuperar backup anterior” permite baixar uma cópia. Depois de entrar, “Migrar histórico da versão anterior” transfere o histórico para uma conta vazia. A cópia antiga só é removida após gravar, reler e conferir a mesma informação no Supabase. Falhas, divergências ou alterações em outra aba preservam o histórico para recuperação. Não existe migração automática entre origens/domínios diferentes.

## Backups solicitados pelo usuário

Você pode baixar JSON/CSV explicitamente. Esses arquivos são cópias sob seu controle; guarde-os de forma privada. A exportação não cria um banco local do aplicativo. A política de backup e retenção do projeto Supabase precisa ser conferida no provedor; não há garantia de retenção indefinida.

## Limites e orçamento

O orçamento adicional autorizado continua R$ 0,00. Não foram contratados novos bancos, serviços, adicionais ou cotações. O app restringe cada documento financeiro a 12 MiB e mantém os limites de importação. Essa medida não é uma cota de cobrança da Vercel ou do Supabase. O plano e o uso dos provedores devem ser acompanhados nos painéis oficiais.

## Ativação real pendente

As variáveis públicas estão configuradas na Vercel. As tabelas, políticas e funções Gevyro já foram instaladas e verificadas no MCell pela CLI autorizada. O Google continua desativado e a confirmação do plano Free está pendente. A tela financeira fica bloqueada até concluir a configuração. Não se anuncia uma conexão ativa só porque existe uma URL/chave.
