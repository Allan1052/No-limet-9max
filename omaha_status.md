# Diagnóstico Omaha (PLO) — Call ou Fold

## O que JÁ existe (base sólida)

1. **omaha.ts** — Tipos, validação de mãos (4 cartas), ranges por posição (UTG a BB) com open/call/3bet/4bet/squeeze
2. **omahaEvaluator.ts** — Avaliador de mãos Omaha (2 da mão + 3 do board)
3. **omahaEquity.ts** — Cálculo de equidade Omaha (placeholder)
4. **OmahaSeat.tsx** — UI com 4 cartas (grid 2x2), suporte visual completo
5. **App.tsx** — Toggle Texas/Omaha visual, repasse de variant para mesa/controles
6. **gameController.ts** — Aceita `variant: "omaha"` nos GameOptions, passa para createTable
7. **createTable()** — Recebe variant e configura mesa Omaha
8. **betting.ts** — Suporte a Pot Limit para Omaha, settlePots com evaluateOmahaHand
9. **challenge.ts** — Payload aceita variant Omaha (mas decode rejeita 4 cartas)

## O que FALTA (bloqueios)

1. **useGame.ts** — Hook não sincroniza variant quando muda. Se trocar de Texas para Omaha, o controller não atualiza.
2. **equity.ts** — Motor de equity é 100% Hold'em (2 cartas). Não usa omahaEvaluator. Os bots e o feedback pós-flop ficam errados.
3. **postflopDecision.ts** — Usa equity de Hold'em. Conselhos pós-flop ficam errados em Omaha.
4. **preflopBot.ts** — Usa ranges de Hold'em. Em Omaha, deveria usar OmahaRanges.
5. **villainRange.ts** — ranges de Hold'em, não Omaha.
6. **gameController.configureTournament()** — Hardcoded para "holdem", ignora variant.
7. **gameController.restore()** — Não repassa variant ao recriar mesa.
8. **feedback/analyzer.ts** — Avaliação de decisões é para Hold'em.
9. **Import hand history** — Parser não suporta Omaha.

## Próximos passos (prioridade)

1. **Sync da variant no useGame.ts** — Quando trocar Texas→Omaha, recriar o controller
2. **Postflop equity Omaha** — Ligar omahaEvaluator ao motor de equity
3. **Ranges Omaha nos bots** — preflopBot deve usar OmahaRanges quando variant="omaha"
4. **Feedback Omaha** — Adaptar analyzer para avaliar decisões Omaha
