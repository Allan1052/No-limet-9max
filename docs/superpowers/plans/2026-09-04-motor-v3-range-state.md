# Motor V3 Range State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first production-safe slice of Motor V3: externally validated benchmark fixtures, per-player range state primitives, and a Blind War V3 strategy path that reproduces certified BW1-BW5 global frequencies without replacing V2 until promotion gates pass.

**Architecture:** Add a new isolated `src/v3` subsystem. Certified external benchmarks are represented as typed fixtures. `PlayerRangeState` stores 169 hand-type frequencies plus provenance/evidence metadata. `blindWarStrategyV3` resolves only exact certified contexts in v1; unmatched contexts return a calibrated/fallback result instead of interpolating. V2 remains untouched except for later optional wiring after V3 tests pass.

**Tech Stack:** TypeScript 5.6, Vitest 2.1.8, existing range utilities in `src/ranges/types.ts`, existing hand taxonomy/combo-count utilities, npm scripts `test`, `typecheck`, `build`.

**Spec:** `docs/superpowers/specs/2026-09-04-motor-v3-range-state-design.md`

## Global Constraints

- Certified solver evidence has priority over conflicting V2 behavior only in comparable certified context.
- Coach commentary is not ground truth.
- Partial HRC/context data cannot automatically override V2.
- Node-lock/exploit must stay separate from baseline GTO.
- No hand-specific patches.
- V2 remains available as fallback and regression.
- Existing 61/61 audit remains regression coverage, not proof of global GTO fidelity.
- Global percentage alone is insufficient; hand composition must be validated where externally certified.
- First delivery performs exact benchmark matching only; no interpolation or extrapolation is marked CERTIFIED.
- No UI, Instagram, funnel, or `Seu Jogo` work is included.

---

## File Structure

Create the following focused files:

- `src/v3/evidence.ts` — evidence levels and provenance types.
- `src/v3/tournamentContext.ts` — V3 tournament/coverage context types and exact-context comparison helpers.
- `src/v3/rangeState.ts` — `PlayerRangeState` creation, validation, combo weighting, and action-filter transforms.
- `src/v3/rangeState.test.ts` — primitive range-state tests.
- `src/v3/benchmarks/types.ts` — external benchmark fixture schema.
- `src/v3/benchmarks/blindWar.ts` — BW1-BW5 certified fixtures only.
- `src/v3/benchmarks/blindWar.test.ts` — fixture integrity tests.
- `src/v3/blindWar.ts` — exact-match Blind War V3 resolver and fallback metadata.
- `src/v3/blindWar.test.ts` — solver-frequency and structural invariants.
- `src/v3/externalValidation.test.ts` — V3 promotion-gate summary tests.

Do not modify production decision files in this first plan.

---

### Task 1: Evidence and Tournament Context Contracts

**Files:**
- Create: `src/v3/evidence.ts`
- Create: `src/v3/tournamentContext.ts`
- Create: `src/v3/tournamentContext.test.ts`

**Interfaces:**
- Produces:
  - `type EvidenceLevel = "CERTIFIED" | "PARTIAL" | "CALIBRATED" | "FALLBACK_V2"`
  - `interface EvidenceSource`
  - `type TournamentFormatV3 = "VANILLA" | "PKO" | "MYSTERY_BOUNTY"`
  - `interface TournamentContextV3`
  - `interface CoverageRelation`
  - `sameCertifiedContext(a, b): boolean`

- [ ] **Step 1: Write failing exact-context tests**

```ts
import { describe, expect, it } from "vitest";
import { sameCertifiedContext, type TournamentContextV3 } from "./tournamentContext";

const base: TournamentContextV3 = {
  format: "PKO",
  fieldRemainingPct: 50,
  positions: ["SB", "BB"],
  stacksBB: { SB: 33, BB: 20 },
  effectiveStackBB: 20,
  coverage: [{ covers: "SB", covered: "BB" }],
};

describe("sameCertifiedContext", () => {
  it("accepts identical certified context", () => {
    expect(sameCertifiedContext(base, { ...base })).toBe(true);
  });

  it("rejects same effective stack when coverage is inverted", () => {
    expect(sameCertifiedContext(base, {
      ...base,
      stacksBB: { SB: 20, BB: 33 },
      coverage: [{ covers: "BB", covered: "SB" }],
    })).toBe(false);
  });

  it("rejects Vanilla vs PKO", () => {
    expect(sameCertifiedContext(base, { ...base, format: "VANILLA" })).toBe(false);
  });
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:
```bash
npm test -- src/v3/tournamentContext.test.ts
```
Expected: FAIL because V3 context modules do not exist.

- [ ] **Step 3: Implement minimal evidence/context types**

`src/v3/evidence.ts`:
```ts
export type EvidenceLevel = "CERTIFIED" | "PARTIAL" | "CALIBRATED" | "FALLBACK_V2";

export interface EvidenceSource {
  level: EvidenceLevel;
  solver?: "GTO_WIZARD" | "HRC";
  videoId?: string;
  timestamp?: string;
  note?: string;
}
```

`src/v3/tournamentContext.ts`:
```ts
export type TournamentFormatV3 = "VANILLA" | "PKO" | "MYSTERY_BOUNTY";

export interface CoverageRelation {
  covers: string;
  covered: string;
}

export interface TournamentContextV3 {
  format: TournamentFormatV3;
  fieldRemainingPct?: number;
  positions: string[];
  stacksBB: Record<string, number>;
  effectiveStackBB: number;
  coverage: CoverageRelation[];
  payouts?: number[];
  bounties?: Record<string, number>;
}

function stableCoverage(x: CoverageRelation[]): string {
  return x.map(r => `${r.covers}>${r.covered}`).sort().join("|");
}

export function sameCertifiedContext(a: TournamentContextV3, b: TournamentContextV3): boolean {
  return a.format === b.format
    && a.fieldRemainingPct === b.fieldRemainingPct
    && a.effectiveStackBB === b.effectiveStackBB
    && JSON.stringify(a.positions) === JSON.stringify(b.positions)
    && JSON.stringify(a.stacksBB) === JSON.stringify(b.stacksBB)
    && stableCoverage(a.coverage) === stableCoverage(b.coverage);
}
```

- [ ] **Step 4: Run test + typecheck**

```bash
npm test -- src/v3/tournamentContext.test.ts
npm run typecheck
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/v3/evidence.ts src/v3/tournamentContext.ts src/v3/tournamentContext.test.ts
git commit -m "feat(v3): add evidence and tournament context contracts"
```

---

### Task 2: Player Range State Primitive

**Files:**
- Create: `src/v3/rangeState.ts`
- Create: `src/v3/rangeState.test.ts`

**Interfaces:**
- Consumes: `EvidenceSource`
- Produces:
  - `interface PlayerRangeState`
  - `createRangeState(...)`
  - `rangePercent(state): number`
  - `applyActionWeights(state, action, weights): PlayerRangeState`

- [ ] **Step 1: Write failing range-state tests**

```ts
import { describe, expect, it } from "vitest";
import { applyActionWeights, createRangeState, rangePercent } from "./rangeState";

describe("PlayerRangeState", () => {
  it("keeps hand frequencies bounded 0..1", () => {
    expect(() => createRangeState("SB", { AA: 1, AKo: 1.2 }, { level: "CALIBRATED" }))
      .toThrow(/frequency/i);
  });

  it("filters the prior range instead of creating a new top-X range", () => {
    const prior = createRangeState("SB", { AA: 1, AKo: 1, "72o": 0.5 }, { level: "CALIBRATED" });
    const next = applyActionWeights(prior, "limp", { AA: 0.1, AKo: 0.5, "72o": 1 });
    expect(next.handFreq.AA).toBeCloseTo(0.1);
    expect(next.handFreq.AKo).toBeCloseTo(0.5);
    expect(next.handFreq["72o"]).toBeCloseTo(0.5);
    expect(next.history.at(-1)?.action).toBe("limp");
  });

  it("reports weighted combo percentage over 1326 combos", () => {
    const state = createRangeState("SB", { AA: 1 }, { level: "CERTIFIED" });
    expect(rangePercent(state)).toBeCloseTo(6 / 1326, 6);
  });
});
```

- [ ] **Step 2: Run focused test and verify failure**

```bash
npm test -- src/v3/rangeState.test.ts
```
Expected: FAIL because `rangeState.ts` does not exist.

- [ ] **Step 3: Implement minimal range state using existing combo utilities**

Use `comboCount` from `src/ranges/types.ts` rather than duplicating pair/suited/offsuited combo math.

Core shape:
```ts
import { comboCount } from "../ranges/types";
import type { EvidenceSource } from "./evidence";

export interface RangeHistoryItem {
  action: string;
}

export interface PlayerRangeState {
  playerId: string;
  handFreq: Record<string, number>;
  evidence: EvidenceSource;
  history: RangeHistoryItem[];
}

export function createRangeState(
  playerId: string,
  handFreq: Record<string, number>,
  evidence: EvidenceSource,
): PlayerRangeState {
  for (const [hand, freq] of Object.entries(handFreq)) {
    if (!Number.isFinite(freq) || freq < 0 || freq > 1) {
      throw new Error(`Invalid frequency for ${hand}: ${freq}`);
    }
  }
  return { playerId, handFreq: { ...handFreq }, evidence, history: [] };
}

export function rangePercent(state: PlayerRangeState): number {
  let weightedCombos = 0;
  for (const [hand, freq] of Object.entries(state.handFreq)) {
    weightedCombos += comboCount(hand) * freq;
  }
  return weightedCombos / 1326;
}

export function applyActionWeights(
  state: PlayerRangeState,
  action: string,
  weights: Record<string, number>,
): PlayerRangeState {
  const handFreq: Record<string, number> = {};
  for (const [hand, priorFreq] of Object.entries(state.handFreq)) {
    const actionWeight = weights[hand] ?? 0;
    handFreq[hand] = priorFreq * actionWeight;
  }
  return {
    ...state,
    handFreq,
    history: [...state.history, { action }],
  };
}
```

- [ ] **Step 4: Run focused test + typecheck**

```bash
npm test -- src/v3/rangeState.test.ts
npm run typecheck
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/v3/rangeState.ts src/v3/rangeState.test.ts
git commit -m "feat(v3): add per-player range state primitive"
```

---

### Task 3: Typed External Benchmark Fixtures BW1-BW5

**Files:**
- Create: `src/v3/benchmarks/types.ts`
- Create: `src/v3/benchmarks/blindWar.ts`
- Create: `src/v3/benchmarks/blindWar.test.ts`

**Interfaces:**
- Consumes: `TournamentContextV3`, `EvidenceSource`
- Produces:
  - `type BlindWarAction`
  - `interface ExternalBenchmarkFixture`
  - `BLIND_WAR_BENCHMARKS`

- [ ] **Step 1: Write failing fixture integrity tests**

```ts
import { describe, expect, it } from "vitest";
import { BLIND_WAR_BENCHMARKS } from "./blindWar";

describe("Blind War external fixtures", () => {
  it("contains BW1-BW5 and marks all as certified", () => {
    expect(BLIND_WAR_BENCHMARKS.map(x => x.id)).toEqual(["BW1", "BW2", "BW3", "BW4", "BW5"]);
    expect(BLIND_WAR_BENCHMARKS.every(x => x.evidence.level === "CERTIFIED")).toBe(true);
  });

  it("each node frequency sums to approximately 100%", () => {
    for (const fixture of BLIND_WAR_BENCHMARKS) {
      const total = Object.values(fixture.actionFreq).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(1, 2);
    }
  });
});
```

- [ ] **Step 2: Run and verify failure**

```bash
npm test -- src/v3/benchmarks/blindWar.test.ts
```
Expected: FAIL because fixture modules do not exist.

- [ ] **Step 3: Implement schema and exact certified fixtures**

Schema must include:
```ts
export interface ExternalBenchmarkFixture {
  id: string;
  node: string;
  evidence: EvidenceSource;
  context: TournamentContextV3;
  priorActions: string[];
  actionFreq: Record<string, number>;
  tolerance: number;
}
```

Encode the certified values exactly as decimal frequencies:

- BW1 PKO SB33 covers BB20: shove `.180`, raise `.250`, limp `.439`, fold `.131`.
- BW2 BB20 covered vs SB limp: shove `.103`, raise `.332`, check `.565`.
- BW3 coverage inverted BB53 covers SB27 after limp: raise `.424`, shove `.032`, check `.544`.
- BW4 Vanilla SB33 vs BB20: shove `.136`, raise `.186`, limp `.500`, fold `.178`.
- BW5 Vanilla high-ICM SB40 vs BB40: shove `.000`, raise `.119`, limp `.763`, fold `.117`.

Use source metadata:
```ts
{
  level: "CERTIFIED",
  solver: "GTO_WIZARD",
  videoId: "YwMJwdM4Msc",
  timestamp: "..."
}
```
with the audited timestamp for each fixture from the design spec/project evidence.

Do not encode combo-level frequencies unless visually certified in the source material.

- [ ] **Step 4: Run fixture tests + typecheck**

```bash
npm test -- src/v3/benchmarks/blindWar.test.ts
npm run typecheck
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/v3/benchmarks/types.ts src/v3/benchmarks/blindWar.ts src/v3/benchmarks/blindWar.test.ts
git commit -m "test(v3): add certified Blind War benchmark fixtures"
```

---

### Task 4: Exact-Match Blind War V3 Resolver

**Files:**
- Create: `src/v3/blindWar.ts`
- Create: `src/v3/blindWar.test.ts`

**Interfaces:**
- Consumes: `BLIND_WAR_BENCHMARKS`, `sameCertifiedContext`
- Produces:
  - `interface BlindWarQuery`
  - `interface BlindWarStrategyResult`
  - `blindWarStrategyV3(query): BlindWarStrategyResult`

- [ ] **Step 1: Write failing certified and fallback tests**

```ts
import { describe, expect, it } from "vitest";
import { blindWarStrategyV3 } from "./blindWar";

it("returns BW1 exact certified strategy", () => {
  const result = blindWarStrategyV3({
    node: "SB_RFI",
    context: {
      format: "PKO",
      fieldRemainingPct: 50,
      positions: ["SB", "BB"],
      stacksBB: { SB: 33, BB: 20 },
      effectiveStackBB: 20,
      coverage: [{ covers: "SB", covered: "BB" }],
    },
    priorActions: [],
  });
  expect(result.evidence.level).toBe("CERTIFIED");
  expect(result.actionFreq.limp).toBeCloseTo(.439, 3);
  expect(result.actionFreq.shove).toBeCloseTo(.180, 3);
});

it("does not pretend 25bb is certified from the 20bb benchmark", () => {
  const result = blindWarStrategyV3({
    node: "SB_RFI",
    context: {
      format: "PKO",
      fieldRemainingPct: 50,
      positions: ["SB", "BB"],
      stacksBB: { SB: 38, BB: 25 },
      effectiveStackBB: 25,
      coverage: [{ covers: "SB", covered: "BB" }],
    },
    priorActions: [],
  });
  expect(result.evidence.level).toBe("FALLBACK_V2");
  expect(result.actionFreq).toEqual({});
});
```

- [ ] **Step 2: Run and verify failure**

```bash
npm test -- src/v3/blindWar.test.ts
```
Expected: FAIL because resolver does not exist.

- [ ] **Step 3: Implement exact benchmark resolver only**

```ts
export function blindWarStrategyV3(query: BlindWarQuery): BlindWarStrategyResult {
  const fixture = BLIND_WAR_BENCHMARKS.find(x =>
    x.node === query.node
    && JSON.stringify(x.priorActions) === JSON.stringify(query.priorActions)
    && sameCertifiedContext(x.context, query.context)
  );

  if (!fixture) {
    return {
      actionFreq: {},
      evidence: { level: "FALLBACK_V2", note: "No exact certified V3 benchmark match" },
    };
  }

  return {
    actionFreq: { ...fixture.actionFreq },
    evidence: fixture.evidence,
    benchmarkId: fixture.id,
  };
}
```

No nearest-neighbor, interpolation, or stack bucketing in this task.

- [ ] **Step 4: Add structural invariants**

Add tests proving:
```ts
// PKO vs Vanilla at same 20bb effective are not equal.
expect(pko.actionFreq).not.toEqual(vanilla.actionFreq);
expect(pko.actionFreq.shove).toBeGreaterThan(vanilla.actionFreq.shove);

// High-ICM 40bb SB has dramatically more limp than raise.
expect(highIcm.actionFreq.limp).toBeGreaterThan(.70);
expect(highIcm.actionFreq.raise).toBeLessThan(.15);

// Coverage inversion changes BB iso frequency in the certified direction.
expect(inverted.actionFreq.raise).toBeCloseTo(.424, 3);
```

- [ ] **Step 5: Run focused tests + typecheck**

```bash
npm test -- src/v3/blindWar.test.ts
npm run typecheck
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/v3/blindWar.ts src/v3/blindWar.test.ts
git commit -m "feat(v3): add exact certified Blind War strategy resolver"
```

---

### Task 5: External Validation Promotion Gate

**Files:**
- Create: `src/v3/externalValidation.test.ts`

**Interfaces:**
- Consumes: benchmark fixtures and `blindWarStrategyV3`
- Produces: no production API; test-only promotion gate.

- [ ] **Step 1: Write promotion-gate tests**

```ts
import { describe, expect, it } from "vitest";
import { BLIND_WAR_BENCHMARKS } from "./benchmarks/blindWar";
import { blindWarStrategyV3 } from "./blindWar";

describe("Motor V3 external promotion gate", () => {
  for (const benchmark of BLIND_WAR_BENCHMARKS) {
    it(`${benchmark.id} reproduces certified global frequencies`, () => {
      const actual = blindWarStrategyV3({
        node: benchmark.node,
        context: benchmark.context,
        priorActions: benchmark.priorActions,
      });
      expect(actual.evidence.level).toBe("CERTIFIED");
      for (const [action, expectedFreq] of Object.entries(benchmark.actionFreq)) {
        expect(actual.actionFreq[action]).toBeCloseTo(expectedFreq, 3);
      }
    });
  }
});
```

- [ ] **Step 2: Run promotion gate**

```bash
npm test -- src/v3/externalValidation.test.ts
```
Expected: PASS.

- [ ] **Step 3: Run all V3 tests**

```bash
npm test -- src/v3
```
Expected: PASS.

- [ ] **Step 4: Run historical regression suite and typecheck**

```bash
npm test
npm run typecheck
```
Expected: all existing tests pass; any failure must be investigated before V3 wiring.

- [ ] **Step 5: Run production build**

```bash
npm run build
```
Expected: PASS, proving isolated V3 code does not break the current application bundle.

- [ ] **Step 6: Commit**

```bash
git add src/v3/externalValidation.test.ts
git commit -m "test(v3): gate Blind War promotion on certified benchmarks"
```

---

### Task 6: Promotion Review — No Production Wiring Yet

**Files:**
- Modify only if necessary for documentation: `docs/superpowers/specs/2026-09-04-motor-v3-range-state-design.md`
- Do not modify V2 engine files in this task.

**Interfaces:**
- Consumes: passing Task 1-5 outputs.
- Produces: a review decision for the next implementation plan.

- [ ] **Step 1: Compare branch against base**

```bash
git diff main...HEAD -- src/v3 docs/superpowers/specs docs/superpowers/plans
```
Expected: only V3 isolated code/tests and approved docs.

- [ ] **Step 2: Verify no accidental V2 production modifications**

```bash
git diff --name-only main...HEAD | grep -E 'src/(bots|ranges|game|engine|sim)/' || true
```
Expected: no newly modified V2 production engine files from implementation tasks.

- [ ] **Step 3: Record the first promotion decision**

Promotion is allowed to the next plan only if all are true:
- BW1-BW5 exact fixtures pass.
- coverage inversion invariant passes.
- Vanilla vs PKO invariant passes.
- high-ICM limp invariant passes.
- unmatched stack returns fallback rather than false certification.
- full historical test suite passes.
- typecheck and build pass.

If any condition fails, fix V3 in isolation before writing production wiring.

- [ ] **Step 4: Commit any documentation-only review amendment if needed**

```bash
git add docs/superpowers/specs/2026-09-04-motor-v3-range-state-design.md docs/superpowers/plans/2026-09-04-motor-v3-range-state.md
git commit -m "docs(v3): record Blind War promotion gate"
```

---

## Plan Self-Review Results

- Spec coverage for first delivery: covered by Tasks 1-6.
- No interpolation/extrapolation in first delivery: explicitly blocked in Task 4.
- V2 fallback preserved: explicit fallback result; no V2 production files changed.
- 169-hand composition: primitive supports per-hand frequency now; combo-level benchmark assertions are intentionally deferred where source is not visually certified.
- Node-lock/exploit: not introduced in this first delivery, so baseline cannot be contaminated.
- ICM core: not duplicated or rewritten in first delivery.
- No placeholders remain in implementation steps.
- Type names and signatures are consistent across tasks.

## Next Plan After This One

Only after Task 6 passes, create a second plan for controlled production wiring and certified hand-composition expansion in Blind War. That later plan may connect V3 to the existing preflop decision path behind a fallback/feature boundary. It must not begin until this isolated foundation passes the promotion gate.
