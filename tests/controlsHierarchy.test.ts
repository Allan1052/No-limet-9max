import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const controls = readFileSync("src/ui/Controls.tsx", "utf8");
const css = readFileSync("src/ui/controlsHierarchy.css", "utf8");

describe("Etapa 2 - hierarquia dos controles", () => {
  test("mantem apenas acoes principais e controle compacto de raise", () => {
    expect(controls).toContain('import "./controlsHierarchy.css"');
    expect(controls).toContain('className="action-panel"');
    expect(controls).toContain('action-choice-fold');
    expect(controls).toContain('action-choice-call');
    expect(controls).toContain('action-choice-raise');
    expect(controls).toContain('className="raise-control-panel"');
    expect(controls).toContain('unit-toggle-secondary');
    expect(controls).not.toContain('className="sizing-panel"');
    expect(controls).not.toContain("TAMANHOS DE APOSTA");
  });

  test("preserva all-in no limite do slider sem botao dedicado", () => {
    expect(controls).toContain('raiseTo >= legal.maxRaiseTo ? { type: "allin" } : { type: "raise", to: raiseTo }');
    expect(controls).not.toMatch(/>\s*ALL[- ]?IN\s*</i);
  });

  test("reduz os botoes principais no celular sem perder area de toque", () => {
    expect(css).toContain(".action-choice");
    expect(css).toContain("min-height: 48px");
    expect(css).toContain("@media (max-width: 640px)");
    expect(css).toContain("@media (orientation: landscape)");
  });
});
