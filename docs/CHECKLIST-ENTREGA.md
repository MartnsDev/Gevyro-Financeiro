# Checklist da atualização — 22/11/2026

- [x] Arquitetura existente inspecionada; projeto e identidade visual preservados.
- [x] Parcelas individuais editáveis com original preservado, antecipação múltipla, quitação, pagamento parcial e correção de pagamento.
- [x] Carteira classificada, ticker/instituição, unidades/preço, taxas/impostos, histórico e avaliações manuais.
- [x] Caixa, consumo, aportes, transferências e patrimônio separados; fatura sem duplicar compra.
- [x] Histórico antes/depois, desfazer seguro e correções por estornos vinculados.
- [x] Datas, centavos, duplicidade, revisão otimista e invariantes financeiros validados.
- [x] 131 testes automatizados; verificações de código, custo, segredos e compilação.
- [x] RLS/transações/Google testados em PostgreSQL descartável; regressão MCell isolada.
- [x] Migração incremental aplicada no Supabase autorizado, sem backfill de registros reais.
- [x] Verificação real de RLS/permissões: 14 tabelas protegidas, acesso anônimo negado, validador privado.
- [x] Advisor sem avisos novos do Gevyro; avisos anteriores do MCell preservados fora do escopo.
- [x] Nenhuma dependência paga, integração de cotações ou novo serviço contratado.

Publicação: exclusivamente https://github.com/MartnsDev/Gevyro-Financeiro, com integração Vercel em https://gevyro-financeiro.vercel.app.

Limites: avaliações manuais e variação nominal da posição, sem apuração fiscal; correções dependentes podem ser bloqueadas para preservar histórico. Login Google com contas reais e homologação visual em dispositivos físicos não foram simulados como concluídos. Veja [verificações](VERIFICACAO-FUNCIONAL.md) e [detalhes da atualização](ATUALIZACAO-CONTROLE-FINANCEIRO.md).
