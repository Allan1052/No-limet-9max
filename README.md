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
| 3. Ranges pré-flop | Charts por posição/stack + ICM real | ✅ |
| 4. Motor de jogo | Mesa, blinds, apostas, side pots, showdown | ✅ |
| — Perfis de bot (base) | 8 perfis inspirados em MTT, aplicados ao pré-flop | ✅ |
| 5. Decisão pós-flop | Pot odds, equity realizada, textura | ✅ |
| 6. Perfis no pós-flop | c-bet/bluff por perfil | ✅ |
| 7. Interface 9-max | Mesa dark gold estilo GGPoker | ✅ |
| 8. Feedback pós-mão | Explicação de cada decisão | ✅ |
| 9. Polimento e extras | ver "Itens futuros" abaixo | ⏳ (próximo) |

Agora dá para **jogar no navegador**: `npm install && npm run dev`, abra o
endereço mostrado, clique em "Nova mão". Você joga contra os 8 perfis e recebe
feedback de cada decisão sua ao final da mão.

### Perfis de bot (8, inspirados em estilos de MTT)

Cada assento usa um perfil **inspirado** (não cópia) em um estilo conhecido,
com parâmetros que modulam ranges de abertura, frequência de 3-bet/blefe,
agressão, adaptação a stack e sensibilidade a ICM:

| Perfil | Estilo | Traço principal |
|--------|--------|-----------------|
| Nik A. | Hyper-LAG (est. Astedt) | abre larguíssimo, 3-bet e c-bet constantes |
| Chris M. | Sólido (est. Moorman) | equilibrado, sem desvios arriscados |
| Seb S. | Técnico (est. Sikorski) | adaptável a profundidades de stack |
| Mike A. | Agressivo (est. Addamo) | forte em spots complexos, agressivo |
| Fed H. | Quase-GTO (est. Holz) | muito balanceado, pouco explorador |
| Bryn K. | Maníaco (est. Kenney) | muito blefe, alta tolerância a risco |
| Steve C. | TAG preciso (est. Chidwick) | abre fechado, poucos erros |
| Dan S. | Disciplinado (est. Dan Smith) | racional, baixa variância |

### Itens futuros combinados

- ✅ Estatísticas por sessão: VPIP, PFR, 3-bet% (painel na interface).
- ✅ Aviso claro no app de que é **ferramenta de estudo, sem dinheiro real**.
- Calculadora de ICM na interface (o modelo já existe em `ranges/icm.ts`).
- Replayer de mãos com explicação da decisão ótima.
- Suíte de testes rodando milhares de mãos simuladas.

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

### Cérebro pós-flop (`bots/`)

Cada decisão pós-flop nasce da equity da mão (Monte Carlo, contra o range
estimado do vilão no board atual) comparada com as pot odds, e é calibrada por
textura de board, posição e perfil. Tudo com justificativa em texto — pronto
para o sistema de feedback.

Exemplo real (log do motor, board 8♦7♠4♣ → J♥):

```
Fed H. (Quase-GTO): APOSTA 135 — Mão de valor (equity 85% vs range): aposta 53% do pote.
Steve C. (TAG preciso): CALL — Equity 34% paga as odds de 26%: paga.
...turn...
Fed H.: ALL-IN — Mão muito forte (equity 87% vs range): aumenta por valor.
```
