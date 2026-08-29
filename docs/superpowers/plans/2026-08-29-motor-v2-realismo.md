# Motor V2 Realismo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evoluir o motor do Call ou Fold para um treinador MTT 9-max mais realista, auditável e progressivamente mais difícil conforme buy-in e fase, sem reescrever a base funcional de uma vez.

**Architecture:** Manter o motor V1 preservado em `main` enquanto o V2 nasce na branch `motor-v2-realismo`. Cada mudança comportamental entra por TDD e por módulos: primeiro caracterização/dificuldade do field, depois ICM/all-in incremental, required equity pós-flop, pré-flop/re-raises, range propagation e sizing. Toda decisão V2 deve caminhar para expor premissas auditáveis em vez de esconder heurísticas sob um único número.

**Tech Stack:** TypeScript, Vitest, Vite/React, GitHub Actions.

**Spec:** Auditoria técnica do motor aprovada pelo usuário em 2026-08-29.

## Global Constraints

- Não apagar nem substituir o motor V1 em produção durante a construção do V2.
- TDD obrigatório: teste falhando antes de cada mudança de comportamento.
- Não vender o motor como solver/GTO certificado.
- Preservar os 61 spots internos como regressão e ampliar cobertura.
- Dificuldade por buy-in deve vir de composição do field + decisões melhores, não de trapacear, ver cartas do Hero ou manipular baralho.
- Micro buy-ins continuam contendo recreativos, stations e erros humanos plausíveis.
- $109 deve ter mais regulares, 3-bet, pressão e blefes coerentes que micro.
- $1.000/$10.300 devem concentrar jogadores fortes e reduzir erros exploráveis óbvios.
- Bolha e mesa final devem reagir a stacks, cobertura e premiação, não apenas a um rótulo de estágio.
- Toda alteração deve passar `npm test` e `npm run build` antes de merge em `main`.

---

### Task 1: Caracterização do realismo do field

**Files:**
- Modify: `src/bots/field.test.ts`
- Test: `src/bots/field.test.ts`

**Produces:** testes de regressão que exigem progressão clara micro -> $109 -> elite.

- [ ] Adicionar testes para concentração de regulares em $1.000 e $10.300.
- [ ] Adicionar teste de monotonicidade da proporção fish/reg por buy-in.
- [ ] Rodar o teste e confirmar RED onde o comportamento ainda não for forte o suficiente.
- [ ] Ajustar somente depois do RED confirmado.

### Task 2: Field V2 por buy-in

**Files:**
- Modify: `src/bots/field.ts`
- Modify: `src/bots/profiles.ts`
- Test: `src/bots/field.test.ts`

**Produces:** campos distintos por stake sem dificuldade artificial.

- [ ] Calibrar composição por buy-in e elite.
- [ ] Calibrar bluff/3-bet/aggression/stickiness por stake preservando arquétipos.
- [ ] Garantir que micro não vire mesa de regs e elite não mantenha excesso de fish.
- [ ] Rodar testes de field e suíte completa.

### Task 3: ICM V2 e all-in incremental

**Files:**
- Modify: `src/bots/preflopBot.ts`
- Modify: `src/ranges/icm.ts`
- Modify: `src/ranges/facingAllin.ts`
- Create/Test: `src/ranges/icmIncremental.test.ts`

**Produces:** pot odds, risk premium e equity mínima separados; risco baseado em Hero/vilão reais e decisão presente.

- [ ] Criar caso de regressão open -> 3-bet -> shove semelhante ao KQs observado.
- [ ] Confirmar RED para contexto incremental incorreto.
- [ ] Corrigir mapeamento do agressor e chips efetivamente em risco.
- [ ] Separar pot odds puras de threshold ICM na saída de decisão.
- [ ] Testar bolha, mesa final, chip leader, middle stack e short stack.

### Task 4: Required Equity Pós-flop V2

**Files:**
- Modify: `src/ranges/postflopMath.ts`
- Modify: consumidores em `src/bots/decision.ts` / coach somente se necessário.
- Create/Test: `src/ranges/postflopMathV2.test.ts`

**Produces:** river sem penalidade arbitrária de ruas futuras e flop/turn com realization explícita.

- [ ] Criar teste: river HU, meia-pot, sem ICM -> threshold próximo às pot odds.
- [ ] Confirmar RED.
- [ ] Remover dupla penalização da força representada pela aposta.
- [ ] Preservar ajustes justificáveis de multiway/draw/SPR no flop/turn.
- [ ] Rodar suíte completa.

### Task 5: Pré-flop V2 por stack e re-agressão

**Files:**
- Modify: `src/ranges/stackDepth.ts`
- Modify: `src/ranges/vsReraise.ts`
- Modify: charts/helpers necessários em `src/ranges/`
- Create/Test: `src/ranges/preflopV2.test.ts`

**Produces:** clusters 100+, 60, 40, 30, 25, 20, 15, 12, 10, 8, 6bb e flats OOP plausíveis.

- [ ] Testar posições UTG/MP/CO/BTN/SB/BB nos principais clusters.
- [ ] Testar BTN/CO/SB/BB vs open e vs 3-bet.
- [ ] Confirmar RED em flats OOP que hoje viram 4-bet/fold.
- [ ] Implementar a menor mudança coerente por cluster.
- [ ] Garantir 61/61 sem regressão não explicada.

### Task 6: Range propagation pós-flop

**Files:**
- Modify: `src/bots/villainRange.ts`
- Modify: `src/bots/postflopBot.ts`
- Create/Test: `src/bots/rangePropagation.test.ts`

**Produces:** ranges condicionadas pela sequência de ações em vez de apenas estreitamento genérico por rua.

- [ ] Criar sequências RFI/call/c-bet/call/barrel e 3-bet pot.
- [ ] Confirmar que ações diferentes produzem ranges posteriores diferentes.
- [ ] Implementar atualização leve de pesos por combo/hand type, adequada ao navegador.
- [ ] Validar performance e determinismo.

### Task 7: Sizing V2

**Files:**
- Modify: módulo atual de sizing pós-flop.
- Create/Test: `src/bots/sizingV2.test.ts`

**Produces:** sizing dependente de SPR, range/nut advantage, polarização e textura.

- [ ] Criar boards contrastantes com mesma wetness e vantagens de range diferentes.
- [ ] Confirmar RED para sizing excessivamente dependente só de textura.
- [ ] Implementar fatores auditáveis e limitados.
- [ ] Verificar que sizings continuam legais e compatíveis com a mesa.

### Task 8: Benchmark V2 e comparação V1 x V2

**Files:**
- Extend: `src/ranges/_calibration/criticalSpotValidation.ts`
- Create: `src/ranges/_calibration/motorV2Benchmark.ts`
- Create/Test: `src/ranges/_calibration/motorV2Benchmark.test.ts`

**Produces:** cobertura explícita por RFI, defesa, 3-bet, all-in, bolha, FT, flop, turn, river e sizing.

- [ ] Preservar 61 spots existentes.
- [ ] Adicionar spots críticos novos sem alegar certificação externa.
- [ ] Gerar relatório V1 x V2 para divergências.
- [ ] Bloquear merge se houver regressão crítica não explicada.

### Task 9: Integração e publicação controlada

**Files:**
- Somente após Tasks 1-8 verdes.

- [ ] Rodar `npm test` completo.
- [ ] Rodar `npm run build`.
- [ ] Revisar divergências V1 x V2.
- [ ] Abrir PR para `main` sem force-push.
- [ ] Exigir CI verde.
- [ ] Merge somente após evidência de melhoria.
- [ ] Verificar workflow de GitHub Pages antes de declarar publicado.
