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

  test("mantém a mesa legível em celular vertical e horizontal", () => {
    expect(css).toContain(".table-modern");
    expect(css).toContain(".table-surface-glow");
    expect(css).toContain("@media (max-width: 640px)");
    expect(css).toContain("@media (orientation: landscape)");
  });

  test("preserva os nove assentos e o fluxo existente", () => {
    expect(table).toContain("const SEAT_POS");
    expect(table).toContain("table.players.map((p) =>");
    expect(table).toContain("<Board");
    expect(table).toContain("<ChipStack");
  });
});
