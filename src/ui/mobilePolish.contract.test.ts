import { describe, expect, it } from "vitest";
// @ts-ignore — disponível no ambiente Node/Vitest; o projeto não declara @types/node no build.
import { readFileSync } from "node:fs";

const tableCss = readFileSync(new URL("./tableModern.css", import.meta.url), "utf8");
const controlsCss = readFileSync(new URL("./controlsHierarchy.css", import.meta.url), "utf8");
const progressCss = readFileSync(new URL("./sessionProgressStrip.css", import.meta.url), "utf8");

describe("Etapa 5 - acabamento mobile", () => {
  it("reserva espaço para a barra inferior do celular", () => {
    expect(tableCss).toContain("padding-bottom: max(8px, env(safe-area-inset-bottom))");
  });

  it("usa a viewport inteira no modo imersivo", () => {
    expect(tableCss).toContain("min-height: 100dvh");
    expect(tableCss).toContain(".app.nav-hidden .play > .table-modern {\n    position: absolute;");
    expect(tableCss).toContain("inset: 0;");
  });

  it("mantém os controles flutuando sobre o feltro no modo imersivo", () => {
    expect(controlsCss).toContain(".app.nav-hidden .controls-v2");
    expect(controlsCss).toContain("position: absolute;");
    expect(controlsCss).toContain("bottom: max(6px, env(safe-area-inset-bottom, 0px));");
  });

  it("mantém os três botões principais confortáveis para toque", () => {
    expect(controlsCss).toContain(".action-choice { min-height: 48px; padding: 4px; }");
    expect(controlsCss).toContain("touch-action: manipulation");
  });

  it("compacta a faixa de progresso no celular", () => {
    expect(progressCss).toContain("padding: 4px 6px 6px");
    expect(progressCss).toContain("font-size: 8px");
  });

  it("reduz o peso visual dos pods no modo imersivo", () => {
    expect(tableCss).toContain(".app.nav-hidden .table-modern .seat .pod");
    expect(tableCss).toContain("background: rgba(8,12,10,.68);");
  });

  it("mantém herói e jogador ativo como focos da mesa", () => {
    expect(tableCss).toContain(".app.nav-hidden .table-modern .seat.hero .pod");
    expect(tableCss).toContain(".app.nav-hidden .table-modern .seat.acting .pod");
  });

  it("integra os controles ao feltro sem painel pesado", () => {
    expect(controlsCss).toContain("background: linear-gradient(");
    expect(controlsCss).toContain("rgba(5,8,7,.88) 100%");
  });
});