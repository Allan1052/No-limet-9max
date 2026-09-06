# Big Blind Final-Table Evidence Candidates

## Purpose
Track solver-backed GTO Wizard Big Blind blind-battle nodes that are strong enough to guide Motor V3 architecture and future fixtures, while separating explicitly visible/cited solver facts from arithmetic or qualitative inference. Nothing in this file is eligible for live override until promoted into `src/v3/benchmarks` under the normal CERTIFIED evidence gate.

## Source
Official GTO Wizard article: **ICM and Blind Battles: The Big Blind**, Andrew Brokos, May 2, 2023.

Article URL: `https://blog.gtowizard.com/icm-and-blind-battles-the-big-blind/`

The article explicitly establishes that the discussed large-raise blind-battle examples are from a **9-handed final table**. It also links directly into GTO Wizard solutions with `gametype=MTTGeneral_ICM9m1000PTFT` for these nodes.

---

## Candidate BBFT1 — BB covers SB, BB vs SB limp

### Explicit solver-backed facts

- Stage: `FINAL_TABLE` (9-handed final table, explicitly stated by the official source)
- Format: Vanilla MTT / ICM solution family
- SB stack: 35bb
- BB stack: 40bb
- BB covers SB
- Prior action: SB limp
- BB raise to **7bb: 7%** of hands
- BB raise to **3.5bb: 28%** of hands
- The symmetric 35bb comparison uses 7bb with 5% and 3.5bb with 24%.
- Article states BB risk premium falls to 11.3% from 12.2% symmetric; SB risk premium becomes 13.1%.

### Evidence status

`CANDIDATE_NODE_PARTIAL`

The two raise-sizing frequencies are explicit, but the complete BB action distribution after the limp is not currently visible in retrievable evidence. The remaining frequency must **not** be filled as `check: 0.65` merely by arithmetic complement, because that would convert inference into purported solver output.

### Hand-composition status

No `handActionFreq` and no `handSizingFreq` may be added from this source yet.

The article says the 30bb large-raise range is driven by AKo, AQo and JJ-KK, while AA prefers the smaller size and QJo/98s mostly check and use 3.5bb when raising. These are valid structural observations, but they are not exact hand-level frequencies for BBFT1 and must not be encoded as pure cells.

### Promotion blocker

Need a visually auditable solver grid or other explicit solver output showing the complete node action distribution for the exact 35bb SB / 40bb BB configuration. Hand-level promotion additionally requires unequivocal cell frequencies for the same exact context.

---

## Candidate BBFT2 — symmetric 35bb, BB vs SB limp

### Explicit solver-backed facts

- Stage: `FINAL_TABLE`
- 9-handed final table
- Symmetric stacks: 35bb
- Prior action: SB limp
- BB raise to **7bb: 5%**
- BB raise to **3.5bb: 24%**
- Official source explicitly describes the 7bb raise as an available branch.

### Evidence status

`CANDIDATE_NODE_PARTIAL`

As with BBFT1, the complete residual action distribution is not explicit in currently retrievable evidence. Do not infer `check: 71%` as certified solver output.

---

## Candidate BBFT3 — SB covers BB, BB vs SB limp

### Explicit solver-backed facts

- Stage: `FINAL_TABLE`
- SB stack: 100bb
- BB stack: 35bb
- SB covers BB
- Prior action: SB limp
- BB never uses the 7bb raise
- BB has a shove range of about **4%**
- BB raises to **3.5bb with 29%**
- Article describes the combined raising frequency as about **34%**
- Shoving range relies heavily on blockers; A9o-AQo and A2o comprise the majority, according to the article.

### Evidence status

`CANDIDATE_NODE_PARTIAL`

The source provides several action-family frequencies, but not a fully retrievable exact distribution suitable for the strict `ExternalBenchmarkFixture.actionFreq` contract. The word “about” on the shove frequency also argues against a ±0.5% hard certified tolerance.

No hand-level frequencies are certified from the qualitative blocker description.

---

## Structural conclusions already safe for Motor V3

1. **Coverage identity changes sizing distribution**, not merely whether BB continues.
2. A single scalar raise size is insufficient for final-table blind battles; 3.5bb and 7bb can coexist at the same semantic `raise` action.
3. The 7bb branch is stack-depth dependent: it is strongest around 30bb, exists at 35bb, loses appeal deeper, and gives way to shoving at sufficiently shallow stacks.
4. Strong-but-vulnerable and robustly strong hands can prefer different raise sizes under ICM; absolute hand strength alone does not order sizing.
5. A final-table stage discriminator is necessary for exact certified matching; these strategies must not leak into non-final-table contexts.

## Promotion rule

Do not move BBFT1-BBFT3 into `BLIND_WAR_BENCHMARKS` as `CERTIFIED` until the complete exact node distribution is visible or otherwise explicitly solver-reported. Until then they are research calibration evidence only and must never drive live V3 hand decisions.
