import { describe, expect, it } from "vitest";
// @ts-ignore — disponível no ambiente Node/Vitest; o projeto não declara @types/node no build.
import { readFileSync } from "node:fs";

const tableCss =
  readFileSync(new URL("./tableModern.css", import.meta.url), "utf8") +
  "\n" +
  readFileSync(new URL("./tableFullscreenRound2.css", import.meta.url), "utf8") +
  "\n" +
  readFileSync(new URL("./tableRound4.css", import.meta.url), "utf8");
const controlsCss = readFileSync(new URL("./controlsHierarchy.css", import.meta.url), "utf8");
const progressCss = readFileSync(new URL("./sessionProgressStrip.css", import.meta.url), "utf8");
const controlsTsx = readFileSync(new URL("./Controls.tsx", import.meta.url), "utf8");
const tableTsx = readFileSync(new URL("./Table.tsx", import.meta.url), "utf8");
const navTsx = readFileSync(new URL("./BottomNav.tsx", import.meta.url), "utf8");
const pwaTs = readFileSync(new URL("../app/pwaUpdate.ts", import.meta.url), "utf8");
const mainTsx = readFileSync(new URL("../main.tsx", import.meta.url), "utf8");

describe("Etapa 5 - acabamento mobile", () => {
  it("reserva espaço para a barra inferior do celular", () => {
    expect(tableCss).toContain("padding-bottom: max(8px, env(safe-area-inset-bottom))");
  });

  it("usa a viewport inteira no modo imersivo", () => {
    expect(tableCss).toContain("min-height: 100dvh");
    expect(tableCss).toContain(".app.nav-hidden .play > .table-modern {\n    position: absolute;");
    expect(tableCss).toContain("inset: 0;");
  });

  it("mantém os controles sobre a viewport sem comprimir a mesa", () => {
    expect(controlsCss).toContain(".app.nav-hidden .controls-v2");
    expect(controlsCss).toContain("position:fixed");
    expect(controlsCss).toContain("bottom:10px");
  });

  it("mantém os três botões principais confortáveis para toque", () => {
    expect(controlsCss).toContain(".action-choice { min-height:48px; padding:4px; }");
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
    expect(controlsCss).toContain("background:linear-gradient(");
  });

  it("mantém a dica dentro do feltro e destaca a marca Call ou Fold em dourado", () => {
    expect(tableCss).toContain(".app:has(.play) .tbl-tips-btn");
    expect(tableCss).toContain("left: 50%;");
    expect(tableCss).toContain("color: #f0d77f;");
    expect(tableTsx).toContain("brand-logo-splash.png");
    expect(tableCss).toContain("text-shadow: 0 2px 12px rgba(230,196,84,.32)");
  });

  it("leva a marca e o HUD para dentro da composição visual da mesa", () => {
    expect(tableTsx).toContain("table-brand-mark");
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

describe("Rodada 4 - detalhes de mesa estilo GG com identidade Call ou Fold", () => {
  it("mantém Fold, Call/Check e Raise como três ações principais lado a lado", () => {
    expect(controlsTsx).toContain("action-choice-fold");
    expect(controlsTsx).toContain("action-choice-call");
    expect(controlsTsx).toContain("raise-submit");
    expect(controlsCss).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
  });

  it("usa a setinha apenas para abrir e fechar o ajuste fino por slider", () => {
    expect(controlsTsx).toContain("fineTuneOpen");
    expect(controlsTsx).toContain("fine-tune-toggle");
    expect(controlsTsx).toContain("raise-slider-popover");
    expect(controlsCss).toContain(".raise-slider-popover");
  });

  it("clareia o entorno e centraliza a mesa com geometria horizontal simétrica", () => {
    expect(tableCss).toContain("--table-stage-light");
    expect(tableCss).toContain("aspect-ratio:4 / 3");
    expect(tableCss).toContain("inset:12px !important");
    expect(tableCss).toContain("background:radial-gradient");
  });

  it("oferece um X fixo para sair da mesa e voltar ao hub Treinar", () => {
    expect(tableTsx).toContain("play-exit-btn");
    expect(tableTsx).toContain("aria-label=\"Sair da mesa\"");
    expect(tableTsx).toContain('detail: "treino"');
  });

  it("abre Treinar no hub de treino e não direto na mesa", () => {
    expect(navTsx).toContain('views: ["treino", "play", "torneio", "campanha", "ultra", "ft", "drill"]');
  });

  it("força atualização com feedback visível, revalidação do SW e limpeza de caches", () => {
    expect(mainTsx).toContain("Verificando…");
    expect(mainTsx).toContain("Atualizando…");
    expect(mainTsx).toContain("forceNetworkUpdate");
    expect(pwaTs).toContain("forceNetworkUpdate");
    expect(pwaTs).toContain("registration.update()");
    expect(pwaTs).toContain("caches.keys()");
  });
});

describe("Rodada 6 - layout base centralizado e botões sem corte", () => {
  it("usa quatro atalhos verticais fixos à direita, incluindo 2BB", () => {
    expect(controlsTsx).toContain('{ label: "Pote", to: potTo }');
    expect(controlsTsx).toContain('{ label: "4BB", to: presetTo(4) }');
    expect(controlsTsx).toContain('{ label: "3BB", to: presetTo(3) }');
    expect(controlsTsx).toContain('{ label: "2BB", to: presetTo(2) }');
    expect(controlsTsx).toContain("right-bet-panel");
    expect(controlsTsx).not.toContain("raise-size-edit");
  });

  it("fixa os três botões principais na barra inferior", () => {
    expect(controlsTsx).toContain("bottom-action-bar");
    expect(controlsCss).toContain("bottom:10px");
    expect(controlsCss).toContain("right:10px");
  });

  it("mantém todos os nove assentos em posições seguras dentro do feltro", () => {
    expect(tableTsx).toContain('{ top: "82%", left: "50%" }');
    expect(tableTsx).toContain('{ top: "50%", left: "15%" }');
    expect(tableTsx).toContain('{ top: "50%", left: "85%" }');
  });

  it("deixa a marca central somente como imagem discreta", () => {
    expect(tableTsx).toContain("brand-logo-splash.png");
    expect(tableTsx).not.toContain("<span>Call ou Fold</span>");
    expect(tableCss).toContain("opacity:.15");
  });
});
