import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const table = readFileSync("src/ui/Table.tsx", "utf8");
const css = readFileSync("src/ui/tableModern.css", "utf8");

describe("Etapa 2 - mesa visual moderna", () => {
  test("aplica a camada visual moderna sem alterar a lógica da mesa", () => {
    expect(table).toContain('import "./tableModern.css"');
    expect(table).toContain('className={`table-wrap table-modern');
    expect(table).toContain('className="table-brand-mark"');
    expect(table).toContain('className="table-surface-glow"');
  });

  test("compacta os assentos no celular vertical para evitar sobreposição", () => {
    expect(css).toContain("@media (max-width: 640px)");
    expect(css).toContain(".table-modern .seat:not(.hero)");
    expect(css).toContain("width: 104px");
    expect(css).toContain(".table-modern .seat.hero");
    expect(css).toContain("width: 118px");
    expect(css).toContain("transform: scale(.92)");
  });

  test("mantém tratamento específico para celular horizontal", () => {
    expect(css).toContain("@media (orientation: landscape)");
    expect(css).toContain("max-height: 520px");
    expect(css).toContain("transform: scale(.82)");
  });

  test("preserva os nove assentos e o fluxo existente", () => {
    expect(table).toContain("const SEAT_POS");
    expect(table).toContain("table.players.map((p) =>");
    expect(table).toContain("<Board");
    expect(table).toContain("<ChipStack");
  });
});
