# Motor V3 — Blind War Promotion Review

Date: 2026-09-04
Branch: `docs/motor-v3-design`
Base: `main` at `7540a6fe3b6f7ce577625eda72f100c04ae1998d`

## Decision

**PROMOTED TO NEXT IMPLEMENTATION PLAN.**

This decision authorizes planning of controlled production wiring for the certified Blind War V3 slice. It does **not** merge V3 into production and does **not** authorize extrapolation beyond exact certified contexts.

## Promotion gates

All required gates from `docs/superpowers/plans/2026-09-04-motor-v3-range-state.md` passed:

- BW1-BW5 exist as typed certified GTO Wizard fixtures.
- Exact-match resolver reproduces the certified global action frequencies.
- PKO and Vanilla remain strategically distinct at the same 20bb effective stack.
- Coverage inversion changes the BB iso frequency in the certified direction.
- The Vanilla high-ICM 40bb node preserves the limp-heavy strategy.
- A nearby unmatched 25bb context returns `FALLBACK_V2`; it is not falsely labeled `CERTIFIED`.
- `PlayerRangeState` filters a prior range by action weights rather than rebuilding a top-X range.
- Historical regression suite remains passing.
- Production build remains passing.

## CI evidence

The isolated foundation was tested incrementally through PR #40. After the promotion-gate test was added, GitHub Actions `Validar Pull Request` completed successfully with both:

- `npm test`
- `npm run build`

Task 4 was also validated independently before the promotion gate, with the Blind War resolver tests, full historical suite, and build all passing.

## Isolation review

Comparison of `main...docs/motor-v3-design` at promotion review showed only documentation and new `src/v3/**` files.

No V2 production files were modified in:

- `src/bots/**`
- `src/ranges/**`
- `src/game/**`
- `src/engine/**`
- `src/sim/**`

Therefore the existing Call ou Fold production motor remains unchanged and available as fallback.

## Certification boundary

Promotion currently means only that the isolated V3 foundation is trustworthy enough to begin controlled wiring.

`CERTIFIED` remains restricted to exact benchmark contexts in the first slice. No nearest-neighbor lookup, stack bucketing, interpolation, or extrapolation is certified.

Hand-level composition is not fabricated where the audited source exposed only global frequencies. Composition expansion must use visually certified combo-level evidence.

## Next plan scope

The next implementation plan may:

1. add a production-safe feature boundary between V2 and V3;
2. route only exact certified Blind War nodes to V3;
3. preserve V2 fallback for every unmatched context;
4. add end-to-end tests proving the production decision path can express SB limp;
5. expand certified hand composition only where visual evidence supports it;
6. keep baseline GTO separate from exploit/personality logic.

The next plan must not broaden certification beyond the evidence already encoded.
