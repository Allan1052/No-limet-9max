# 💡 AUDITORIA DAS DICAS — e a proposta das 4 camadas (11/09/2026)

> **Pedido do Allan:** *"eu vejo eles dando as explicação da mão lá que aquilo me
> fascina... faça essa análise e me proponha melhorias nas dicas."*
>
> Tudo abaixo foi **medido no código**. Nenhum número foi estimado.

## 0. O veredito em uma frase

**A profundidade já existe no app.** Ela está escondida atrás de um botão
chamado "Técnico" que um recreativo nunca aperta — e **não existe de jeito
nenhum na tela de Review**, que é justamente onde o Allan estuda.

---

## 1. O que a dica mostra hoje (medido)

| Onde | Modo Simples (**padrão**) | Modo Técnico |
|---|---|---|
| Painel de dicas (pós-mão) | veredito + **1 frase** | + equity, preço, EV, sizing, frequências e **leitura do board com bloqueadores** |
| **Review** (torneio importado) | veredito + 1 frase | **não existe modo técnico** |
| Mesa ao vivo | 1 frase, cortada em 3 linhas | igual |

Fonte: `HandTipsModal.tsx` (`tecnico && hasBoard` gateia a leitura do board),
`coachV2PostHand.ts` (métricas só em `mode === "technical"`),
`ImportReplayer.tsx` (zero ocorrências de `tecnico`/`UiMode`),
`settings.tsx` (padrão = `"simples"`).

---

## 2. Os seis achados

1. **`src/ui/LiveRead.tsx`: 102 linhas, completo, NUNCA importado.** Mostra
   equity vs preço, **% do range do vilão** e barra de estratégia mista. Pronto
   e desligado. (Confirmado: nenhum import em todo o `src/`.)
2. **`villainRangePct` é calculado e nunca aparece** em tela ativa — só no
   componente morto acima. É a frase de abertura de todo comentarista.
3. **Pós-flop fala pouco:** 47 modelos de frase no pré-flop (média 95 caracteres)
   contra **8** no pós-flop (média 79) — e é no pós-flop que estão as decisões
   difíceis.
4. **Bloqueadores conhecem 3 casos** (`blocker.nutFlush`, `nutFlushDraw`,
   `boardPair`). Falta o mais comum: **"você tem um Ás"**.
5. **Nenhuma dica responde "o que mudaria minha decisão?"** — conta exata,
   não opinião, e o app não faz.
6. **Nenhuma dica diz quais cartas ajudam.** O app **não calcula outs** hoje
   (verificado: as ocorrências de "outs" em `postflopBot.ts` são `payouts`).

---

## 3. A proposta: a dica em 4 camadas

Ordem em que a cabeça pergunta — a mesma do comentarista de vídeo.

**Hoje:**
> Flop · RUIM
> ✗ Melhor era Fold. Você fez Call.
> Pagou caro demais. Sua mão não tinha chance de ganhar o suficiente.

**Proposto:**
> Flop · RUIM
> ✗ Melhor era Fold. Você fez Call.
> **A leitura** — o Vilão 3 abriu de UTG: ~15% das mãos, quase tudo forte. Num
> board com Ás, o range dele acerta muito mais que o seu.
> **A conta** — você ganha 22 de cada 100 vezes; pagando 5bb num pote de 10bb,
> precisaria ganhar 33. Faltam 11.
> **O que mudaria** — se ele tivesse apostado 1,5bb, pagar valeria.
> **Cartas que te salvavam** — só as 3 damas restantes: 6% no turn.

Nada aí é opinião: os quatro números saem do motor.

### A chave Simples/Técnico muda de significado

| | Hoje | Proposto |
|---|---|---|
| Simples | veredito + 1 frase | as 4 camadas **em português, sem jargão** |
| Técnico | + números | as 4 camadas **com os números crus** |

Hoje a chave decide entre "os números" e **nada**. Proposto, ela decide o
*vocabulário* — e a explicação chega para os dois.

### No Review, usar o espaço liberado

Tirar os ◀◀ ▶▶ do topo (feito em 11/09) liberou a faixa mais nobre da tela. É
onde as 4 camadas cabem, tocável para abrir/fechar, rua a rua.

---

## 4. Ordem recomendada

| # | Frente | Custo | Observação |
|---|---|---|---|
| 1 | A conta em português no modo Simples | **dado pronto** | maior ganho, menor esforço |
| 2 | Leitura do range do vilão | **dado pronto** | `villainRangePct` já existe |
| 3 | Dica completa no Review | **dado pronto** | hoje o Review não tem modo técnico |
| 4 | "O que mudaria minha decisão" | conta nova | inverter a fórmula que já existe |
| 5 | Bloqueadores: Ás e broadways | conta nova | hoje só 3 casos |
| 6 | "Cartas que te salvavam" (outs) | conta nova | o mais caro; o mais bonito |
| 7 | Mais variedade de frase no pós-flop | escrita | 8 modelos é pouco |

**1 a 3 não mexem no motor e não inventam nada**: são dados que o app já
calcula e joga fora.

## 5. O que NÃO fazer

Não levar as 4 camadas para a **mesa ao vivo**. Ali a dica cabe em 3 linhas e
não pode roubar o lugar da mesa; ler quatro camadas no meio de uma decisão
atrapalha. As camadas são para **depois**: painel de fim de mão e Review.
