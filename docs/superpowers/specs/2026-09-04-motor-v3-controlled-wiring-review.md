# Motor V3 — Controlled Blind War Wiring Review

Date: 2026-09-04
Branch: `docs/motor-v3-design`
Draft PR: #40

## Verdict

**PROMOTED TO HAND-COMPOSITION CERTIFICATION.**

The controlled Blind War wiring boundary is technically ready for certified hand-level cells to be added. It is **not** approval to infer or fill the 169-hand grid from global solver frequencies.

## Verification

- Full GitHub Actions validation passed on the controlled-wiring tree: `npm test` and `npm run build`.
- Historical V2 regression remains green, including the existing 61/61 calibration.
- BW1-BW5 certified global strategies are available through `preflopShadowV3`.
- Production BW1-BW5 fixtures currently contain no `handActionFreq`; therefore they cannot alter a specific live hand.
- `livePreflopV3` requires exact node, exact prior actions, exact tournament context, `CERTIFIED` evidence, and a validated hand-level mix.
- Nearby stacks are not interpolated: a 25bb query does not inherit a 20bb certified node.
- `PARTIAL` evidence cannot activate a live hand even when hand-level frequencies are present.
- Invalid hand-level mixes are rejected rather than normalized silently.
- Mixed certified strategies remain shadow-only in this delivery; only a pure action may cross the live adapter.
- Certified `limp` is semantically first-class while using the existing legal runtime mechanic `call` to 1 BB.
- Unsupported action/sizing branches fall back to V2 instead of guessing.
- Runtime effective stack must match the supplied certified V3 context before the adapter can consult V3.

## Scope / diff audit

Comparison `main...docs/motor-v3-design` shows the branch is ahead with only new V3 files, tests, adapter files and documentation. No existing production source file was modified.

No changes were made to:
- `src/game/**`
- `src/engine/**`
- `src/bots/decision.ts`
- `src/ranges/preflop.ts`
- `src/ranges/icm.ts`
- `src/ranges/facingAllin.ts`
- `src/bots/exploit.ts`
- `src/bots/adapt.ts`

The live boundary is isolated in `src/ranges/preflopV3Adapter.ts` rather than rewriting the large legacy `preflop.ts`. This preserves the same architecture and safety invariant while minimizing corruption/regression risk during the migration branch.

## What is certified now

The engine can certify and reproduce the **global node strategy** for BW1-BW5, including the important structural differences in SB limp/raise/shove/fold behavior across PKO, Vanilla, ICM and coverage contexts.

This does **not** mean the individual hand composition of those global buckets is certified yet.

## Activation rule

A current Call ou Fold hand remains V2 unless all required conditions are met:

1. exact comparable node/context;
2. evidence level is `CERTIFIED`;
3. the exact hand type has solver-certified `handActionFreq`;
4. the hand mix is structurally valid;
5. in the current delivery, the live action is pure;
6. the action can be represented without inventing missing sizing/tree information.

Failure of any condition results in `FALLBACK_V2`.

## Next required work

The next evidence task is **Blind War hand-composition certification**: visually extract solver-supported hand-level frequencies from GTO Wizard/HRC material and add only those observed cells to `handActionFreq`.

Do not infer the unobserved remainder of the 169-hand grid and label it certified. Global percentages remain calibration/shadow targets until sufficient hand-level anchors exist.

After hand-level extraction, each newly certified cell must pass the existing exact-context bridge and regression suite before it may affect live behavior.
