import { describe, it, expect } from "vitest";
import { fieldWeights, buildFieldSeats } from "./field";
import { profileById } from "./profiles";

function seeded(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

const FISH = new Set(["recreativo", "station", "spewy"]);
const REG = new Set(["tag", "lag", "nit", "abc"]);

describe("composição do campo por buy-in", () => {
  it("pesos: micro favorece peixe, alto favorece regular", () => {
    const micro = fieldWeights(5);
    const high = fieldWeights(109);
    expect(micro.recreativo).toBeGreaterThan(micro.tag); // peixe > reg no micro
    expect(high.tag).toBeGreaterThan(high.recreativo); // reg > peixe no alto
    expect(high.recreativo).toBeLessThan(micro.recreativo); // menos peixe conforme sobe
  });

  it("cada mesa tem apelidos distintos (sem nome repetido)", () => {
    const seats = buildFieldSeats(5, 8, seeded(7));
    expect(seats.length).toBe(8);
    const names = seats.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
    // todo profileId é um perfil válido
    for (const s of seats) expect(() => profileById(s.profileId)).not.toThrow();
  });

  it("comportamento: mesa de $5 tem MAIS peixe que a de $109 (média de muitas mesas)", () => {
    const rng = seeded(42);
    const countFish = (buyIn: number) => {
      let fish = 0;
      const TABLES = 400;
      for (let i = 0; i < TABLES; i++) {
        for (const s of buildFieldSeats(buyIn, 8, rng)) if (FISH.has(s.profileId)) fish++;
      }
      return fish / TABLES;
    };
    const microFish = countFish(5);
    const highFish = countFish(109);
    expect(microFish).toBeGreaterThan(highFish + 1.5); // diferença nítida (~1.5+ peixes por mesa)
  });

  it("comportamento: mesa de $109 tem MAIS regular que a de $5", () => {
    const rng = seeded(99);
    const countReg = (buyIn: number) => {
      let reg = 0;
      const TABLES = 400;
      for (let i = 0; i < TABLES; i++) {
        for (const s of buildFieldSeats(buyIn, 8, rng)) if (REG.has(s.profileId)) reg++;
      }
      return reg / TABLES;
    };
    expect(countReg(109)).toBeGreaterThan(countReg(5) + 1.5);
  });

  it("ELITE ($10.300): campo é quase só tubarão — o peixe some", () => {
    const high = fieldWeights(109);
    const elite = fieldWeights(10300);
    const fishHigh = FISH_ARR.reduce((s, a) => s + high[a], 0);
    const fishElite = FISH_ARR.reduce((s, a) => s + elite[a], 0);
    expect(fishElite).toBeLessThan(fishHigh * 0.25); // peixe cai muito na elite
    // e os regs concentram o campo
    expect(elite.tag).toBeGreaterThan(high.tag);
  });
});

const FISH_ARR = ["recreativo", "station", "spewy"] as const;
