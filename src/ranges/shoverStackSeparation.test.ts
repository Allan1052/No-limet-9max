import { describe, expect, it } from "vitest";
import { shoverRangePct, facingAllinDecision } from "./facingAllin";
import { cardsFromString, seededRng } from "../engine/cards";

// Separação hero / vilão / efetivo (P1-1). A LARGURA do range de quem shova tem
// que vir do stack REAL do shover, não do efetivo. Um vilão de 40bb que dá
// all-in tem range mais apertado que um de 12bb — mesmo que o herói só arrisque
// o efetivo (o preço é do efetivo; a largura é da profundidade de quem shova).
describe("shoverRangePct — largura pela profundidade de QUEM SHOVA", () => {
  it("shove de stack curto (12bb) é MAIS LARGO que shove de stack fundo (40bb) na mesma posição", () => {
    const curto = shoverRangePct(1, 12, "BTN", 12);
    const fundo = shoverRangePct(1, 12, "BTN", 40); // efetivo 12, mas o shover tem 40bb
    expect(fundo).toBeLessThan(curto);
  });

  it("sem stack do shover informado, cai no efetivo (comportamento antigo preservado)", () => {
    const semInfo = shoverRangePct(1, 12, "BTN");
    const comEfetivo = shoverRangePct(1, 12, "BTN", 12);
    expect(semInfo).toBeCloseTo(comEfetivo, 6);
  });

  it("stack do shover só alarga abaixo de 16bb — 40bb e 25bb dão a mesma base (sem widen)", () => {
    const s40 = shoverRangePct(1, 12, "BTN", 40);
    const s25 = shoverRangePct(1, 12, "BTN", 25);
    expect(s40).toBeCloseTo(s25, 6);
  });
});

describe("facingAllinDecision — o stack do shover muda a decisão em mão marginal", () => {
  it("contra um shover FUNDO (40bb) o range é mais apertado e a equity da mesma mão cai vs o mesmo efetivo curto", () => {
    // Efetivo 13bb nos dois casos (MESMO preço). Só muda o stack de quem shova.
    const base = {
      hero: cardsFromString("Kd9c"), // mão marginal
      betLevelFaced: 1,
      numContesting: 1,
      contestablePotBB: 13.5,
      callBB: 12,
      effectiveBB: 13,
      raiserPosition: "BTN" as const,
      iterations: 6000,
    };
    const largo = facingAllinDecision({ ...base, shoverStackBB: 13, rng: seededRng(0x1234) });
    const apertado = facingAllinDecision({ ...base, shoverStackBB: 40, rng: seededRng(0x1234) });
    // Range mais apertado (shover fundo) → a mesma mão tem MENOS equity → o motor
    // nunca fica mais frouxo por causa de um shove que na verdade é mais forte.
    expect(apertado.villainRangePct).toBeLessThan(largo.villainRangePct);
    expect(apertado.heroEquity).toBeLessThanOrEqual(largo.heroEquity + 0.01);
  });
});
