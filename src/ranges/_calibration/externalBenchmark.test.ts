import { describe, expect, it } from "vitest";
import { runExternalBenchmark, EXTERNAL_SPOTS } from "./externalBenchmark";

// ---------------------------------------------------------------------------
// Divergências CONHECIDAS e ACEITAS do motor vs a referência independente.
// O benchmark existe pra ser HONESTO: aqui ficariam, à vista, os spots em que o
// motor ainda aproxima. Hoje está VAZIO — o motor bate com a referência em
// todos os spots do banco (a divergência do T9s na defesa de BB foi corrigida).
// Uma divergência NOVA (fora desta lista) quebra o teste: é sinal de regressão
// ou de leak a investigar; aí a gente conserta ou documenta aqui, à vista.
// ---------------------------------------------------------------------------
const KNOWN_DIVERGENCES = new Set<string>([]);

const keyOf = (m: { hand: string; pos: string; effBB: number }) => `${m.hand}|${m.pos}|${m.effBB}`;

describe("BENCHMARK EXTERNO — motor vs referência independente (transparência)", () => {
  const r = runExternalBenchmark();

  it("cobre uma grade ampla de push/fold (>= 180 spots)", () => {
    expect(EXTERNAL_SPOTS.length).toBeGreaterThanOrEqual(180);
    expect(r.total).toBe(EXTERNAL_SPOTS.length);
  });

  it("nível EXATO (decisões universais) bate 100% — guarda de regressão dura", () => {
    expect(r.byTier.exato.score).toBe(1);
  });

  it("as ÚNICAS divergências são as conhecidas/documentadas", () => {
    const unexpected = r.misses.filter((m) => !KNOWN_DIVERGENCES.has(keyOf(m)));
    if (unexpected.length > 0) {
      // Mensagem clara pra quem rodar: o que divergiu que não estava previsto.
      const lines = unexpected.map((m) => `${keyOf(m)} esperava=${m.expect} motor=${m.got} (${m.ref})`);
      throw new Error(`Divergência(s) nova(s) no benchmark externo:\n  ${lines.join("\n  ")}`);
    }
    // E cada divergência conhecida ainda deve existir (senão, foi corrigida →
    // atualizar a lista e comemorar).
    const missKeys = new Set(r.misses.map(keyOf));
    for (const known of KNOWN_DIVERGENCES) {
      expect(missKeys.has(known)).toBe(true);
    }
  });

  it("a concordância geral é alta e honesta (>= 95%)", () => {
    expect(r.score).toBeGreaterThanOrEqual(0.95);
  });
});
