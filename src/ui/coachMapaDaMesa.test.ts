import { describe, expect, it } from "vitest";
import { construirCamadas, type FonteCamadas } from "./coachCamadas";
import type { MapaDaMesa } from "../bots/mapaDaMesa";

const mapa = (p: Partial<MapaDaMesa>): MapaDaMesa => ({
  heroBB: 31, cobre: 5, cobertoPor: 1, menorBB: 7, shorts: 1,
  aindaFalam: 0, vivos: 7, maiorDaMesa: false, menorDaMesa: false, ...p,
});

describe("as frases do mapa da mesa", () => {
  it("diz quem o herói cobre e quem cobre ele", () => {
    const v = construirCamadas({ mapa: mapa({}) } as FonteCamadas, "simple");
    expect(v.mapaDaMesa).toBe("Você cobre 5 jogadores, mas existe 1 jogador que cobre você.");
  });

  it("maior da mesa: fala que ele cobre todo mundo", () => {
    const v = construirCamadas({ mapa: mapa({ cobre: 6, cobertoPor: 0 }) } as FonteCamadas, "simple");
    expect(v.mapaDaMesa).toContain("maior da mesa");
    expect(v.mapaDaMesa).toContain("cobre os 6");
  });

  it("menor da mesa: fala que todo mundo cobre ele", () => {
    const v = construirCamadas({ mapa: mapa({ cobre: 0, cobertoPor: 6 }) } as FonteCamadas, "simple");
    expect(v.mapaDaMesa).toContain("você é o menor");
  });

  it("aponta o short crítico que está na mesa", () => {
    const v = construirCamadas({ mapa: mapa({ shorts: 1, menorBB: 7 }) } as FonteCamadas, "simple");
    expect(v.pressaoDaMesa).toBe("Tem um stack de 7bb nesta mesa lutando para sobreviver.");
  });

  it("plural quando há mais de um short", () => {
    const v = construirCamadas({ mapa: mapa({ shorts: 3, menorBB: 5 }) } as FonteCamadas, "simple");
    expect(v.pressaoDaMesa).toBe("Tem 3 stacks curtos nesta mesa — o menor com 5bb.");
  });

  it("modo técnico traz os números crus", () => {
    const v = construirCamadas({ mapa: mapa({}) } as FonteCamadas, "technical");
    expect(v.mapaDaMesa).toBe("Mesa: 31bb · cobre 5, coberto por 1 de 6.");
    expect(v.pressaoDaMesa).toBe("1 stack(s) ≤ 10bb na mesa; menor: 7bb.");
  });
});

describe("a trava continua valendo", () => {
  it("sem mapa, nenhuma das duas frases nasce", () => {
    const v = construirCamadas({} as FonteCamadas, "simple");
    expect(v.mapaDaMesa).toBeUndefined();
    expect(v.pressaoDaMesa).toBeUndefined();
  });

  it("sem short na mesa, não inventa pressão", () => {
    const v = construirCamadas({ mapa: mapa({ shorts: 0 }) } as FonteCamadas, "simple");
    expect(v.pressaoDaMesa).toBeUndefined();
  });

  it("heads-up sem diferença de stack não gera frase de cobertura", () => {
    const v = construirCamadas({ mapa: mapa({ cobre: 0, cobertoPor: 0 }) } as FonteCamadas, "simple");
    expect(v.mapaDaMesa).toBeUndefined();
  });

  it("NUNCA afirma que o short mudou a decisão — isso é do icmDelta", () => {
    const v = construirCamadas({ mapa: mapa({ shorts: 2, menorBB: 5 }) } as FonteCamadas, "simple");
    const txt = `${v.mapaDaMesa ?? ""} ${v.pressaoDaMesa ?? ""}`.toLowerCase();
    for (const proibido of ["por isso", "fez você", "mudou sua", "obriga", "por causa"]) {
      expect(txt).not.toContain(proibido);
    }
  });
});
