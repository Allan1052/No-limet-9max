import { describe, expect, it } from "vitest";
// @ts-ignore — disponível no ambiente Node/Vitest; o projeto não declara @types/node no build.
import { readFileSync } from "node:fs";

const tableCss =
  readFileSync(new URL("./tableModern.css", import.meta.url), "utf8") +
  "\n" +
  readFileSync(new URL("./tableFullscreenRound2.css", import.meta.url), "utf8");
const controlsCss = readFileSync(new URL("./controlsHierarchy.css", import.meta.url), "utf8");
const progressCss = readFileSync(new URL("./sessionProgressStrip.css", import.meta.url), "utf8");
const controlsTsx = readFileSync(new URL("./Controls.tsx", import.meta.url), "utf8");
const tableTsx = readFileSync(new URL("./Table.tsx", import.meta.url), "utf8");

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

  it("centraliza o feltro e compacta pods e avatar sem sobrepor cartas", () => {
    expect(tableCss).toContain(".app.nav-hidden .table-modern .felt {\n    inset: 5% 2% 5%;");
    expect(tableCss).toContain(".app.nav-hidden .table-modern .seat .pod {\n    padding: 4px 5px 3px;");
    expect(tableCss).toContain(".app.nav-hidden .table-modern .seat .ava {\n    width: 24px;");
    expect(tableCss).toContain(".app.nav-hidden .table-modern .seat .hole {\n    position: relative;\n    z-index: 5;");
  });

  it("mantém a dica dentro do feltro e destaca a marca Call ou Fold em dourado", () => {
    expect(tableCss).toContain(".app:has(.play) .tbl-tips-btn");
    expect(tableCss).toContain("top: 9%;");
    expect(tableCss).toContain("left: 50%;");
    expect(tableCss).toContain("color: #f0d77f;");
    expect(tableTsx).toContain("Call ou Fold");
    expect(tableCss).toContain("text-shadow: 0 2px 12px rgba(230,196,84,.32)");
  });

  it("recolhe os presets de aumento atrás de uma setinha e expande para cima", () => {
    expect(controlsTsx).toContain("const [presetsOpen, setPresetsOpen] = useState(false)");
    expect(controlsTsx).toContain("raise-preset-toggle");
    expect(controlsTsx).toContain("aria-expanded={presetsOpen}");
    expect(controlsTsx).toContain("Pote");
    expect(controlsTsx).toContain("4BB");
    expect(controlsTsx).toContain("3BB");
    expect(controlsTsx).toContain("2BB");
    expect(controlsCss).toContain(".raise-preset-menu");
    expect(controlsCss).toContain("bottom: calc(100% + 5px);");
  });

  it("protege a zona do herói deixando o cockpit compacto no canto inferior", () => {
    expect(controlsCss).toContain("grid-template-columns: minmax(0, 1fr) 92px;");
    expect(controlsCss).toContain("max-width: 330px;");
    expect(controlsCss).toContain("left: 7px;");
    expect(tableCss).toContain("top: 74% !important;");
  });

  it("leva a marca e o HUD para dentro da composição visual da mesa", () => {
    expect(tableTsx).toContain("Call ou Fold");
    expect(tableCss).toContain(".app:has(.play) .play-tstatus");
    expect(tableCss).toContain("position: absolute;");
  });

  it("mantém Ver dicas acessível e mesa fullscreen em toda a tela de jogo", () => {
    expect(tableTsx).toContain("{onShowTips ? (");
    expect(tableCss).toContain(".app:has(.play) .play {");
    expect(tableCss).toContain(".app:has(.play) .bottom-nav");
    expect(tableCss).toContain(".app.nav-hidden .tbl-tips-btn");
  });
});