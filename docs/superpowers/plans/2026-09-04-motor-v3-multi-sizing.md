# Motor V3 Certified Multi-Sizing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o Motor V3 represente múltiplos sizings certificados da mesma ação no mesmo node sem escolher sizing live sem evidência mão-a-mão suficiente.

**Architecture:** O contrato de fixture troca `actionSizeBB` por uma distribuição estruturada `actionSizing`, enquanto `handSizingFreq` guarda distribuição por mão quando a fonte realmente a certifica. O bridge apenas valida e transporta esses dados; o adapter continua determinístico e só promove live quando há um único sizing global ou um sizing mão-a-mão puro.

**Tech Stack:** TypeScript, Vitest, GitHub Actions (`npm test`, `npm run build`).

**Spec:** `docs/superpowers/specs/2026-09-04-motor-v3-multi-sizing-design.md`

## Global Constraints

- A ação continua separada do sizing; não criar ações como `raise3.5` ou `raise7`.
- `CERTIFIED` exige contexto exato e evidência solver inequívoca.
- Nenhuma frequência de sizing pode ser inferida de área de cor ambígua.
- Multi-sizing sem informação mão-a-mão suficiente não dirige live.
- Estratégias mistas por ação continuam shadow-only nesta entrega.
- BW5 deve manter `T3s -> raise 3bb`, limps/folds existentes e fallback de mãos/contextos não certificados.
- V2 permanece fallback.
- Nada é mergeado automaticamente em `main`.

---

### Task 1: Contrato de fixture e migração do BW5

**Files:**
- Modify: `src/v3/benchmarks/types.ts`
- Modify: `src/v3/benchmarks/blindWar.ts`
- Test: `src/v3/benchmarks/blindWar.test.ts`

**Interfaces:**
- Produces: `CertifiedSizingOption`, `ActionSizingDistribution`, `HandSizingFreq`, `ExternalBenchmarkFixture.actionSizing`, `ExternalBenchmarkFixture.handSizingFreq`.
- Removes from active contract: `ExternalBenchmarkFixture.actionSizeBB`.

- [ ] **Step 1: Write the failing contract/fixture test**

Extend `src/v3/benchmarks/blindWar.test.ts` with explicit expectations for the migrated BW5 sizing contract:

```ts
it("stores certified sizing as a distribution without changing BW5 semantics", () => {
  const bw5 = BLIND_WAR_BENCHMARKS[4];
  expect(bw5.actionSizing).toEqual({
    raise: [{ sizeBB: 3, freq: 1 }],
  });
  expect("actionSizeBB" in bw5).toBe(false);
});

it("fixture contract can represent two sizings for one action", () => {
  const multi: ExternalBenchmarkFixture = {
    ...BLIND_WAR_BENCHMARKS[0],
    id: "TEST_MULTI_SIZING",
    actionSizing: {
      raise: [
        { sizeBB: 3.5, freq: 0.65 },
        { sizeBB: 7, freq: 0.35 },
      ],
    },
    handSizingFreq: {
      A5s: { raise: { 3.5: 0.4, 7: 0.6 } },
    },
  };

  expect(multi.actionSizing?.raise).toHaveLength(2);
  expect(multi.handSizingFreq?.A5s.raise?.[7]).toBe(0.6);
});
```

- [ ] **Step 2: Run test to verify RED**

Run in PR CI or local equivalent:

```bash
npx vitest run src/v3/benchmarks/blindWar.test.ts
```

Expected: FAIL because `actionSizing` / `handSizingFreq` do not exist and BW5 still exposes `actionSizeBB`.

- [ ] **Step 3: Implement the new types**

In `src/v3/benchmarks/types.ts` define:

```ts
export interface CertifiedSizingOption {
  sizeBB: number;
  freq?: number;
}

export type ActionSizingDistribution = Partial<
  Record<BlindWarAction, CertifiedSizingOption[]>
>;

export type HandSizingFreq = Record<number, number>;

export interface ExternalBenchmarkFixture {
  id: string;
  node: string;
  evidence: EvidenceSource;
  context: TournamentContextV3;
  priorActions: string[];
  actionFreq: Record<string, number>;
  actionSizing?: ActionSizingDistribution;
  tolerance: number;
  handActionFreq?: Record<string, HandActionFreq>;
  handSizingFreq?: Record<
    string,
    Partial<Record<BlindWarAction, HandSizingFreq>>
  >;
  notes?: string[];
}
```

Remove `actionSizeBB` from the interface.

- [ ] **Step 4: Migrate BW5**

Replace:

```ts
actionSizeBB: { raise: 3 },
```

with:

```ts
actionSizing: {
  raise: [{ sizeBB: 3, freq: 1 }],
},
```

Do not change any BW5 hand cells or global frequencies.

- [ ] **Step 5: Run focused tests to verify GREEN**

```bash
npx vitest run src/v3/benchmarks/blindWar.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/v3/benchmarks/types.ts src/v3/benchmarks/blindWar.ts src/v3/benchmarks/blindWar.test.ts
git commit -m "feat(v3): represent certified sizing distributions"
```

---

### Task 2: Bridge validation and transport of multi-sizing

**Files:**
- Modify: `src/v3/livePreflopBridge.ts`
- Test: `src/v3/livePreflopBridge.test.ts`

**Interfaces:**
- Consumes: `ActionSizingDistribution`, `HandSizingFreq` from Task 1.
- Produces: `LivePreflopV3Result.actionSizing`, `LivePreflopV3Result.handSizingMix`.

- [ ] **Step 1: Write failing bridge tests**

Add these tests to `src/v3/livePreflopBridge.test.ts`:

```ts
it("transports multiple certified sizings without collapsing them", () => {
  const fixture: ExternalBenchmarkFixture = {
    ...handFixture,
    id: "TEST_MULTI_SIZING",
    actionSizing: {
      raise: [
        { sizeBB: 3.5, freq: 0.65 },
        { sizeBB: 7, freq: 0.35 },
      ],
    },
    handSizingFreq: {
      AKo: { raise: { 3.5: 1 } },
    },
  };

  const result = livePreflopFromFixtures([fixture], {
    node: fixture.node,
    context: fixture.context,
    priorActions: fixture.priorActions,
    handType: "AKo",
  });

  expect(result.actionSizing?.raise).toEqual([
    { sizeBB: 3.5, freq: 0.65 },
    { sizeBB: 7, freq: 0.35 },
  ]);
  expect(result.handSizingMix?.raise).toEqual({ 3.5: 1 });
});

it("rejects hand sizing outside the certified action sizing set", () => {
  const invalid: ExternalBenchmarkFixture = {
    ...handFixture,
    id: "TEST_INVALID_HAND_SIZE",
    actionSizing: { raise: [{ sizeBB: 3.5 }, { sizeBB: 7 }] },
    handSizingFreq: { AKo: { raise: { 5: 1 } } },
  };

  expect(() => livePreflopFromFixtures([invalid], {
    node: invalid.node,
    context: invalid.context,
    priorActions: invalid.priorActions,
    handType: "AKo",
  })).toThrow(/certified sizing set/i);
});

it("rejects hand sizing frequencies that do not sum to one", () => {
  const invalid: ExternalBenchmarkFixture = {
    ...handFixture,
    id: "TEST_INVALID_SIZE_MIX",
    actionSizing: { raise: [{ sizeBB: 3.5 }, { sizeBB: 7 }] },
    handSizingFreq: { AKo: { raise: { 3.5: 0.8, 7: 0.8 } } },
  };

  expect(() => livePreflopFromFixtures([invalid], {
    node: invalid.node,
    context: invalid.context,
    priorActions: invalid.priorActions,
    handType: "AKo",
  })).toThrow(/sizing frequencies/i);
});
```

- [ ] **Step 2: Run tests to verify RED**

```bash
npx vitest run src/v3/livePreflopBridge.test.ts
```

Expected: FAIL because the result cannot transport `actionSizing` / `handSizingMix` and no sizing validation exists.

- [ ] **Step 3: Implement bridge result fields**

Update imports and `LivePreflopV3Result`:

```ts
import type {
  ActionSizingDistribution,
  ExternalBenchmarkFixture,
  HandActionFreq,
  HandSizingFreq,
} from "./benchmarks/types";

export interface LivePreflopV3Result {
  source: "V3_CERTIFIED_HAND" | "FALLBACK_V2";
  benchmarkId?: string;
  semanticMix?: Partial<Record<V3SemanticPreflopAction, number>>;
  actionSizing?: ActionSizingDistribution;
  handSizingMix?: Partial<Record<V3SemanticPreflopAction, HandSizingFreq>>;
  evidence: EvidenceSource;
}
```

- [ ] **Step 4: Add validators**

Implement helpers with these semantics:

```ts
function validateActionSizing(distribution: ActionSizingDistribution): void {
  for (const [action, options] of Object.entries(distribution)) {
    if (!options?.length) throw new Error(`Invalid certified sizing set for ${action}.`);

    for (const option of options) {
      if (!Number.isFinite(option.sizeBB) || option.sizeBB <= 1) {
        throw new Error(`Invalid certified sizing set for ${action}.`);
      }
      if (option.freq !== undefined && (
        !Number.isFinite(option.freq) || option.freq < 0 || option.freq > 1
      )) {
        throw new Error(`Invalid certified sizing frequency for ${action}.`);
      }
    }

    const declared = options.filter((option) => option.freq !== undefined);
    if (declared.length === options.length) {
      const total = declared.reduce((sum, option) => sum + (option.freq ?? 0), 0);
      if (Math.abs(total - 1) > 1e-6) {
        throw new Error(`Certified sizing frequencies for ${action} must sum to 1.`);
      }
    }
  }
}

function validateHandSizing(
  fixture: ExternalBenchmarkFixture,
  handType: string,
): void {
  const handSizing = fixture.handSizingFreq?.[handType];
  if (!handSizing) return;

  for (const [action, mix] of Object.entries(handSizing)) {
    if (!mix) continue;
    const entries = Object.entries(mix);
    const total = entries.reduce((sum, [, freq]) => sum + freq, 0);
    if (
      entries.length === 0
      || entries.some(([, freq]) => !Number.isFinite(freq) || freq < 0 || freq > 1)
      || Math.abs(total - 1) > 1e-6
    ) {
      throw new Error(`Hand sizing frequencies for ${action} must sum to 1.`);
    }

    const certifiedSizes = new Set(
      (fixture.actionSizing?.[action as keyof ActionSizingDistribution] ?? [])
        .map((option) => option.sizeBB),
    );
    if (entries.some(([size]) => !certifiedSizes.has(Number(size)))) {
      throw new Error(`Hand sizing must belong to the certified sizing set for ${action}.`);
    }
  }
}
```

Before returning a certified result, call `validateActionSizing` when `fixture.actionSizing` exists and `validateHandSizing(fixture, query.handType)`.

- [ ] **Step 5: Transport exact data**

Return:

```ts
actionSizing: fixture.actionSizing
  ? Object.fromEntries(Object.entries(fixture.actionSizing).map(([action, options]) => [
      action,
      options?.map((option) => ({ ...option })),
    ])) as ActionSizingDistribution
  : undefined,
handSizingMix: fixture.handSizingFreq?.[query.handType]
  ? structuredClone(fixture.handSizingFreq[query.handType])
  : undefined,
```

If project compatibility makes `structuredClone` undesirable, replace only this line with explicit object copies; do not share fixture object references.

- [ ] **Step 6: Run bridge tests**

```bash
npx vitest run src/v3/livePreflopBridge.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/v3/livePreflopBridge.ts src/v3/livePreflopBridge.test.ts
git commit -m "feat(v3): validate and carry certified multi-sizing"
```

---

### Task 3: Deterministic live adapter gate

**Files:**
- Modify: `src/ranges/preflopV3Adapter.ts`
- Test: `src/ranges/preflopV3Wiring.test.ts`

**Interfaces:**
- Consumes: `LivePreflopV3Result.actionSizing`, `LivePreflopV3Result.handSizingMix`.
- Preserves: `mapCertifiedV3PreflopDecision(...) -> V3AwarePreflopDecision | null`.

- [ ] **Step 1: Write failing adapter tests**

Add to `src/ranges/preflopV3Wiring.test.ts`:

```ts
it("pure raise with one certified sizing maps live", () => {
  const result: LivePreflopV3Result = {
    source: "V3_CERTIFIED_HAND",
    benchmarkId: "TEST_SINGLE_SIZE",
    evidence: { level: "CERTIFIED", solver: "GTO_WIZARD" },
    semanticMix: { raise: 1 },
    actionSizing: { raise: [{ sizeBB: 3 }] },
  };

  expect(mapCertifiedV3PreflopDecision("A5s", result, 40)?.sizeBB).toBe(3);
});

it("pure raise with multiple certified sizings but no hand sizing stays fallback", () => {
  const result: LivePreflopV3Result = {
    source: "V3_CERTIFIED_HAND",
    benchmarkId: "TEST_AMBIGUOUS_SIZE",
    evidence: { level: "CERTIFIED", solver: "GTO_WIZARD" },
    semanticMix: { raise: 1 },
    actionSizing: { raise: [{ sizeBB: 3.5 }, { sizeBB: 7 }] },
  };

  expect(mapCertifiedV3PreflopDecision("A5s", result, 40)).toBeNull();
});

it("pure raise with a pure hand-level sizing maps that exact size", () => {
  const result: LivePreflopV3Result = {
    source: "V3_CERTIFIED_HAND",
    benchmarkId: "TEST_HAND_SIZE",
    evidence: { level: "CERTIFIED", solver: "GTO_WIZARD" },
    semanticMix: { raise: 1 },
    actionSizing: { raise: [{ sizeBB: 3.5 }, { sizeBB: 7 }] },
    handSizingMix: { raise: { 3.5: 0, 7: 1 } },
  };

  expect(mapCertifiedV3PreflopDecision("A5s", result, 40)?.sizeBB).toBe(7);
});

it("mixed hand-level sizing remains shadow-only", () => {
  const result: LivePreflopV3Result = {
    source: "V3_CERTIFIED_HAND",
    benchmarkId: "TEST_MIXED_HAND_SIZE",
    evidence: { level: "CERTIFIED", solver: "GTO_WIZARD" },
    semanticMix: { raise: 1 },
    actionSizing: { raise: [{ sizeBB: 3.5 }, { sizeBB: 7 }] },
    handSizingMix: { raise: { 3.5: 0.4, 7: 0.6 } },
  };

  expect(mapCertifiedV3PreflopDecision("A5s", result, 40)).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify RED**

```bash
npx vitest run src/ranges/preflopV3Wiring.test.ts
```

Expected: FAIL because adapter still reads `actionSizeBB`.

- [ ] **Step 3: Implement deterministic sizing resolver**

Add helper:

```ts
function certifiedPureRaiseSize(result: LivePreflopV3Result): number | null {
  const options = result.actionSizing?.raise ?? [];
  if (options.length === 1) {
    const size = options[0]?.sizeBB;
    return Number.isFinite(size) && (size ?? 0) > 1 ? size as number : null;
  }

  if (options.length > 1) {
    const mix = result.handSizingMix?.raise;
    if (!mix) return null;
    const positive = Object.entries(mix)
      .filter(([, freq]) => Number.isFinite(freq) && freq > 0);
    if (positive.length !== 1 || positive[0][1] < 0.999999) return null;
    const size = Number(positive[0][0]);
    return Number.isFinite(size) && size > 1 ? size : null;
  }

  return null;
}
```

Replace the current `result.actionSizeBB?.raise` branch with:

```ts
if (semantic === "raise") {
  const sizeBB = certifiedPureRaiseSize(result);
  if (sizeBB === null) return null;
  return { ...common, action: "raise", sizeBB };
}
```

- [ ] **Step 4: Run adapter tests**

```bash
npx vitest run src/ranges/preflopV3Wiring.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ranges/preflopV3Adapter.ts src/ranges/preflopV3Wiring.test.ts
git commit -m "feat(v3): gate live raises on certified sizing precision"
```

---

### Task 4: BW5 regression gate and full verification

**Files:**
- Modify if needed: `src/v3/externalValidation.test.ts`
- Verify: all V3 tests and full repository suite

**Interfaces:**
- Consumes final contract from Tasks 1–3.
- Produces promotion evidence that BW5 behavior is unchanged and ambiguous multi-sizing remains shadow-only.

- [ ] **Step 1: Add/adjust BW5 regression assertions**

Ensure `src/v3/externalValidation.test.ts` still proves all 11 current pure cells cross the exact live hand gate and add a sizing assertion for T3s:

```ts
it("BW5 T3s keeps certified 3bb sizing after multi-sizing migration", () => {
  const bw5 = BLIND_WAR_BENCHMARKS[4];
  const live = livePreflopV3({
    node: bw5.node,
    context: bw5.context,
    priorActions: bw5.priorActions,
    handType: "T3s",
  });

  expect(live.source).toBe("V3_CERTIFIED_HAND");
  expect(live.actionSizing?.raise).toEqual([{ sizeBB: 3, freq: 1 }]);
});
```

Keep existing assertions for:
- `T3s -> raise`;
- `A4s/A3s/A2s/K4s/K3s/Q4s -> limp`;
- `72o/62o/52o/42o -> fold`;
- uncertified `AKo -> FALLBACK_V2`;
- nearby context -> fallback.

- [ ] **Step 2: Run focused V3 verification**

```bash
npx vitest run src/v3/benchmarks/blindWar.test.ts src/v3/livePreflopBridge.test.ts src/ranges/preflopV3Wiring.test.ts src/v3/externalValidation.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run historical regression suite**

```bash
npm test
```

Expected: all non-skipped tests PASS, including SELO GTO 61/61 and existing engine regressions.

- [ ] **Step 4: Run build**

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit final regression gate if file changed**

```bash
git add src/v3/externalValidation.test.ts
git commit -m "test(v3): lock BW5 behavior after multi-sizing migration"
```

- [ ] **Step 6: Confirm GitHub Actions PR gate**

Verify the `Validar Pull Request` workflow for the final head commit:
- `npm install` success;
- `npm test` success;
- `npm run build` success.

Do not merge PR #40. Keep it draft until the broader Motor V3 promotion decision.
