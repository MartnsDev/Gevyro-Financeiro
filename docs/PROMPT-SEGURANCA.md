# Prompt de revisão de segurança do Gevyro Finanças

Atue como revisor de segurança deste aplicativo financeiro. Repositório autorizado: **https://github.com/MartnsDev/Gevyro-Financeiro**. Não escreva em outro repositório. Não leia nem divulgue registros financeiros reais para produzir evidência.

1. Identifique ambiente, versão, commit e escopo. Faça primeiro revisão estática, testes locais e testes em banco descartável. Em produção, use somente contas de teste autorizadas e verificações não destrutivas.
2. Examine arquivos atuais e, quando disponível, histórico Git, artefatos, logs, imagens e fixtures por senhas, JWT administrativo, service role, chaves secretas, tokens GitHub/Vercel e dados pessoais. Registre apenas caminho/tipo, nunca o valor. Se encontrar exposição, interrompa publicação e proponha rotação; remover do arquivo não basta.
3. Confirme que variáveis `NEXT_PUBLIC_*` contêm apenas configuração pública. Google Client Secret, senhas PostgreSQL e tokens administrativos ficam exclusivamente nos provedores ou ambientes privados apropriados.
4. Revise Google OAuth com PKCE, redirects exatos, retorno sem redirecionamento aberto, mensagens de erro, sessão expirada, refresh e logout. Tente acesso sem sessão, por senha e usando `user_metadata` adulterado. Não apresente botão Google como prova de exclusividade no servidor.
5. Inspecione RLS de todas as tabelas Gevyro, privilégios, schemas expostos, SECURITY DEFINER, search_path e RPCs. Com usuários A e B, prove que A não lê/grava dados de B, que anon é recusado e que IDs de terceiros não atravessam FKs. Teste SQL/API diretamente, além da interface. Não remova o acesso legítimo do proprietário aos próprios dados.
6. No Supabase compartilhado, preserve objetos, políticas, usuários, provedores e redirects MCell. Não aplique a migration standalone, não faça db push indiscriminado e não desabilite o login da loja. Verifique conflitos e use somente migrations incrementais Gevyro.
7. Teste revisão otimista, rollback, integridade em centavos, sobrepagamento, reembolso, estorno e imutabilidade. Revise importação CSV/OFX, conteúdo tratado como texto, limites de tamanho e exportação CSV contra fórmulas.
8. Verifique CSP, frame-ancestors, HSTS em HTTPS, MIME, referrer, cache, service worker, logs, XSS, URLs, downloads e dados no navegador. Documente scripts inline da exportação estática e as limitações de persistência de sessão/local. Não alegue criptografia própria inexistente.
9. Confira dependências e avisos de segurança em fontes oficiais. Corrija de forma compatível, sem atualizar major indiscriminadamente; execute novamente os testes afetados.
10. Confirme o repositório GitHub exato e o projeto Vercel antes de qualquer escrita. Revise artefato sem .env, dumps, credenciais, sessões ou dados de usuários. Preserve orçamento adicional zero e não contrate recursos.
11. Gere relatório com achado, severidade justificada, evidência sem segredos, correção, teste e risco residual. Separe confirmado, não verificado e bloqueado. Um teste local não é homologação remota. Não prometa “100% seguro”.

Execute lint, tipos, testes, scanner, build e SQL descartável. Ao final, informe commit, deploy confirmado, controles aplicados e pendências reais. Não declare nuvem, OAuth ou RLS de produção prontos sem evidência no ambiente real.

## Controles adicionados nesta atualização

Verifique a função privada `validate_financial_update`, a manutenção dos RPCs públicos invoker e a ausência de grants de execução do novo validador ao cliente. Tente duplicar `(planId, installment)`, sobrescrever vencimento original, apagar auditoria, alterar um pagamento anterior, repetir/forjar estorno de reembolso, desviar sua conta, adulterar preço × quantidade, caixa, custo, posição e sequência de investimento. Cada tentativa deve falhar com rollback integral. Confira também que estornar juros devolve o caixa e reverte sua despesa nos relatórios. Não execute fixtures de testes ou importe exemplos na produção.
