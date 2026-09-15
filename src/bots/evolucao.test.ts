// ---------------------------------------------------------------------------
// AS COLEIRAS DA EVOLUÇÃO SEGURAM.
//
// A ideia do Allan (15/09/2026) foi: "cada bot usaria o outro pra evoluir,
// assim cada vez mais ficaria difícil". Funciona — mas auto-jogo solto tem
// quatro armadilhas conhecidas, e este arquivo é a prova de que as travas de
// cada uma continuam de pé. Ver o cabeçalho de evolucao.ts.
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import { seededRng } from "../engine/cards";
import { PROFILES, profileById } from "./profiles";
import {
  GENES, genomaDe, aplicarGenoma, coleira, mutar, cruzar, nota,
  tetoDeEvolucao, distancia, type Genoma,
} from "./evolucao";

const rng = seededRng(42);

describe("coleira nº 2 — a identidade do arquétipo sobrevive", () => {
  it("nenhum gene escapa da folga do arquétipo, por mais que mute", () => {
    for (const p of PROFILES) {
      const base = genomaDe(p);
      let g = base;
      // Cem gerações de mutação forte: o pior caso.
      for (let i = 0; i < 100; i++) g = coleira(mutar(g, 0.5, rng), base, p.archetype);
      for (const k of GENES) {
        const desvio = Math.abs(g[k] - base[k]) / (Math.abs(base[k]) || 1);
        expect(desvio, `${p.id}.${k} fugiu da coleira`).toBeLessThanOrEqual(0.55);
      }
    }
  });

  it("o 'Paga-Tudo' nunca vira um agressivo, nem depois de mil mutações", () => {
    const station = profileById("station");
    const lag = profileById("lag");
    const base = genomaDe(station);
    let g = base;
    for (let i = 0; i < 1000; i++) g = coleira(mutar(g, 0.6, rng), base, "station");
    const evoluido = aplicarGenoma(station, g);
    expect(evoluido.aggression).toBeLessThan(lag.aggression);
    expect(evoluido.stickiness).toBeGreaterThan(lag.stickiness);
    expect(evoluido.bluffFactor).toBeLessThan(lag.bluffFactor);
  });

  it("a 'Muralha' continua apertada", () => {
    const nit = profileById("nit");
    const base = genomaDe(nit);
    let g = base;
    for (let i = 0; i < 500; i++) g = coleira(mutar(g, 0.6, rng), base, "nit");
    expect(aplicarGenoma(nit, g).rfiWidth).toBeLessThan(profileById("lag").rfiWidth);
  });

  it("perfis de reg têm folga maior que os de peixe (é lá que a evolução mora)", () => {
    const folga = (arq: Parameters<typeof coleira>[2]) => {
      const p = PROFILES.find((x) => x.archetype === arq)!;
      const base = genomaDe(p);
      let g = base;
      for (let i = 0; i < 200; i++) g = coleira(mutar(g, 0.9, rng), base, arq);
      return distancia(g, base);
    };
    expect(folga("tag")).toBeGreaterThan(folga("station"));
    expect(folga("lag")).toBeGreaterThan(folga("recreativo"));
  });
});

describe("coleira nº 3 — o micro não fica difícil", () => {
  it("o teto de evolução sobe com o buy-in e é ZERO no micro", () => {
    expect(tetoDeEvolucao(5)).toBe(0);
    expect(tetoDeEvolucao(undefined)).toBe(0);
    expect(tetoDeEvolucao(11)).toBeGreaterThan(0);
    expect(tetoDeEvolucao(109)).toBeGreaterThan(tetoDeEvolucao(11));
    expect(tetoDeEvolucao(10300)).toBeGreaterThan(tetoDeEvolucao(1000));
    expect(tetoDeEvolucao(10300)).toBe(1);
  });

  it("com teto zero a mutação não sai do lugar", () => {
    const p = profileById("tag");
    const base = genomaDe(p);
    const forca = 0.14 * tetoDeEvolucao(5); // = 0
    const g = coleira(mutar(base, forca, rng), base, "tag");
    expect(distancia(g, base)).toBe(0);
  });
});

describe("coleira nº 1 — o juiz é o baseline, não a população", () => {
  it("quem só ganha dos primos mutantes perde para quem ganha do baseline", () => {
    const derivado = { arq: "tag" as const, genoma: {} as Genoma, contraPopulacao: 40, contraBaseline: -5 };
    const honesto = { arq: "tag" as const, genoma: {} as Genoma, contraPopulacao: 2, contraBaseline: 12 };
    expect(nota(honesto)).toBeGreaterThan(nota(derivado));
  });

  it("o resultado contra o baseline pesa três vezes mais", () => {
    const a = { arq: "tag" as const, genoma: {} as Genoma, contraPopulacao: 0, contraBaseline: 4 };
    const b = { arq: "tag" as const, genoma: {} as Genoma, contraPopulacao: 4, contraBaseline: 0 };
    expect(nota(a)).toBeCloseTo(3 * nota(b), 5);
  });
});

describe("mecânica do genoma", () => {
  it("o genoma vai e volta sem perder nada", () => {
    for (const p of PROFILES) {
      const voltou = aplicarGenoma(p, genomaDe(p));
      for (const k of GENES) expect(voltou[k]).toBe(p[k]);
      expect(voltou.id).toBe(p.id);
      expect(voltou.archetype).toBe(p.archetype);
    }
  });

  it("cruzar só combina genes dos pais — não inventa valor novo", () => {
    const a = genomaDe(profileById("tag"));
    const b = genomaDe(profileById("lag"));
    const f = cruzar(a, b, rng);
    for (const k of GENES) expect([a[k], b[k]]).toContain(f[k]);
  });

  it("nenhum gene sai dos trilhos absolutos, venha de onde vier", () => {
    const p = profileById("lag");
    const base = genomaDe(p);
    const absurdo = {} as Genoma;
    for (const k of GENES) absurdo[k] = 999;
    const g = coleira(absurdo, base, "lag");
    for (const k of GENES) {
      expect(g[k], `${k}`).toBeLessThan(10);
      expect(g[k], `${k}`).toBeGreaterThan(0);
    }
  });
});
