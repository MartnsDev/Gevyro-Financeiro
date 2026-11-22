# Atualização: dados somente no Supabase

> **Atualização remota:** o acesso pela CLI foi autorizado e as tabelas/RLS/RPCs Gevyro já foram instaladas e verificadas no MCell. A correção adicional dos RPCs privados também foi aplicada. O redirect Vercel está autorizado. Faltam habilitar Google, confirmar o plano Free e homologar o login antes de liberar a nuvem no app. Consulte [relatório da instalação](RELATORIO-SUPABASE.md). As menções a acesso recusado e migrations ausentes abaixo são registros anteriores à instalação.

- Login Google obrigatório; sem acesso financeiro anônimo ou modo local.
- Leitura/gravação via RPC, validação da sessão e revisão otimista entre dispositivos.
- Atualização automática a cada 30 segundos em primeiro plano e ao retomar conexão/janela, pausada durante formulários.
- Recuperação somente de leitura do histórico antigo; remoção após migração conferida na nuvem.
- Nenhuma fila offline, novo registro IndexedDB ou preferência financeira em localStorage.
- A sessão Auth pode persistir pelo SDK; dados financeiros só ficam na memória durante o uso.

A Vercel foi autorizada e o projeto correto está vinculado ao GitHub. A ativação do Supabase real continua bloqueada: o projeto MCell recusa acesso administrativo, os RPCs Gevyro estão ausentes e Google está desativado. A edição somente nuvem bloqueia a tela financeira até concluir isso; testes locais não homologam o projeto real.

Validação desta edição: 108 testes em 21 arquivos aprovados, além de lint, tipos, formatação, scanner, build e SQL em PostgreSQL descartável. Testes de RPC usam backend simulado; a integração real de duas contas/dispositivos continua não homologada por falta de acesso ao projeto.

## Registro anterior

# Checklist de entrega — 22/11/2026

## Preparado e validado localmente

- [x] Destino único conferido: `MartnsDev/Gevyro-Financeiro`; repositório estava vazio e há permissão de escrita.
- [x] README focado em benefícios, funcionamento e uso, com logo e três imagens ilustrativas locais; sem alegar screenshots ou nuvem ativa.
- [x] Login do Gevyro restrito à interface Google, sem cadastro/senha/recuperação; OAuth com PKCE.
- [x] Migration incremental Google para RPCs e RLS restritiva, sem alterar Auth/provedores MCell.
- [x] Testes SQL reais em PostgreSQL descartável: Google, senha, anonimato, claims adulteradas, isolamento entre usuários, histórico, rollback e conflitos.
- [x] Regressão MCell em banco descartável após as três migrations Gevyro.
- [x] Headers de segurança Vercel preparados, cache do service worker restrito a ícone e nenhuma renderização de HTML arbitrário.
- [x] Scanner da superfície de publicação sem padrões de segredos detectados. Arquivos privados e ambientes não fazem parte do envio.
- [x] Auditoria npm de dependências de produção: zero avisos conhecidos na consulta realizada nesta revisão.
- [x] Política de relato de vulnerabilidades e prompt de revisão de segurança documentados.
- [x] CI com permissões mínimas, sem segredos, actions fixadas por commit e banco descartável independente do MCell.

## Evidência de execução

A execução local final aprovou 97 testes, incluindo gravação em andamento durante logout sem reapresentação dos dados anteriores. Lint, tipos, formatação, scanner e build também foram aprovados. A primeira execução no GitHub concluiu com sucesso; as execuções seguintes podem ser consultadas em https://github.com/MartnsDev/Gevyro-Financeiro/actions. Não confundir arquivos preparados com recursos ativados.

## Homologação externa pendente

- [x] Envio completo confirmado em `https://github.com/MartnsDev/Gevyro-Financeiro` (commit inicial `9fb8364eabdb6a35300b5d00e5c0ac1268a3cb4a`).
- [x] Deploy Vercel confirmado em https://gevyro-financeiro.vercel.app com integração `MartnsDev/Gevyro-Financeiro`.
- [ ] Acesso administrativo Supabase conectado, plano conferido e três migrations instaladas no projeto real.
- [ ] Google OAuth habilitado no provedor com Client ID/Secret privados e redirects exatos.
- [ ] Homologação real com duas contas Google, RLS/API, sessão, refresh, logout e preservação MCell.
- [ ] Navegador/dispositivos disponíveis para validação visual, responsiva, gráficos reais e instalação PWA.

## Riscos e limites residuais

A nuvem continua desabilitada até validação real. A revisão estática procura padrões conhecidos; não é prova de ausência de segredos nem auditoria independente. O histórico Git futuro também precisa ser revisado antes de novos envios.

A exportação estática usa scripts inline no bootstrap Next.js e a CSP permite inline. As sessões persistidas e o modo local dependem da segurança do perfil do navegador. Administradores de banco conservam seus privilégios. Consulte [SECURITY.md](../SECURITY.md).

As limitações funcionais avançadas continuam descritas em [VERIFICACAO-FUNCIONAL.md](VERIFICACAO-FUNCIONAL.md). Nenhuma certificação de segurança, sincronização bancária, cotação automática ou garantia de retorno financeiro é declarada.

A sessão local da Vercel respondeu HTTP 403. A revisão automática bloqueou uma consulta adicional à credencial; esse caminho foi encerrado. Uma nova autorização oficial Vercel foi concluída e o deploy posteriormente funcionou. A integração Supabase também continua sem conexão administrativa, portanto não houve ativação remota nem alteração de dados MCell.
