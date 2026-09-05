# Motor V3 Tournament Stage Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make tournament stage a required exact-match dimension for certified Motor V3 solver fixtures so final-table strategies cannot leak into non-final-table runtime contexts.

**Architecture:** Extend `TournamentContextV3` with a required closed `stage` enum, include it in `sameCertifiedContext()`, migrate every existing V3 benchmark/test context explicitly, then add regression coverage proving stage mismatch forces fallback. Preserve all existing evidence, sizing, and anti-false-precision behavior.

**Tech Stack:** TypeScript, Vitest, GitHub Actions, existing Motor V3 benchmark/bridge architecture.

**Spec:** `docs/superpowers/specs/2026-09-04-motor-v3-tournament-stage-context-design.md`

## Global Constraints

- Work only on branch `docs/motor-v3-design` / draft PR #40.
- Do not modify Motor V2 behavior.
- Do not modify UI, Instagram, funnel, product, or copy.
- `stage` is required; no implicit default.
- Certified matching remains exact; no interpolation between stages.
- Only evidence-supported stage labels may be used.
- No merge to `main` in this task.

---

### Task 1: Lock the stage-matching contract with RED tests

**Files:**
- Modify: `src/v3/tournamentContext.test.ts`
- Modify: `src/v3/livePreflopBridge.test.ts`

**Interfaces:**
- Consumes: existing `TournamentContextV3`, `sameCertifiedContext()`, `livePreflopFromFixtures()`.
- Produces: failing tests requiring a `stage` field and proving a stage mismatch prevents certified override.

- [ ] **Step 1: Add stage equality tests to `tournamentContext.test.ts`**

Add a base context containing `stage: "FINAL_TABLE"` and assert:

```ts
expect(sameCertifiedContext(base, { ...base, stage: "BUBBLE" })).toBe(false);
expect(sameCertifiedContext(base, { ...base })).toBe(true);
```

- [ ] **Step 2: Add a bridge regression proving neighboring stage falls back**

Create a certified hand-level fixture with `stage: "FINAL_TABLE"`, query it with otherwise-identical `stage: "BUBBLE"`, and assert:

```ts
expect(result.source).toBe("FALLBACK_V2");
```

- [ ] **Step 3: Run focused tests to verify RED**

Run:

```bash
npx vitest run src/v3/tournamentContext.test.ts src/v3/livePreflopBridge.test.ts
```

Expected: compile/test failure because `TournamentContextV3` does not yet define or compare `stage`.

- [ ] **Step 4: Commit the RED tests**

```bash
git add src/v3/tournamentContext.test.ts src/v3/livePreflopBridge.test.ts
git commit -m "test(v3): require exact tournament-stage matching"
```

---

### Task 2: Add the required stage dimension and migrate existing V3 contexts

**Files:**
- Modify: `src/v3/tournamentContext.ts`
- Modify: `src/v3/benchmarks/blindWar.ts`
- Modify: any V3 tests/build sites that construct `TournamentContextV3`

**Interfaces:**
- Consumes: all current V3 context construction sites.
- Produces: `TournamentStageV3` and a required `stage: TournamentStageV3` field; `sameCertifiedContext()` requires exact stage equality.

- [ ] **Step 1: Add the closed stage type and required field**

Implement:

```ts
export type TournamentStageV3 =
  | "EARLY"
  | "MIDDLE"
  | "BUBBLE"
  | "IN_THE_MONEY"
  | "FINAL_TABLE";

export interface TournamentContextV3 {
  format: TournamentFormatV3;
  stage: TournamentStageV3;
  fieldRemainingPct?: number;
  positions: string[];
  stacksBB: Record<string, number>;
  effectiveStackBB: number;
  coverage: CoverageRelation[];
  payouts?: number[];
  bounties?: Record<string, number>;
}
```

- [ ] **Step 2: Require stage equality in certified matching**

Update `sameCertifiedContext()` so its first comparisons include:

```ts
return a.format === b.format
  && a.stage === b.stage
  && a.fieldRemainingPct === b.fieldRemainingPct
```

- [ ] **Step 3: Migrate existing Blind War fixtures explicitly**

Annotate BW1-BW4 with the evidence-supported broad post-ITM stage rather than inferring final table:

```ts
stage: "IN_THE_MONEY",
```

Annotate BW5 consistently with its 25%-field official article context:

```ts
stage: "IN_THE_MONEY",
```

Do not label any existing fixture `FINAL_TABLE` unless its source explicitly establishes that condition.

- [ ] **Step 4: Fix every V3 test/context construction site surfaced by TypeScript**

For each V3-only test fixture, choose the stage already implied by that test's benchmark/context; do not use a production default helper.

- [ ] **Step 5: Run focused tests to verify GREEN**

Run:

```bash
npx vitest run src/v3/tournamentContext.test.ts src/v3/livePreflopBridge.test.ts src/v3/benchmarks/blindWar.test.ts src/v3/externalValidation.test.ts src/v3/blindWar.test.ts src/v3/preflopShadow.test.ts src/ranges/preflopV3Wiring.test.ts
```

Expected: all pass.

- [ ] **Step 6: Commit the contract migration**

```bash
git add src/v3 src/ranges/preflopV3Wiring.test.ts
git commit -m "feat(v3): add exact tournament-stage context"
```

---

### Task 3: Freeze benchmark-stage completeness and full regression

**Files:**
- Modify: `src/v3/benchmarks/blindWar.test.ts`

**Interfaces:**
- Consumes: migrated `BLIND_WAR_BENCHMARKS`.
- Produces: a regression invariant that every certified Blind War fixture has an explicit recognized stage.

- [ ] **Step 1: Add benchmark completeness assertion**

Add:

```ts
expect(BLIND_WAR_BENCHMARKS.every((fixture) => fixture.context.stage === "IN_THE_MONEY")).toBe(true);
```

This assertion reflects only BW1-BW5 as currently certified; future final-table fixtures should update the expectation to per-ID stage mapping rather than weakening the requirement.

- [ ] **Step 2: Run the complete suite**

Run:

```bash
npm test
npm run build
```

Expected: all tests and build pass; historical 61/61 regression remains green.

- [ ] **Step 3: Commit the regression lock**

```bash
git add src/v3/benchmarks/blindWar.test.ts
git commit -m "test(v3): lock certified benchmark stages"
```

---

### Task 4: Prepare the next certified Big Blind fixture without overclaiming hand frequencies

**Files:**
- Modify later, only after exact evidence review: `src/v3/benchmarks/blindWar.ts`
- Test later: `src/v3/benchmarks/blindWar.test.ts`

**Interfaces:**
- Consumes: official GTO Wizard Big Blind article/video evidence with explicit final-table context and multi-sizing frequencies.
- Produces: a new `FINAL_TABLE` benchmark fixture only when all node-level dimensions are reproducible.

- [ ] **Step 1: Record only node-level facts that are explicit in the solver source**

Required fields before coding:

```text
node
format
stage = FINAL_TABLE
positions
stacksBB
effectiveStackBB
coverage
priorActions
actionFreq
actionSizing
evidence source/timestamp
```

- [ ] **Step 2: Do not add `handActionFreq` or `handSizingFreq` from qualitative prose**

AKo/AQo/JJ-KK driving a large sizing range is not enough to certify pure hand frequencies. Leave hand-level maps absent until the visual solver grid makes them unequivocal.

- [ ] **Step 3: When evidence is complete, add the fixture under TDD and rerun the full suite**

The new fixture must remain shadow/global-only unless hand-level composition is certified.
