import { describe, expect, it } from "vitest";
import { MINIMO_PARA_LER, lerPlacarDeRoubo, placarDeRoubo } from "./treinoRoubo";

describe("placar de roubo (você × o motor, nas mesmas mãos)", () => {
  it("conta a frequência dos dois lados", () => {
    const p = placarDeRoubo(20, 6, 8);
    expect(p.pctVoce).toBe(30);
    expect(p.pctMotor).toBe(40);
    expect(p.diferenca).toBe(-10);
  });

  it("SEM AMOSTRA, SEM FRASE", () => {
    expect(lerPlacarDeRoubo(placarDeRoubo(MINIMO_PARA_LER - 1, 0, 5))).toBeUndefined();
    expect(lerPlacarDeRoubo(placarDeRoubo(MINIMO_PARA_LER, 0, 5))).toBeDefined();
  });

  it("acusa quem rouba de MENOS — o caso do Allan no HUD real", () => {
    const f = lerPlacarDeRoubo(placarDeRoubo(20, 5, 8))!;
    expect(f).toContain("roubando de MENOS");
    expect(f).toContain("25%");
    expect(f).toContain("40%");
  });

  it("acusa quem rouba DEMAIS", () => {
    expect(lerPlacarDeRoubo(placarDeRoubo(20, 16, 8))!).toContain("MAIS que o padrão");
  });

  it("diferença pequena é ruído, não tendência", () => {
    // 35% x 40% = 5 pontos: dentro do que um punhado de mãos explica sozinho.
    expect(lerPlacarDeRoubo(placarDeRoubo(20, 7, 8))!).toContain("Está no padrão");
  });

  it("a frase SEMPRE mostra os dois números (a régua tem de ficar à vista)", () => {
    for (const [seu, motor] of [[2, 9], [9, 2], [8, 8]]) {
      const f = lerPlacarDeRoubo(placarDeRoubo(20, seu, motor))!;
      expect(f).toContain(`${seu * 5}%`);
      expect(f).toContain(`${motor * 5}%`);
      expect(f).toContain("nestas mesmas mãos");
    }
  });

  it("zero respondidas não divide por zero", () => {
    const p = placarDeRoubo(0, 0, 0);
    expect(p.pctVoce).toBe(0);
    expect(p.pctMotor).toBe(0);
    expect(lerPlacarDeRoubo(p)).toBeUndefined();
  });
});
