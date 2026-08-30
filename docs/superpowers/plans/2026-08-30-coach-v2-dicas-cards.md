# Coach V2 Dicas e Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer a dica ao vivo, o feedback e os cards compartilháveis refletirem a recomendação do Motor V2 no exato estado de cada decisão.

**Architecture:** Introduzir uma camada de apresentação `CoachV2Decision` derivada de `HeroAdvice` e do estado corrente, sem mudar a matemática do Motor V2. Capturar essa estrutura no instante da decisão e reutilizá-la no feedback e nos cards, evitando recálculo retroativo e divergência entre mesa, modal e card.

**Tech Stack:** TypeScript, React, Vitest, Vite, Canvas 2D.

**Spec:** `docs/superpowers/specs/2026-08-30-coach-v2-dicas-cards-design.md`

## Global Constraints
- Recomendações são por decisão, não apenas por street.
- Não alterar a matemática do Motor V2 nesta entrega.
- Não inventar métricas ausentes.
- Preservar modos Simples/Técnico.
- Preservar SELO GTO 61/61.
- Sem force-push e sem mudança direta em `main` antes da validação.

---

### Task 1: Modelo de apresentação Coach V2

**Files:**
- Create: `src/feedback/coachV2Decision.ts`
- Test: `src/feedback/coachV2Decision.test.ts`
- Modify: `src/feedback/analyzer.ts`

**Interfaces:**
- Consumes: `HeroAdvice` e snapshot mínimo da decisão.
- Produces: `CoachV2Decision` e `buildCoachV2Decision(advice, context)`.

- [ ] **Step 1:** escrever testes falhando para rótulo contextual pré-flop, sizing pós-flop e omissão de métricas ausentes.
- [ ] **Step 2:** rodar `npx vitest run src/feedback/coachV2Decision.test.ts` e confirmar RED.
- [ ] **Step 3:** implementar `CoachV2Decision` sem alterar cálculo do motor.
- [ ] **Step 4:** rodar o teste focal e confirmar GREEN.
- [ ] **Step 5:** commit.

### Task 2: Dica dinâmica por decisão

**Files:**
- Modify: `src/app/gameController.ts`
- Modify: `src/app/App.tsx`
- Create/Test: `src/app/coachV2LiveAdvice.test.ts`

**Interfaces:**
- Consumes: `computeHeroAdvice()` atual + `buildCoachV2Decision`.
- Produces: `computeHeroCoachDecision()` para a UI.

- [ ] **Step 1:** teste RED provando que a dica muda quando o estado muda dentro da mesma street e que desaparece fora da vez do herói.
- [ ] **Step 2:** rodar teste focal e confirmar RED.
- [ ] **Step 3:** implementar método de apresentação e UI simples/técnica sem cache obsoleto.
- [ ] **Step 4:** rodar teste focal e confirmar GREEN.
- [ ] **Step 5:** commit.

### Task 3: Preservar a recomendação no feedback

**Files:**
- Modify: `src/feedback/analyzer.ts`
- Modify: `src/app/gameController.ts`
- Test: `src/feedback/coachV2Feedback.test.ts`

**Interfaces:**
- `FeedbackItem.coachV2?: CoachV2Decision`.

- [ ] **Step 1:** teste RED mostrando que o feedback guarda a recomendação e métricas do instante da ação.
- [ ] **Step 2:** confirmar RED.
- [ ] **Step 3:** anexar snapshot Coach V2 ao `FeedbackItem` sem recalcular depois.
- [ ] **Step 4:** confirmar GREEN.
- [ ] **Step 5:** commit.

### Task 4: Modal de dicas V2

**Files:**
- Modify: `src/ui/HandTipsModal.tsx`
- Test: `src/ui/handTipsCoachV2.test.ts`

**Interfaces:**
- Consumes: `FeedbackItem.coachV2`.
- Produces: apresentação contextual em Simples/Técnico.

- [ ] **Step 1:** teste RED para ação + contexto no simples e métricas somente existentes no técnico.
- [ ] **Step 2:** confirmar RED.
- [ ] **Step 3:** implementar apresentação.
- [ ] **Step 4:** confirmar GREEN.
- [ ] **Step 5:** commit.

### Task 5: Cards V2 por decisão

**Files:**
- Modify: `src/ui/handShareCard.ts`
- Test: `src/ui/handShareCardCoachV2.test.ts`

**Interfaces:**
- `HandShareData.decisions` passa a aceitar ação, recomendação, correção e contexto Coach V2 por decisão.

- [ ] **Step 1:** teste RED provando que cards preservam múltiplas decisões na mesma street e coach correspondente.
- [ ] **Step 2:** confirmar RED.
- [ ] **Step 3:** montar timeline a partir do feedback capturado, sem usar só `lastItem`.
- [ ] **Step 4:** confirmar GREEN.
- [ ] **Step 5:** commit.

### Task 6: Narrativa e decisão de maior impacto

**Files:**
- Modify: `src/ui/handShareCard.ts`
- Test: `src/ui/handShareCardNarrativeV2.test.ts`

**Interfaces:**
- Produces: foco da mão calculado por severidade do rating/EV disponível, com fallback para última decisão relevante.

- [ ] **Step 1:** teste RED para destacar erro relevante anterior mesmo quando a última ação foi correta.
- [ ] **Step 2:** confirmar RED.
- [ ] **Step 3:** implementar seleção determinística do foco e resumo curto.
- [ ] **Step 4:** confirmar GREEN.
- [ ] **Step 5:** commit.

### Task 7: Validação de release

**Files:**
- Rebuild: `dist/**`
- Verify: `public/site/index.html` = `site/index.html`

- [ ] **Step 1:** `npx vitest run src/ranges/_calibration/gtoBenchmark.test.ts` → 61/61.
- [ ] **Step 2:** `npx tsc --noEmit`.
- [ ] **Step 3:** `npx vitest run`.
- [ ] **Step 4:** `npm run build` e rebuild de `dist`.
- [ ] **Step 5:** conferir paridade do site.
- [ ] **Step 6:** abrir PR para `main`, esperar CI e só integrar após GREEN.
