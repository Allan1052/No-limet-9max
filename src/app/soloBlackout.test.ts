// ---------------------------------------------------------------------------
// O BLACKOUT DO "JOGAR SOZINHO", travado no fonte.
//
// O modo só vale se NADA na tela entregar a resposta. Um detalhe já escapou na
// primeira versão e só apareceu medindo no navegador: o botão "Ver dicas"
// continuava lá, porque `showTips` apenas ACENDE o destaque — quem decide se o
// botão existe é o callback `onShowTips`. Este teste guarda cada porta.
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import appSource from "./App.tsx?raw";
import tableSource from "../ui/Table.tsx?raw";

describe("blackout do Jogar sozinho", () => {
  it("a dica da mesa não nasce com o modo ligado", () => {
    const bloco = appSource.slice(appSource.indexOf("const hint ="), appSource.indexOf("const hint =") + 260);
    expect(bloco).toContain("!sozinho");
  });

  it("o convite 'Ver dicas' some pelo CALLBACK, não só pelo destaque", () => {
    // Regressão real: showTips={false} deixava o botão na tela do mesmo jeito.
    expect(appSource).toContain("onShowTips={sozinho ? undefined : () => setTipsOpen(true)}");
    expect(tableSource).toContain("{onShowTips ? (");
  });

  it("os avisos de conquista/missão ficam guardados enquanto se joga sozinho", () => {
    // São eles que entregam a nota: "10 decisões 'boa' seguidas" no meio da mão
    // conta o resultado da última decisão.
    const i = appSource.indexOf("BLACKOUT DOS AVISOS");
    expect(i, "o bloqueio dos avisos sumiu").toBeGreaterThan(-1);
    const bloco = appSource.slice(i, i + 900);
    expect(bloco).toContain('sozinho && view === "play"');
    expect(bloco).toContain("MissionToast");
    expect(bloco).toContain("AchievementToastPopup");
  });

  it("o motor é avisado do estado do botão (é ele que aplica a regra dura)", () => {
    expect(appSource).toContain("controller.setDicasLigadas(!sozinho)");
  });

  it("o botão da mesa existe e diz em que estado está", () => {
    expect(tableSource).toContain("tbl-solo-btn");
    expect(tableSource).toContain("🙈 Sozinho");
    expect(tableSource).toContain("💡 Com dicas");
    expect(tableSource).toContain("aria-pressed={sozinho}");
  });
});
