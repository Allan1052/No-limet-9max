import { describe, expect, it } from "vitest";
import css from "./coachV2Hint.css?raw";
import tableSource from "./Table.tsx?raw";

describe("Coach V2 — dica legível no celular", () => {
  it("carrega o acabamento isolado na mesa", () => {
    expect(tableSource).toContain('import "./coachV2Hint.css"');
  });

  it("permite múltiplas linhas sem manter formato de pílula", () => {
    expect(css).toContain("white-space: normal");
    expect(css).toContain("overflow-wrap: anywhere");
    expect(css).toContain("line-height: 1.35");
    expect(css).toContain("border-radius: 12px");
  });

  it("limita a dica à largura útil da mesa", () => {
    expect(css).toContain("max-width: min(520px, 92vw)");
  });
});
