import { describe, expect, it } from "vitest";
// @ts-ignore — disponível no ambiente Node/Vitest.
import { readFileSync } from "node:fs";

const tableCss = readFileSync(new URL("./tableRound4.css", import.meta.url), "utf8");
const controlsCss = readFileSync(new URL("./controlsHierarchy.css", import.meta.url), "utf8");

describe("Atualização 6 — correção do layout base da mesa", () => {
  it("trava a mesa mobile em proporção horizontal 4:3 e centraliza com margem", () => {
    expect(tableCss).toContain("aspect-ratio:4 / 3");
    expect(tableCss).toContain("max-width:95%");
    expect(tableCss).toContain("margin:0 auto");
    expect(tableCss).toContain("left:50%");
    expect(tableCss).toContain("transform:translate(-50%, -50%)");
  });

  it("mantém todos os pods dentro do feltro e uniformes", () => {
    expect(tableCss).toContain("top:82% !important; left:50% !important");
    expect(tableCss).toContain("top:50% !important; left:15% !important");
    expect(tableCss).toContain("top:50% !important; left:85% !important");
    expect(tableCss).toContain("width:76px !important");
    expect(tableCss).toContain("transform:scale(.8) !important");
  });

  it("separa barra de ações inferior e painel de apostas direito sem corte", () => {
    expect(controlsCss).toContain("bottom:10px");
    expect(controlsCss).toContain("right:10px");
    expect(controlsCss).toContain("bottom:80px");
    expect(controlsCss).toContain("gap:8px");
    expect(controlsCss).toContain("pointer-events:auto");
  });

  it("limpa o centro e deixa a marca como água a 15%", () => {
    expect(tableCss).toContain("opacity:.15");
    expect(tableCss).toContain(".table-brand-mark");
    expect(tableCss).toContain(".tbl-center-col .tbl-hint");
    expect(tableCss).toContain("display:none");
  });

  it("fixa Nova mão acima da action bar e desloca Ver dicas para fora do centro", () => {
    expect(tableCss).toContain(".play > .controls.action-row:not(.controls-v2)");
    expect(tableCss).toContain("bottom:72px");
    expect(tableCss).toContain(".tbl-tips-btn");
    expect(tableCss).toContain("top:auto");
  });
});
