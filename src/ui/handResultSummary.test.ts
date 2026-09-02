import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";

// A pedido do Allan, o feedback e as ações de fim de mão NÃO ficam mais
// duplicados embaixo da mesa: aparecem só pelo botão "Ver dicas" (no modal).
describe("Feedback pós-mão concentrado no modal (sem duplicar embaixo da mesa)", () => {
  it("não renderiza mais a caixa de resumo inline embaixo da mesa", () => {
    expect(appSource).not.toContain("<HandResultSummary");
  });

  it("o modal de dicas recebe as ações de fim de mão", () => {
    expect(appSource).toContain("<HandTipsModal");
    expect(appSource).toContain("actions={postHandActions}");
  });

  it("embaixo da mesa fica só o 'Nova mão' pra continuar rápido", () => {
    expect(appSource).toContain("{newHandButton}");
  });
});
