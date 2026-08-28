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

  test("dimensiona a mesa pelo viewport no celular em vez de forçar altura fixa", () => {
    expect(css).toContain("height: clamp(360px, calc(100dvh - 265px), 535px)");
    expect(css).toContain("min-height: 0");
    expect(css).toContain(".app.nav-hidden .play");
  });

  test("mantém os assentos dentro da área visual para não cobrir a classificação", () => {
    expect(table).toContain('{ top: "86%", left: "50%" }');
    expect(table).toContain('{ top: "13%", left: "37%" }');
    expect(table).toContain('{ top: "13%", left: "63%" }');
    expect(css).toContain("width: 98px");
    expect(css).toContain("width: 112px");
  });

  test("comprime cabeçalho e faixa de status no celular para liberar altura útil", () => {
    expect(css).toContain(".app.nav-hidden .topbar");
    expect(css).toContain("padding-bottom: 4px");
    expect(css).toContain("margin-bottom: 4px");
    expect(css).toContain(".app.nav-hidden .hub-subnav");
    expect(css).toContain("margin-bottom: 0");
    expect(css).toContain(".app.nav-hidden .play .controls");
    expect(css).toContain("margin-top: 2px");
  });

  test("usa verde mais vivo com brilho moderado na mesa aprovada", () => {
    expect(css).toContain("rgba(48,126,88,.98)");
    expect(css).toContain("rgba(22,82,55,.99)");
    expect(css).toContain("rgba(116,211,157,.16)");
  });

  test("mantém tratamento específico para celular horizontal", () => {
    expect(css).toContain("@media (orientation: landscape)");
    expect(css).toContain("max-height: 520px");
    expect(css).toContain("height: clamp(260px, calc(100dvh - 170px), 340px)");
  });

  test("preserva os nove assentos e o fluxo existente", () => {
    expect(table).toContain("const SEAT_POS");
    expect(table).toContain("table.players.map((p) =>");
    expect(table).toContain("<Board");
    expect(table).toContain("<ChipStack");
  });
});
