# Poker Sim — Simulador de estudo NLHE 9-max

Um simulador de No-Limit Hold'em 9-max para **estudo**, com bots que jogam de
forma consistente e explicável (estilo MTT online), motor de equity próprio e
feedback pós-mão. Roda inteiro no navegador — sem servidor.

> **Nota honesta:** isto não é um solver GTO em tempo real. É uma ferramenta de
> estudo construída sobre ranges pré-flop curados a partir de princípios de
> solver, equity exata via Monte Carlo e decisões pós-flop principiadas (pot
> odds, equity realizada, textura de board, posição). O objetivo é jogo forte,
> consistente e que sabe justificar cada decisão — ótimo para aprender.

## Como usar

```bash
npm install      # instala as dependências (uma vez)
npm test         # roda os testes do motor (prova que a matemática está certa)
npm run dev      # sobe a interface (a partir da Etapa 7)
```

## Plano por etapas

| Etapa | O que faz | Status |
|-------|-----------|--------|
| 0. Esqueleto | Projeto configurado | ✅ |
| 1. Cartas + Avaliador | Baralho e avaliador de mãos de 7 cartas | ✅ |
| 2. Equity (Monte Carlo) | Motor de equity mão vs mão / vs range | ✅ |
| 3. Ranges pré-flop | Charts por posição/stack + ICM | ⏳ |
| 4. Motor de jogo | Mesa, blinds, apostas, side pots, showdown | ⏳ |
| 5. Decisão pós-flop | Pot odds, equity realizada, textura | ⏳ |
| 6. Perfis de bot | LAG / TAG / nit / maníaco | ⏳ |
| 7. Interface 9-max | Mesa dark gold estilo GGPoker | ⏳ |
| 8. Feedback pós-mão | Explicação de cada decisão | ⏳ |
| 9. Polimento | ICM na UI, revisão de sessão | ⏳ |

## Estrutura

```
src/
├── engine/     Motor puro: cartas, avaliador de mãos, equity Monte Carlo
├── ranges/     Ranges pré-flop por posição/stack + ICM        (Etapa 3)
├── game/       Motor de jogo: mesa, apostas, pote, showdown    (Etapa 4)
├── bots/       Decisão pós-flop e perfis de bot                (Etapas 5-6)
├── feedback/   Análise e explicação pós-mão                    (Etapa 8)
└── ui/         Interface 9-max                                 (Etapa 7)
```

### O que já funciona (motor central)

- **`engine/cards.ts`** — cartas como inteiros 0–51 (rápido), conversão de/para
  texto ("As", "Kh"), embaralhamento e RNG com semente para testes.
- **`engine/evaluator.ts`** — avalia de 5 a 7 cartas e devolve um número
  comparável; quem tem o maior número ganha. Cobre todas as categorias,
  incluindo a "roda" (A-2-3-4-5) e straight flush.
- **`engine/equity.ts`** — Monte Carlo: mão vs mão, mão vs range, mão vs
  aleatório e multiway. Validado contra números clássicos (AA vs KK ≈ 82%).
