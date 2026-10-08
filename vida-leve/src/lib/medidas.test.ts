import { describe, expect, it } from "vitest";
import { frasePrincipal } from "./cardCompartilhar";
import { classificarRCE, relacaoCinturaAltura } from "./medidas";

describe("cintura/altura", () => {
  it("calcula e classifica", () => {
    expect(relacaoCinturaAltura(85, 170)).toBe(0.5);
    expect(classificarRCE(0.45).rotulo).toMatch(/alvo/);
    expect(classificarRCE(0.55).rotulo).toMatch(/Atenção/);
    expect(classificarRCE(0.65).rotulo).toMatch(/Risco/);
  });
});

describe("frase do card", () => {
  const base = { nome: "Ana", semanas: 6, sequenciaMissoes: 4, conquistas: 3, emojisConquistas: [] };
  it("mostra quilos quando a pessoa permite e perdeu", () => {
    expect(frasePrincipal({ ...base, kgPerdidos: 3.2 })).toEqual({ grande: "−3,2 kg", pequena: "em 6 semanas" });
  });
  it("sem quilos (privado ou sem perda) → mostra a constância", () => {
    expect(frasePrincipal({ ...base, kgPerdidos: null }).grande).toBe("4 dias");
    expect(frasePrincipal({ ...base, kgPerdidos: 0.1, sequenciaMissoes: 0 }).grande).toBe("3 conquistas");
  });
});
