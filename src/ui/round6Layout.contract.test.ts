import { describe, expect, it } from "vitest";
// @ts-ignore — disponível no ambiente Node/Vitest.
import { readFileSync } from "node:fs";

const round6Css = readFileSync(new URL("./tableRound6.css", import.meta.url), "utf8");
const controlsCss = readFileSync(new URL("./controlsHierarchy.css", import.meta.url), "utf8");
const tableTsx = readFileSync(new URL("./Table.tsx", import.meta.url), "utf8");
const controlsTsx = readFileSync(new URL("./Controls.tsx", import.meta.url), "utf8");
const appTsx = readFileSync(new URL("../app/App.tsx", import.meta.url), "utf8");

describe("Atualização 6 — correção do layout base da mesa", () => {
  it("trava a mesa mobile em proporção horizontal 4:3 e centraliza com margem", () => {
    expect(round6Css).toContain("aspect-ratio: 4 / 3");
    expect(round6Css).toContain("max-width: 95%");
    expect(round6Css).toContain("margin: 0 auto");
    expect(round6Css).toContain("left: 50%");
    expect(round6Css).toContain("transform: translate(-50%, -50%)");
  });

  it("mantém todos os pods dentro do feltro e uniformes", () => {
    expect(tableTsx).toContain('{ top: "82%", left: "50%" }');
    expect(tableTsx).toContain('{ top: "50%", left: "15%" }');
    expect(tableTsx).toContain('{ top: "50%", left: "85%" }');
    expect(round6Css).toContain("width: 76px !important");
    expect(round6Css).toContain("transform: scale(.8) !important");
  });

  it("separa barra de ações inferior e painel de apostas direito sem corte", () => {
    expect(controlsTsx).toContain("bottom-action-bar");
    expect(controlsTsx).toContain("right-bet-panel");
    expect(controlsCss).toContain("bottom: 10px");
    expect(controlsCss).toContain("right: 10px");
    expect(controlsCss).toContain("bottom: 80px");
    expect(controlsCss).toContain("gap: 8px");
  });

  it("limpa o centro e deixa a marca como água a 15%", () => {
    expect(round6Css).toContain("opacity: .15");
    expect(round6Css).toContain(".table-brand-mark");
    expect(round6Css).toContain(".tbl-center-col .tbl-hint");
    expect(round6Css).toContain("display: none");
  });

  it("fixa Nova mão acima da action bar e desloca Ver dicas para o jogador da vez", () => {
    expect(appTsx).toContain("new-hand-bottom-center");
    expect(round6Css).toContain(".new-hand-bottom-center");
    expect(round6Css).toContain(".tbl-tips-btn");
    expect(round6Css).toContain("top: auto");
  });
});
