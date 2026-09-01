# Seu jogo + Leak → Treino Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar na Home evolução real do jogador e transformar a maior oportunidade recorrente em um próximo passo de revisão/treino usando apenas motores já existentes.

**Architecture:** Criar um helper puro para traduzir `ProgressSummary` + feedback persistente em um snapshot honesto de evolução; renderizar esse snapshot em um card mobile na tela Hoje; reutilizar o callback existente de treino de leaks no `App.tsx` sem alterar motor ou desbloquear recursos experimentais.

**Tech Stack:** React, TypeScript, Vitest, CSS existente, localStorage existente.

**Spec:** `docs/superpowers/specs/2026-09-01-seu-jogo-leak-treino-design.md`

## Global Constraints
- Não alterar `src/feedback/leaks.ts` nem `src/train/leakTraining.ts`.
- Não tocar no item #3 decisão → motivo → matemática publicado pela Claude.
- Não tocar em Card de quiz/Reels/Instagram.
- Não desbloquear `rua2026`.
- Não inventar métricas.
- Leak recorrente exige 2+ ocorrências.
- Tendência semanal só aparece com 5+ decisões na semana.
- Todo push que alterar o app deve adicionar uma entrada nova em português no topo de `MUDANCAS.md`.

---

### Task 1: Modelo puro de “Seu jogo”

**Files:**
- Create: `src/ui/yourGameSnapshot.ts`
- Test: `src/ui/yourGameSnapshot.test.ts`

**Interfaces:**
- Consumes: `ProgressSummary`, `FeedbackItem[]`, `detectLeaks`, `planForLeak`, `leakTrainingTrend`.
- Produces: `buildYourGameSnapshot(summary, items, trendProvider?)` e tipo `YourGameSnapshot`.

- [ ] **Step 1: Write the failing tests**

Cobrir no mínimo:
```ts
it("não diagnostica progresso robusto com menos de 5 decisões", () => {
  const snap = buildYourGameSnapshot(summary({ decisions: 4 }), []);
  expect(snap.accuracy).toBeNull();
});

it("prefere precisão semanal quando há 5+ decisões na semana", () => {
  const snap = buildYourGameSnapshot(summary({ decisions: 40, weekDecisions: 8, goodRateWeek: 75, goodRateAll: 68 }), []);
  expect(snap.accuracy).toBe(75);
  expect(snap.accuracyBasis).toBe("semana");
});

it("só chama de oportunidade um leak com duas ocorrências ou mais", () => {
  const one = [feedbackRuimLoosePreflop()];
  expect(buildYourGameSnapshot(summary({ decisions: 20 }), one).opportunity).toBeNull();
  const two = [feedbackRuimLoosePreflop(), feedbackRuimLoosePreflop()];
  expect(buildYourGameSnapshot(summary({ decisions: 20 }), two).opportunity?.id).toBe("loose_preflop");
});

it("expõe evolução real do treino quando existe", () => {
  const trend = { attempts: 2, first: 50, last: 75, best: 75, delta: 25, improved: true, history: [50, 75] };
  const snap = buildYourGameSnapshot(summary({ decisions: 20 }), [feedbackRuimLoosePreflop(), feedbackRuimLoosePreflop()], () => trend);
  expect(snap.opportunity?.trainingTrend?.delta).toBe(25);
});
```

- [ ] **Step 2: Run test to verify RED**

Run: `npm test -- src/ui/yourGameSnapshot.test.ts`
Expected: FAIL porque `yourGameSnapshot.ts` ainda não existe.

- [ ] **Step 3: Write minimal implementation**

Implementar:
```ts
export type YourGameSnapshot = {
  accuracy: number | null;
  accuracyBasis: "semana" | "geral" | null;
  trend: number | null;
  decisions: number;
  opportunity: null | {
    id: string;
    title: string;
    tip: string;
    count: number;
    canDirectedTrain: boolean;
    trainingTrend: LeakTrend | null;
  };
};
```
Regras: `accuracy=null` se total <5; usar semanal se `weekDecisions>=5`; `trend` apenas se `weekDecisions>=5`; top leak só se `count>=2`; `canDirectedTrain=true` apenas para plano `preflop`.

- [ ] **Step 4: Run focused test to verify GREEN**

Run: `npm test -- src/ui/yourGameSnapshot.test.ts`
Expected: PASS.

### Task 2: Card visual na tela Hoje

**Files:**
- Create: `src/ui/YourGameCard.tsx`
- Modify: `src/ui/HojeView.tsx`
- Modify: `src/ui/hojeView.css`
- Test: `src/ui/yourGameHomeIntegration.test.ts`
- Modify: `MUDANCAS.md`

**Interfaces:**
- Consumes: `YourGameSnapshot`.
- Produces: UI **Seu jogo** e callbacks `onTrainOpportunity` / `onReviewOpportunity`.

- [ ] **Step 1: Write failing source/integration contract**

O teste deve exigir que `HojeView.tsx`:
```ts
expect(source).toContain("YourGameCard");
expect(source).toContain("loadHandLog");
expect(source).toContain("buildYourGameSnapshot");
```
E que o card contenha as cópias:
```ts
expect(cardSource).toContain("Seu jogo");
expect(cardSource).toContain("Maior oportunidade");
expect(cardSource).toContain("Treinar esse ponto");
expect(cardSource).toContain("Revisar esse ponto");
```

- [ ] **Step 2: Run test to verify RED**

Run: `npm test -- src/ui/yourGameHomeIntegration.test.ts`
Expected: FAIL porque o card ainda não está ligado à Home.

- [ ] **Step 3: Implement minimal UI**

`HojeView` deve carregar:
```ts
const historicalItems = loadHandLog().map((entry) => entry.item);
const snapshot = buildYourGameSnapshot(progress, historicalItems);
```
E renderizar `<YourGameCard ... />` abaixo do atalho atual da Mão do Dia.

Visual do card:
- cabeçalho `SEU JOGO`;
- precisão grande quando confiável;
- tendência positiva/negativa quando disponível;
- `Maior oportunidade` com título + número de ocorrências;
- se houver treino anterior, mostrar `primeira% → última%` e delta;
- sem amostra, mensagem curta pedindo mais decisões;
- sem leak recorrente, mensagem neutra sem falsa conclusão.

- [ ] **Step 4: Add scoped CSS**

Usar somente classes `.your-game-*`, tokens atuais de tema, contraste alto, sem nova dependência.

- [ ] **Step 5: Update MUDANCAS.md in the same app-changing push**

Nova entrada no topo:
```md
## 2026-09-01 — ChatGPT — “Seu jogo” na tela Hoje
- A Home agora mostra evolução real e a maior oportunidade recorrente com base no histórico do jogador.
- Quando já existe treino desse ponto, mostra a evolução real da primeira para a última rodada.
- Onde: Hoje.
```

- [ ] **Step 6: Run focused tests**

Run: `npm test -- src/ui/yourGameSnapshot.test.ts src/ui/yourGameHomeIntegration.test.ts`
Expected: PASS.

### Task 3: Reutilizar o fluxo Leak → Treino com a trava preservada

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/ui/HojeView.tsx`
- Test: `src/ui/yourGameTrainIntegration.test.ts`
- Modify: `MUDANCAS.md`

**Interfaces:**
- Consumes: `Leak`, `createLeakDrillSession`, `planForLeak`, `isDevUnlocked("rua2026")`.
- Produces: callback compartilhado `startLeakTraining(leak)` usado por `LeaksPanel` e `HojeView`.

- [ ] **Step 1: Write failing integration contract**

Exigir que `App.tsx` tenha uma função reutilizável para o fluxo e que `HojeView` receba callbacks:
```ts
expect(appSource).toContain("startLeakTraining");
expect(appSource).toContain("onTrainOpportunity");
expect(appSource).toContain("onReviewOpportunity");
expect(appSource).toContain('isDevUnlocked("rua2026")');
```

- [ ] **Step 2: Run test to verify RED**

Run: `npm test -- src/ui/yourGameTrainIntegration.test.ts`
Expected: FAIL porque o callback ainda está inline dentro de `LeaksPanel`.

- [ ] **Step 3: Extract and reuse the existing callback**

No `App.tsx`:
```ts
const startLeakTraining = (leak: Leak) => {
  const sess = createLeakDrillSession(leak.id);
  if (!sess) {
    setLeaksOpen(true);
    return;
  }
  const plan = planForLeak(leak.id);
  setLeakTrainingSession({ session: sess, focus: plan?.focus ?? "", leakId: leak.id, leakTitle: leak.title });
  setView("drill");
  setLeaksOpen(false);
};
```
Passar para `HojeView` apenas quando a trava estiver liberada; com trava, o card chama `onReviewOpportunity` e abre `LeaksPanel`.

- [ ] **Step 4: Update MUDANCAS.md for this app-changing push**

Nova entrada acima da anterior:
```md
## 2026-09-01 — ChatGPT — Atalho da oportunidade para revisão/treino
- A maior oportunidade da Home agora leva ao treino dirigido quando ele está liberado; quando ainda está em teste, leva aos Pontos Fracos sem furar a trava atual.
- Motivo: fechar o caminho “ver o erro → agir nele” sem mudar o motor.
- Onde: Hoje e Pontos Fracos.
```

- [ ] **Step 5: Run focused tests**

Run: `npm test -- src/ui/yourGameSnapshot.test.ts src/ui/yourGameHomeIntegration.test.ts src/ui/yourGameTrainIntegration.test.ts`
Expected: PASS.

### Task 4: Validação completa e release segura

**Files:** nenhum arquivo de produto adicional salvo correções de teste/build.

- [ ] **Step 1: Run full tests**
Run: `npm test`
Expected: suite verde e SELO interno preservado.

- [ ] **Step 2: Run TypeScript/build**
Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Verify branch diff**
Confirmar que não há mudanças em feedback pós-mão da Claude, Card/Reels/Instagram, `src/feedback/leaks.ts` ou `src/train/leakTraining.ts`.

- [ ] **Step 4: Open PR and wait for CI**
PR deve declarar explicitamente: UI/produto somente; motor fora de escopo; trava `rua2026` preservada.

- [ ] **Step 5: Merge only after GREEN and verify deploy**
Merge sem force-push e acompanhar Vercel até `Deployment has completed`.