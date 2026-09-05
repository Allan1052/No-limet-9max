# Motor V3 Tournament Stage Context Design

## Goal
Prevent certified solver fixtures from matching runtime spots from the wrong tournament stage by making tournament stage an explicit part of `TournamentContextV3` and of exact certified-context equality.

## Scope
This change affects only the Motor V3 validation/runtime bridge on the isolated `docs/motor-v3-design` branch. It does not modify Motor V2, UI, Instagram, funnel, copy, or production/main behavior.

## Problem
`TournamentContextV3` currently matches certified nodes using format, field remaining percentage, positions, stacks, effective stack, and coverage. That is not enough for some external references. The official GTO Wizard Big Blind blind-battle material includes final-table-specific ICM nodes whose strategy is stage-dependent. Registering those fixtures without an explicit stage discriminator could allow a certified final-table strategy to match a non-final-table runtime context with otherwise identical numeric fields.

## Design
Add a required `stage` field to `TournamentContextV3` with this closed vocabulary:

```ts
export type TournamentStageV3 =
  | "EARLY"
  | "MIDDLE"
  | "BUBBLE"
  | "IN_THE_MONEY"
  | "FINAL_TABLE";
```

`sameCertifiedContext()` must require exact equality of `stage`, preserving the existing no-interpolation policy. Existing certified Blind War fixtures must be annotated explicitly rather than relying on defaults.

For the existing fixtures:
- BW1-BW4 remain certified with their evidence-derived stage where known from the source. If the source only supports a broad post-ITM state and does not establish final-table status, use `IN_THE_MONEY` rather than inferring `FINAL_TABLE`.
- BW5 is tied to the official GTO Wizard 25%-field 40bb symmetric blind-battle example; encode the stage supported by that source and keep exact matching.

New final-table Big Blind fixtures may only be added with `stage: "FINAL_TABLE"` when the cited source explicitly establishes final-table context.

## Matching Invariant
A certified fixture must never override V2 unless all existing exact-match dimensions plus `stage` are equal. Same stacks/format/coverage with a different stage must return `FALLBACK_V2`.

## Compatibility
This is intentionally a V3 contract migration. TypeScript compile failures at V3 context construction sites are desirable because they expose contexts that must be classified explicitly. No implicit default is allowed.

## Testing
Add tests that prove:
1. two otherwise-identical contexts with different stages do not match;
2. identical contexts including stage do match;
3. all existing Blind War fixtures declare a stage;
4. a certified hand-level fixture does not override a neighboring runtime context with a different stage;
5. historical V2 tests and full build remain green.

## Evidence Policy
Tournament stage is evidence, not an inference convenience. When a solver source does not establish final-table status, do not label it `FINAL_TABLE` merely because ICM pressure is high. The existing hierarchy remains: CERTIFIED solver evidence overrides V2 only for exact comparable context.

## Non-goals
- No redesign of the app-wide tournament stage model.
- No V2 migration.
- No interpolation between stages.
- No automatic promotion of Big Blind hand cells from qualitative article text.
- No UI or product changes.
- No merge to `main` as part of this task.
