# Motor V3 Controlled Blind War Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the certified Blind War V3 foundation to the live preflop decision boundary without changing any unmatched or globally-only spot, while making SB limp a first-class semantic strategy action once hand-level solver evidence exists.

**Architecture:** Keep V2 as the live default. Add an evidence-aware V3 bridge that may override a live hand only when the exact tournament/action context matches a `CERTIFIED` fixture **and** that fixture contains certified hand-level action frequencies for the current hand type. Global-only BW1-BW5 remain shadow/validation data and never drive a specific hand. Runtime legality continues to use the existing call-to-1BB mechanic for a limp, while the decision carries explicit `semanticAction: "limp"` so feedback/range layers can distinguish limp from facing-a-bet call without a broad game-engine rewrite.

**Tech Stack:** TypeScript 5.6, Vitest 2.1, existing `src/ranges/preflop.ts`, V3 benchmark fixtures and resolver, GitHub Actions (`npm test`, `npm run build`).

**Spec:** `docs/superpowers/specs/2026-09-04-motor-v3-range-state-design.md`

## Global Constraints

- Solver-certified data has priority only in the exact comparable context it certifies.
- Coach commentary is not ground truth.
- No nearest-neighbor matching, stack bucketing, interpolation, or extrapolation in this delivery.
- BW1-BW5 global frequencies are **not** sufficient to choose a live action for a specific hand.
- A live V3 override requires certified hand-level frequencies for that exact `handType`.
- V2 remains the default and fallback for every unmatched or insufficiently evidenced decision.
- Existing equity, pot odds, side pots, ICM, re-raise-war guards, and postflop logic are untouched.
- Node-lock/exploit/personality logic must not mutate the certified baseline strategy.
- No UI, Instagram, funnel, or `Seu Jogo` work in this plan.
- PR #40 remains draft; no automatic merge to `main`.

---

## File Structure

### Create
- `src/v3/livePreflopBridge.ts` — evidence gate from a live hand/context to a V3 hand-level strategy or fallback.
- `src/v3/livePreflopBridge.test.ts` — exact-context, hand-level certification, and fallback tests.
- `src/v3/preflopShadow.ts` — records/returns global certified node strategy for comparison without driving a hand.
- `src/v3/preflopShadow.test.ts` — proves BW1-BW5 can be observed in shadow while live action remains gated.
- `src/ranges/preflopV3Wiring.test.ts` — integration tests at the real `preflopDecision` API.

### Modify
- `src/v3/benchmarks/types.ts` — add optional certified `handActionFreq` metadata.
- `src/v3/blindWar.ts` — expose hand-level lookup without weakening exact-context matching.
- `src/ranges/preflop.ts` — add optional V3 context input and a narrowly-scoped pre-RFI bridge; add optional semantic action metadata.

### Explicitly do not modify
- `src/game/**`
- `src/engine/**`
- `src/bots/decision.ts`
- `src/ranges/icm.ts`
- `src/ranges/facingAllin.ts`
- `src/bots/exploit.ts`
- `src/bots/adapt.ts`

---

### Task 1: Hand-Level Evidence Contract

**Files:**
- Modify: `src/v3/benchmarks/types.ts`
- Modify: `src/v3/benchmarks/blindWar.test.ts`
- Test: `src/v3/benchmarks/blindWar.test.ts`

**Interfaces:**
- Consumes: existing `ExternalBenchmarkFixture`.
- Produces:
  - `type HandActionFreq = Record<string, number>`
  - `ExternalBenchmarkFixture.handActionFreq?: Record<string, HandActionFreq>`

- [ ] **Step 1: Write failing schema tests**

Add to `src/v3/benchmarks/blindWar.test.ts`:

```ts
it("does not invent hand-level strategy when source only certifies global frequencies", () => {
  for (const fixture of BLIND_WAR_BENCHMARKS) {
    expect(fixture.handActionFreq).toBeUndefined();
  }
});
```

And add a compile-time fixture helper inside the test:

```ts
const handCertified: ExternalBenchmarkFixture = {
  ...BLIND_WAR_BENCHMARKS[0],
  id: "TEST_HAND_CERTIFIED",
  handActionFreq: {
    AKo: { raise: 1 },
    "72o": { fold: 1 },
  },
};
expect(handCertified.handActionFreq?.AKo.raise).toBe(1);
```

- [ ] **Step 2: Run and verify failure**

```bash
npm test -- src/v3/benchmarks/blindWar.test.ts
```

Expected: TypeScript/Vitest transform fails because `handActionFreq` is not part of `ExternalBenchmarkFixture`.

- [ ] **Step 3: Implement the optional schema only**

In `src/v3/benchmarks/types.ts`:

```ts
export type HandActionFreq = Record<string, number>;

export interface ExternalBenchmarkFixture {
  id: string;
  node: string;
  evidence: EvidenceSource;
  context: TournamentContextV3;
  priorActions: string[];
  actionFreq: Record<string, number>;
  tolerance: number;
  handActionFreq?: Record<string, HandActionFreq>;
}
```

Do **not** add hand-level data to BW1-BW5 in this task.

- [ ] **Step 4: Verify fixture tests and typecheck**

```bash
npm test -- src/v3/benchmarks/blindWar.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/v3/benchmarks/types.ts src/v3/benchmarks/blindWar.test.ts
git commit -m "feat(v3): add certified hand-level benchmark contract"
```

---

### Task 2: Evidence-Aware Live Preflop Bridge

**Files:**
- Create: `src/v3/livePreflopBridge.ts`
- Create: `src/v3/livePreflopBridge.test.ts`
- Modify: `src/v3/blindWar.ts`

**Interfaces:**
- Consumes: `blindWarStrategyV3`, exact context matching, optional `handActionFreq`.
- Produces:

```ts
export type V3SemanticPreflopAction = "fold" | "limp" | "raise" | "call" | "3bet" | "jam" | "check";

export interface LivePreflopV3Query {
  node: string;
  context: TournamentContextV3;
  priorActions: string[];
  handType: string;
}

export interface LivePreflopV3Result {
  source: "V3_CERTIFIED_HAND" | "FALLBACK_V2";
  benchmarkId?: string;
  semanticMix?: Record<V3SemanticPreflopAction, number>;
  evidence: EvidenceSource;
}

export function livePreflopV3(query: LivePreflopV3Query): LivePreflopV3Result;
```

- [ ] **Step 1: Write failing tests**

Create `src/v3/livePreflopBridge.test.ts` with a test-only certified fixture injected through a pure helper:

```ts
import { describe, expect, it } from "vitest";
import { livePreflopFromFixtures } from "./livePreflopBridge";
import { BLIND_WAR_BENCHMARKS } from "./benchmarks/blindWar";

const handFixture = {
  ...BLIND_WAR_BENCHMARKS[0],
  id: "TEST_BW_HAND",
  handActionFreq: { AKo: { raise: 1 } },
};

it("allows an exact certified hand-level strategy to drive live action", () => {
  const result = livePreflopFromFixtures([handFixture], {
    node: handFixture.node,
    context: handFixture.context,
    priorActions: handFixture.priorActions,
    handType: "AKo",
  });
  expect(result.source).toBe("V3_CERTIFIED_HAND");
  expect(result.semanticMix).toEqual({ raise: 1 });
});

it("global-only certified benchmark cannot drive a specific hand", () => {
  const fixture = BLIND_WAR_BENCHMARKS[0];
  const result = livePreflopFromFixtures([fixture], {
    node: fixture.node,
    context: fixture.context,
    priorActions: fixture.priorActions,
    handType: "AKo",
  });
  expect(result.source).toBe("FALLBACK_V2");
});

it("wrong stack cannot use certified hand data", () => {
  const result = livePreflopFromFixtures([handFixture], {
    node: handFixture.node,
    context: { ...handFixture.context, effectiveStackBB: 25, stacksBB: { SB: 38, BB: 25 } },
    priorActions: [],
    handType: "AKo",
  });
  expect(result.source).toBe("FALLBACK_V2");
});
```

- [ ] **Step 2: Run and verify failure**

```bash
npm test -- src/v3/livePreflopBridge.test.ts
```

Expected: FAIL because the bridge does not exist.

- [ ] **Step 3: Implement minimal bridge**

Implement a pure fixture-injectable helper plus production wrapper:

```ts
export function livePreflopFromFixtures(
  fixtures: ExternalBenchmarkFixture[],
  query: LivePreflopV3Query,
): LivePreflopV3Result {
  const fixture = fixtures.find((x) =>
    x.node === query.node
    && sameActions(x.priorActions, query.priorActions)
    && sameCertifiedContext(x.context, query.context)
  );

  const handMix = fixture?.handActionFreq?.[query.handType];
  if (!fixture || fixture.evidence.level !== "CERTIFIED" || !handMix) {
    return {
      source: "FALLBACK_V2",
      evidence: { level: "FALLBACK_V2", note: "No exact certified hand-level V3 strategy" },
    };
  }

  return {
    source: "V3_CERTIFIED_HAND",
    benchmarkId: fixture.id,
    semanticMix: handMix,
    evidence: fixture.evidence,
  };
}

export function livePreflopV3(query: LivePreflopV3Query): LivePreflopV3Result {
  return livePreflopFromFixtures(BLIND_WAR_BENCHMARKS, query);
}
```

Validate each hand mix before returning it: finite frequencies in `[0,1]`, non-empty, sum within `1e-6` of 1.

- [ ] **Step 4: Run focused tests + typecheck**

```bash
npm test -- src/v3/livePreflopBridge.test.ts src/v3/blindWar.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/v3/livePreflopBridge.ts src/v3/livePreflopBridge.test.ts src/v3/blindWar.ts
git commit -m "feat(v3): gate live preflop on certified hand evidence"
```

---

### Task 3: Shadow Strategy Path for Global BW1-BW5

**Files:**
- Create: `src/v3/preflopShadow.ts`
- Create: `src/v3/preflopShadow.test.ts`

**Interfaces:**
- Consumes: `blindWarStrategyV3`.
- Produces:

```ts
export interface PreflopShadowResult {
  benchmarkId?: string;
  evidenceLevel: EvidenceLevel;
  globalActionFreq: Record<string, number>;
  mayDriveLiveHand: boolean;
}

export function preflopShadowV3(query: BlindWarStrategyInput, handType: string): PreflopShadowResult;
```

- [ ] **Step 1: Write failing tests**

```ts
it("observes BW1 globally but refuses to drive AKo without hand-level evidence", () => {
  const bw1 = BLIND_WAR_BENCHMARKS[0];
  const shadow = preflopShadowV3({
    node: bw1.node,
    context: bw1.context,
    priorActions: bw1.priorActions,
  }, "AKo");

  expect(shadow.evidenceLevel).toBe("CERTIFIED");
  expect(shadow.globalActionFreq.limp).toBeCloseTo(.439, 3);
  expect(shadow.mayDriveLiveHand).toBe(false);
});
```

- [ ] **Step 2: Run and verify failure**

```bash
npm test -- src/v3/preflopShadow.test.ts
```

Expected: FAIL because shadow module does not exist.

- [ ] **Step 3: Implement shadow module**

`preflopShadowV3` must return the exact global node result from `blindWarStrategyV3` and set `mayDriveLiveHand` from `livePreflopV3(...).source === "V3_CERTIFIED_HAND"`.

It must never sample an action from `globalActionFreq`.

- [ ] **Step 4: Verify**

```bash
npm test -- src/v3/preflopShadow.test.ts src/v3/externalValidation.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/v3/preflopShadow.ts src/v3/preflopShadow.test.ts
git commit -m "feat(v3): add non-invasive Blind War shadow path"
```

---

### Task 4: Narrow Preflop Decision Boundary

**Files:**
- Modify: `src/ranges/preflop.ts`
- Create: `src/ranges/preflopV3Wiring.test.ts`

**Interfaces:**
- Consumes: `livePreflopV3`, `TournamentContextV3`.
- Extends `PreflopContext` with:

```ts
v3TournamentContext?: TournamentContextV3;
v3PriorActions?: string[];
v3Node?: string;
```

- Extends `PreflopDecision` with:

```ts
semanticAction?: "limp";
v3BenchmarkId?: string;
v3EvidenceLevel?: EvidenceLevel;
```

The existing `action` union remains unchanged in this delivery. A certified limp maps to runtime `action: "call", sizeBB: 1, semanticAction: "limp"`.

- [ ] **Step 1: Write failing integration tests**

Because production BW fixtures currently have no hand-level strategy, first prove no behavior change:

```ts
it("global-only BW1 does not override the existing V2 hand decision", () => {
  const ctx = makeExistingHoldemContextForSB();
  const legacy = preflopDecision(ctx);
  const withV3 = preflopDecision({
    ...ctx,
    v3Node: "SB_RFI",
    v3TournamentContext: BLIND_WAR_BENCHMARKS[0].context,
    v3PriorActions: [],
  });
  expect(withV3.action).toBe(legacy.action);
  expect(withV3.sizeBB).toBe(legacy.sizeBB);
  expect(withV3.v3BenchmarkId).toBeUndefined();
});
```

For capability testing, export a narrow helper from `preflop.ts` that maps a `LivePreflopV3Result` to a preflop decision only when source is certified hand-level:

```ts
it("certified limp maps to legal call-to-1BB plus explicit limp semantics", () => {
  const mapped = mapCertifiedV3PreflopDecision("72o", {
    source: "V3_CERTIFIED_HAND",
    benchmarkId: "TEST_LIMP",
    evidence: { level: "CERTIFIED", solver: "GTO_WIZARD", videoId: "test", timestamp: "00:00" },
    semanticMix: { limp: 1 },
  });
  expect(mapped?.action).toBe("call");
  expect(mapped?.sizeBB).toBe(1);
  expect(mapped?.semanticAction).toBe("limp");
});
```

- [ ] **Step 2: Run and verify failure**

```bash
npm test -- src/ranges/preflopV3Wiring.test.ts
```

Expected: FAIL because V3 context fields/mapper do not exist.

- [ ] **Step 3: Implement the narrow RFI bridge**

At the start of the unopened-pot branch only (`!ctx.raiserPosition`), before V2 RFI heuristics:

```ts
if (ctx.v3TournamentContext && ctx.v3Node) {
  const live = livePreflopV3({
    node: ctx.v3Node,
    context: ctx.v3TournamentContext,
    priorActions: ctx.v3PriorActions ?? [],
    handType,
  });
  const mapped = mapCertifiedV3PreflopDecision(handType, live);
  if (mapped) return mapped;
}
```

`mapCertifiedV3PreflopDecision` rules:
- return `null` for fallback or absent mix;
- choose only a **pure** action (`freq >= .999999`) in this delivery;
- do not sample mixed strategy yet;
- map `limp` -> `{ action: "call", sizeBB: 1, semanticAction: "limp" }`;
- map `fold` -> fold/0;
- map `raise` -> raise/3 for certified Blind War RFI nodes only when fixture sizing proves 3BB;
- map `jam`/`shove` -> jam/effective stack only when the caller passes the certified sizing/effective context; if required sizing is unavailable, return null;
- attach `v3BenchmarkId` and `v3EvidenceLevel`.

Do not invoke V3 in facing-raise, 3-bet, all-in-call, Omaha, or postflop paths.

- [ ] **Step 4: Verify no existing preflop regression**

```bash
npm test -- src/ranges/preflopV3Wiring.test.ts src/ranges/preflop.test.ts src/ranges/preflopV2.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ranges/preflop.ts src/ranges/preflopV3Wiring.test.ts
git commit -m "feat(v3): add guarded live preflop decision boundary"
```

---

### Task 5: Certified-Only Activation Invariants

**Files:**
- Modify: `src/ranges/preflopV3Wiring.test.ts`
- Modify: `src/v3/externalValidation.test.ts`

**Interfaces:**
- Consumes: production preflop API + V3 bridge.
- Produces: regression gates preventing accidental global-frequency activation.

- [ ] **Step 1: Add explicit anti-false-precision tests**

Required assertions:

```ts
it("BW1-BW5 global fixtures remain shadow-only", () => {
  for (const fixture of BLIND_WAR_BENCHMARKS) {
    expect(fixture.handActionFreq).toBeUndefined();
  }
});

it("25bb nearby context never inherits 20bb certified behavior", () => {
  const live = livePreflopV3({
    node: "SB_RFI",
    context: {
      ...BLIND_WAR_BENCHMARKS[0].context,
      stacksBB: { SB: 38, BB: 25 },
      effectiveStackBB: 25,
    },
    priorActions: [],
    handType: "AKo",
  });
  expect(live.source).toBe("FALLBACK_V2");
});
```

Also assert that a `PARTIAL` test fixture with hand data cannot drive live decisions.

- [ ] **Step 2: Run V3 + preflop suites**

```bash
npm test -- src/v3 src/ranges/preflopV3Wiring.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run historical 61/61 calibration**

```bash
npm test -- src/ranges/_calibration/gtoBenchmark.test.ts src/sim/gtoAudit.test.ts
```

Expected: PASS. The historical “no limp RFI” assertion remains valid for the V2/default path until hand-level certified V3 activation exists; do not delete it in this plan.

- [ ] **Step 4: Commit**

```bash
git add src/v3/externalValidation.test.ts src/ranges/preflopV3Wiring.test.ts
git commit -m "test(v3): prevent uncertified Blind War live overrides"
```

---

### Task 6: Full Verification and Wiring Review

**Files:**
- Create: `docs/superpowers/specs/2026-09-04-motor-v3-controlled-wiring-review.md`
- Do not add further production changes in this task.

**Interfaces:**
- Consumes: Tasks 1-5.
- Produces: evidence for whether hand-composition extraction may begin.

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: PASS. If only the known randomized `src/train/drillPostflop.test.ts` uniqueness test fails, rerun the same tree once before diagnosing; do not classify it as V3 regression unless reproducible.

- [ ] **Step 2: Run typecheck and production build**

```bash
npm run typecheck
npm run build
```

Expected: PASS.

- [ ] **Step 3: Compare production changes against main**

```bash
git diff --name-only main...HEAD
```

Expected production modifications in this plan are limited to:
- `src/ranges/preflop.ts`
- new V3 files/tests
- new preflop V3 wiring tests
- docs

No changes are allowed in game engine, postflop bot decision, ICM core, facing-all-in core, or exploit modules.

- [ ] **Step 4: Record review**

Create `docs/superpowers/specs/2026-09-04-motor-v3-controlled-wiring-review.md` with these conclusions if verified:
- V3 global Blind War data is visible in shadow mode.
- No BW1-BW5 global-only fixture can drive a specific live hand.
- Exact hand-level certified data can cross the bridge.
- Limp is semantically first-class while using legal call-to-1BB runtime mechanics.
- V2 behavior remains identical for all current production fixtures because no hand-level BW data has yet been certified.
- Next required evidence task is combo/hand-level visual certification, not heuristic filling.

- [ ] **Step 5: Commit review document**

```bash
git add docs/superpowers/specs/2026-09-04-motor-v3-controlled-wiring-review.md
git commit -m "docs(v3): record controlled Blind War wiring review"
```

---

## Plan Self-Review Results

- **False precision:** blocked. Global action percentages can never choose a specific hand.
- **Exact context only:** preserved through `sameCertifiedContext`; no interpolation is introduced.
- **V2 fallback:** preserved as the only live behavior when hand-level evidence is absent.
- **Limp semantics:** added without rewriting the game engine; runtime call-to-1BB remains legal mechanics, semantic metadata distinguishes the strategic action.
- **Mixed strategies:** live sampling deliberately deferred until certified hand-level mixes exist and a deterministic sampling policy is separately tested.
- **Coverage / PKO / phase:** already first-class in `TournamentContextV3` and therefore part of exact matching.
- **Existing ICM/all-in protections:** untouched.
- **Scope:** one independently testable subsystem — safe wiring boundary — rather than attempting general preflop range migration.
- **No placeholders:** all implementation gates and expected outcomes are explicit.

## Next Plan After This One

After this plan passes, the next work is **hand-composition certification** for Blind War: visually extract solver-supported hand-level frequencies from GTO Wizard/HRC, add only the certified cells to `handActionFreq`, then activate those cells through the already-tested live bridge. The app must not fill the rest of the 169-hand grid by inference and label it certified.
