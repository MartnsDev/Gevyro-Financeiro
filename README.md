<p align="center">
  <img src="public/brand/gevyro-mark.png" alt="Logo Gevyro" width="88" />
</p>

<h1 align="center">Gevyro Finanças</h1>
<p align="center"><strong>Seu dinheiro, com clareza.</strong></p>
<p align="center">Organize o presente. Entenda seus compromissos. Planeje o que vem pela frente.</p>

![Apresentação ilustrativa da visão geral do Gevyro Finanças](docs/images/visao-geral.svg)

> As imagens deste README são apresentações ilustrativas com valores fictícios. O aplicativo começa vazio, pronto para receber os seus registros.

## Faça suas finanças caberem na sua rotina

Contas em lugares diferentes, compras parceladas, assinaturas que passam despercebidas e aquela dúvida sobre quanto realmente está livre para gastar. O Gevyro Finanças reúne essas informações em um espaço simples, organizado e agradável de usar.

Você acompanha seu dinheiro com contexto: o que já aconteceu, o que está comprometido e o que pode mudar nos próximos meses. Sem depender de uma planilha espalhada ou de números que escondem os compromissos futuros.

## Tudo o que importa, em um só lugar

| Para você                | O que o Gevyro ajuda a fazer                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| Ter clareza no dia a dia | Reunir contas e carteiras, registrar receitas e despesas e acompanhar saldos.                         |
| Cuidar dos cartões       | Organizar compras, parcelas e faturas, com pagamentos integrais ou parciais.                          |
| Evitar surpresas         | Visualizar vencimentos, recorrências e assinaturas, com alertas dentro do aplicativo.                 |
| Dar destino ao dinheiro  | Criar orçamentos por categoria, acompanhar compromissos e reservar para metas.                        |
| Planejar com contexto    | Comparar cenários, observar projeções diárias e entender quando parcelas terminam.                    |
| Acompanhar o patrimônio  | Registrar posições manuais, aportes, resgates, rendimentos recebidos e dívidas.                       |
| Entender seus hábitos    | Consultar relatórios por período, conta e categoria, considerando compras, vencimentos ou pagamentos. |
| Trazer seu histórico     | Revisar importações CSV e OFX antes de confirmar, com identificação de duplicidades.                  |
| Manter uma cópia         | Exportar backups completos e restaurar registros compatíveis.                                         |

![Organize o presente, enxergue os compromissos e construa o futuro](docs/images/sua-rotina.svg)

## Pequenas decisões, uma visão maior

**Saiba quanto está disponível.** Separe saldo em conta, despesas previstas e reservas das suas metas para tomar decisões com mais informação.

**Entenda o peso das parcelas.** Veja como seus compromissos se distribuem no tempo e como o orçamento muda quando eles terminam.

**Dê atenção às assinaturas.** Acompanhe recorrências e simule a economia de cancelamentos. O controle é financeiro; cancelar um serviço exige falar com o fornecedor.

**Acompanhe cada ajuste.** Registre conciliações, juros, descontos, reembolsos e quitação antecipada com histórico, preservando a origem dos valores.

**Planeje sem confundir estimativa com dinheiro recebido.** Compare projeções conservadoras, padrão e otimistas com premissas identificadas.

## Uma experiência que respeita sua atenção

A identidade esmeralda da Gevyro encontra uma interface limpa, com navegação lateral, cartões organizados e temas claro e escuro. Você também pode ocultar valores na tela e usar atalhos para encontrar registros ou adicionar movimentações.

![Apresentação dos temas claro e escuro e do recurso de ocultar valores](docs/images/seu-espaco.svg)

## Seus dados merecem cuidado

O modo local guarda os registros neste navegador. Exportar backups periodicamente ajuda a manter uma cópia independente, especialmente antes de trocar de dispositivo ou limpar os dados do navegador.

O acesso à nuvem foi preparado para **entrar com Google**, sem pedir sua senha no Gevyro. As migrations incluem isolamento por usuário e verificações de acesso no banco. A ativação real depende da configuração e da homologação do Supabase; a existência do código não significa que a nuvem já está ativa.

Dados locais e dados da conta são separados. A cópia para uma conta vazia é uma ação explícita e preserva o original local. Não existe envio silencioso do seu histórico.

## Comece pelo essencial

1. Cadastre uma conta e informe o saldo de referência.
2. Adicione suas receitas, despesas e compromissos.
3. Organize cartões, categorias, orçamentos e metas conforme sua rotina.
4. Consulte os relatórios e as projeções para decidir os próximos passos.
5. Exporte seu backup regularmente.

O Gevyro é um organizador financeiro pessoal. Cotações, valores patrimoniais e dívidas são informados manualmente; não há conexão bancária automática, recomendação de investimento ou promessa de rentabilidade.

## Estado desta edição

Os fluxos locais essenciais estão implementados. A publicação na Vercel e o login Google no projeto real exigem as conexões administrativas e a validação descritas no [checklist de entrega](docs/CHECKLIST-ENTREGA.md). Os limites funcionais estão na [verificação funcional](docs/VERIFICACAO-FUNCIONAL.md).

Não há assinatura comercial ou checkout de venda ativado nesta edição.

## Para executar o projeto

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Acesse `http://localhost:3000`. Sem a nuvem habilitada, o aplicativo funciona no modo local. Para produção, consulte [publicação e login Google](docs/PUBLICACAO.md). Para reportar uma vulnerabilidade, consulte [SECURITY.md](SECURITY.md).

---

<p align="center"><strong>Gevyro Finanças</strong><br />Organização para hoje. Clareza para o que vem depois.</p>
