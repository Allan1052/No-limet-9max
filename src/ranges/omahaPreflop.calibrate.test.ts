import { describe, it } from "vitest";
import { omahaPreflopScore } from "./omahaPreflop";

// Calibração (não é asserção): imprime o score no "top X%" da distribuição de
// mãos de 4 cartas, para preencher PERCENTILE_TABLE em omahaPreflop.ts. Fica
// pulado por padrão (200k amostras, não-determinístico). Para recalibrar:
//   troque .skip por nada e rode:
//   npx vitest run src/ranges/omahaPreflop.calibrate.test.ts
describe.skip("calibração da distribuição de score PLO", () => {
  it("imprime percentis", () => {
    const N = 200_000;
    const scores: number[] = [];
    for (let i = 0; i < N; i++) {
      // sorteia 4 cartas distintas de 0..51
      const set = new Set<number>();
      while (set.size < 4) set.add(Math.floor(Math.random() * 52));
      scores.push(omahaPreflopScore([...set]));
    }
    scores.sort((a, b) => a - b);
    const fracs = [0.02, 0.05, 0.08, 0.12, 0.16, 0.2, 0.25, 0.3, 0.4, 0.5, 0.7, 1.0];
    const out: string[] = [];
    for (const f of fracs) {
      // score no topo f: quantil (1-f)
      const idx = Math.min(N - 1, Math.floor((1 - f) * N));
      out.push(`{ frac: ${f}, score: ${scores[idx].toFixed(1)} },`);
    }
    console.log("\n=== PERCENTILE_TABLE ===\n" + out.join("\n"));
    console.log(`min=${scores[0].toFixed(1)} max=${scores[N - 1].toFixed(1)} median=${scores[Math.floor(N / 2)].toFixed(1)}`);
  });
});
