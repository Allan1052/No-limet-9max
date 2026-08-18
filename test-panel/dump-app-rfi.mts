// Dump dos ranges RFI reais do app por posição (com bônus especulativo quando aplica)
// Rodar com: npx tsx test-panel/dump-app-rfi.mts
import { rfiRange, RFI_BASE_PERCENT } from "../src/ranges/charts/rfi";
import { handStrengthTable } from "../src/ranges/handStrength";
import { comboCount, handTypeCombos, handTypeRanks, isPair, isSuited } from "../src/ranges/types";

const RANKS = "23456789TJQKA";
function rankLabel(r: number): string { return RANKS[r - 2] ?? String(r); }

const POSITIONS = ["UTG", "UTG1", "MP", "LJ", "HJ", "CO", "BTN", "SB"] as const;

// Classifica uma hand type numa família
function family(ht: string): "Pares" | "Ax" | "Kx" | "Qx" | "Jx" | "Tx" | "SC" | "Outros" {
  if (isPair(ht)) return "Pares";
  if (ht.startsWith("A")) return "Ax";
  if (ht.startsWith("K")) return "Kx";
  if (ht.startsWith("Q")) return "Qx";
  if (ht.startsWith("J")) return "Jx";
  if (ht.startsWith("T")) return "Tx";
  if (isSuited(ht)) {
    const [r1, r2] = handTypeRanks(ht);
    if (r1 - r2 <= 2 && r2 >= 2) return "SC";
  }
  return "Outros";
}

const out: Record<string, any> = {};
for (const pos of POSITIONS) {
  const range = rfiRange(pos);
  let combos = 0;
  let byFam: Record<string, number> = {};
  let hands: string[] = [];
  for (const [ht, f] of Object.entries(range)) {
    const c = comboCount(ht) * f;
    combos += c;
    const fam = family(ht);
    byFam[fam] = (byFam[fam] ?? 0) + c;
    if (f >= 0.5) hands.push(ht);
  }
  out[pos] = {
    basePct: RFI_BASE_PERCENT[pos] * 100,
    realPct: (combos / 1326) * 100,
    famsPct: Object.fromEntries(
      Object.entries(byFam).map(([k, v]) => [k, (v / 1326) * 100])
    ),
    handsIn: hands.sort().join(" "),
  };
}
console.log(JSON.stringify(out, null, 1));
