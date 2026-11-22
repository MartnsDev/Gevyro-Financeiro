# Plano de execução

O prompt original está preservado em PROMPT-ORIGINAL.md. Implementar por fases, mantendo o aplicativo executável. A lista abaixo registra implementação e verificação separadamente; nenhuma integração externa será considerada validada sem execução real.

1. Estrutura Next.js App Router, TypeScript estrito, identidade visual, autenticação Supabase, persistência e migração com RLS.
2. Motor em centavos inteiros, datas civis, contas, receitas, despesas, parcelas, recorrência, pagamentos e transferências; testes das invariantes.
3. Cartões, atribuição de faturas, pagamento sem duplicar consumo, assinaturas, calendário e alertas.
4. Dashboard calculado, orçamento, relatórios e projeções.
5. Metas, posições manuais, bens, dívidas e cenários isolados dos registros reais.
6. Importação revisável, exportação, PWA, responsividade e verificações finais.

## Arquitetura proposta

Interface React e componentes acessíveis; domínio puro em `src/domain`; validação Zod; persistência IndexedDB em modo local explicitamente identificado; Supabase Auth e PostgreSQL para uso autenticado. O modo local não é multiusuário, não sincroniza automaticamente e não substitui o banco remoto. Não haverá dados demonstrativos pré-carregados.

Os valores são centavos inteiros seguros. Decimal.js converte a entrada e aplica arredondamento half-up. Datas de vencimento são civis, sem conversão UTC. Pagamentos são registros imutáveis com chave idempotente. Competência e caixa são perspectivas distintas. A sincronização usa revisão otimista e uma transação PostgreSQL; conflitos não substituem dados silenciosamente.

## Dependências externas

Supabase: URL, chave pública, aplicação da migration, confirmação de email, URLs autorizadas e SMTP. Google OAuth, envio de email, push e Open Finance dependem de configuração e contratos externos. Publicação em Vercel requer uma conta/projeto. RLS deve ser exercitada em instância real antes de disponibilizar dados pessoais em produção.

O site gevyro.com.br não pôde ser acessado no ambiente. A direção visual segue a descrição fornecida, sem alegar reprodução exata da marca original.
