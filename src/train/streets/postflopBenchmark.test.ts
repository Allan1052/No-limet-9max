// ---------------------------------------------------------------------------
// A trava do pós-flop. Ver postflopBenchmark.ts para o critério de curadoria:
// só o indiscutível entra. Qualquer falha aqui é bug do motor, não fronteira.
// ---------------------------------------------------------------------------
import { describe, it, expect } from "vitest";
import { POSTFLOP_SPOTS, runPostflopBenchmark } from "./postflopBenchmark";

describe("TRAVA DO PÓS-FLOP — o motor não pode errar o óbvio", () => {
  const r = runPostflopBenchmark();

  it(`acerta os ${POSTFLOP_SPOTS.length} spots indiscutíveis`, () => {
    // eslint-disable-next-line no-console
    console.log(
      `\n[TRAVA PÓS-FLOP] ${r.matched}/${r.total} = ${Math.round(r.score * 100)}% · ` +
        `${r.texturas.length} boards · ruas: ${r.ruas.join("/")}`,
    );
    if (r.misses.length) {
      // eslint-disable-next-line no-console
      for (const m of r.misses) {
        // eslint-disable-next-line no-console
        console.log(`   ✗ ${m.note}: esperado ${m.expect}, motor deu "${m.got}" (equity ${m.equity})`);
      }
    }
    expect(r.misses).toEqual([]);
  });

  it("cobre as quatro famílias, com pelo menos 8 spots cada", () => {
    for (const [cat, v] of Object.entries(r.porCategoria)) {
      expect(v.total, `categoria ${cat}`).toBeGreaterThanOrEqual(8);
      expect(v.matched, `categoria ${cat}`).toBe(v.total);
    }
    expect(Object.keys(r.porCategoria).sort()).toEqual([
      "lixo_vs_aposta",
      "monstro_sem_aposta",
      "monstro_vs_aposta",
      "nada_sem_aposta",
    ]);
  });

  it("cobre mais de um board e as três ruas (era só o A-8-6 no flop)", () => {
    expect(r.texturas.length).toBeGreaterThanOrEqual(6);
    expect(r.ruas.sort()).toEqual(["flop", "river", "turn"]);
  });

  it("é determinístico: mesma semente, mesmo resultado", () => {
    const a = runPostflopBenchmark(POSTFLOP_SPOTS, 777);
    const b = runPostflopBenchmark(POSTFLOP_SPOTS, 777);
    expect(a.matched).toBe(b.matched);
    expect(a.misses).toEqual(b.misses);
  });

  it("o veredito não depende da semente sorteada (spots são folgados)", () => {
    for (const seed of [1, 12345, 98765]) {
      expect(runPostflopBenchmark(POSTFLOP_SPOTS, seed).misses).toEqual([]);
    }
  });
});
