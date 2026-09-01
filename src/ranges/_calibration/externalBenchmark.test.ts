import { describe, expect, it } from "vitest";
import { runExternalBenchmark, EXTERNAL_SPOTS } from "./externalBenchmark";

// ---------------------------------------------------------------------------
// Divergências CONHECIDAS e ACEITAS do motor vs a referência independente.
// O benchmark existe pra ser HONESTO: aqui ficam, à vista, os spots em que o
// motor ainda aproxima. Uma divergência NOVA quebra o teste até ser revisada e
// documentada aqui — sem alterar o motor nesta tarefa.
// ---------------------------------------------------------------------------
const KNOWN_DIVERGENCES = new Set<string>([]);

const keyOf = (m: { hand: string; pos: string; effBB: number }) => `${m.hand}|${m.pos}|${m.effBB}`;

describe("BENCHMARK EXTERNO — motor vs referência independente (transparência)", () => {
  const r = runExternalBenchmark();

  it("cobre uma grade ampla, incluindo stacks 25–45bb (>= 500 spots)", () => {
    expect(EXTERNAL_SPOTS.length).toBeGreaterThanOrEqual(500);
    expect(r.total).toBe(EXTERNAL_SPOTS.length);
    expect(EXTERNAL_SPOTS.some((s) => s.effBB >= 25 && s.effBB <= 45)).toBe(true);
  });

  it("cobre 3-bet, 4-bet, sensibilidade a sizing e ante", () => {
    expect(EXTERNAL_SPOTS.some((s) => s.opts?.threeBet && s.opts?.betLevelFaced === 2 && (s.opts?.openSizeBB ?? 0) >= 7)).toBe(true);
    expect(EXTERNAL_SPOTS.some((s) => s.opts?.threeBet && s.opts?.betLevelFaced === 3 && (s.opts?.openSizeBB ?? 0) >= 18)).toBe(true);
    expect(EXTERNAL_SPOTS.some((s) => s.opts?.openSizeBB === 2.2)).toBe(true);
    expect(EXTERNAL_SPOTS.some((s) => s.opts?.openSizeBB === 3)).toBe(true);
    expect(EXTERNAL_SPOTS.some((s) => s.opts?.anteBB === 1)).toBe(true);
  });

  it("nível EXATO (decisões universais) bate 100% — guarda de regressão dura", () => {
    expect(r.byTier.exato.score).toBe(1);
  });

  it("as ÚNICAS divergências são as conhecidas/documentadas", () => {
    const unexpected = r.misses.filter((m) => !KNOWN_DIVERGENCES.has(keyOf(m)));
    if (unexpected.length > 0) {
      const lines = unexpected.map((m) => `${keyOf(m)} esperava=${m.expect} motor=${m.got} (${m.ref})`);
      throw new Error(`Divergência(s) nova(s) no benchmark externo:\n  ${lines.join("\n  ")}`);
    }
    const missKeys = new Set(r.misses.map(keyOf));
    for (const known of KNOWN_DIVERGENCES) {
      expect(missKeys.has(known)).toBe(true);
    }
  });

  it("a concordância geral é alta e honesta (>= 95%)", () => {
    expect(r.score).toBeGreaterThanOrEqual(0.95);
  });
});
