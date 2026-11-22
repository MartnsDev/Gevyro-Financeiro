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

## Confirmar no encerramento

O log final de execução e a resposta de entrega informam a quantidade de testes e os resultados definitivos de lint, tipos, formatação e build. Não confundir arquivos preparados com recursos ativados.

## Homologação externa pendente

- [ ] Registrar envio completo e commit em `https://github.com/MartnsDev/Gevyro-Financeiro`.
- [ ] Deploy Vercel real concluído, URL e projeto confirmados, integração GitHub exata.
- [ ] Acesso administrativo Supabase conectado, plano conferido e três migrations instaladas no projeto real.
- [ ] Google OAuth habilitado no provedor com Client ID/Secret privados e redirects exatos.
- [ ] Homologação real com duas contas Google, RLS/API, sessão, refresh, logout e preservação MCell.
- [ ] Navegador/dispositivos disponíveis para validação visual, responsiva, gráficos reais e instalação PWA.

## Riscos e limites residuais

A nuvem continua desabilitada até validação real. A revisão estática procura padrões conhecidos; não é prova de ausência de segredos nem auditoria independente. O histórico Git futuro também precisa ser revisado antes de novos envios.

A exportação estática usa scripts inline no bootstrap Next.js e a CSP permite inline. As sessões persistidas e o modo local dependem da segurança do perfil do navegador. Administradores de banco conservam seus privilégios. Consulte [SECURITY.md](../SECURITY.md).

As limitações funcionais avançadas continuam descritas em [VERIFICACAO-FUNCIONAL.md](VERIFICACAO-FUNCIONAL.md). Nenhuma certificação de segurança, sincronização bancária, cotação automática ou garantia de retorno financeiro é declarada.
