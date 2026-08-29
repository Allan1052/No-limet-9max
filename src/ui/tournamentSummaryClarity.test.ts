import { describe, expect, it } from "vitest";
// @ts-ignore — disponível no ambiente Node/Vitest; o projeto não declara @types/node no build.
import { readFileSync } from "node:fs";
import { anatomyFromDecisions } from "../tournament/anatomy";

const summarySource = readFileSync(new URL("./TournamentSummary.tsx", import.meta.url), "utf8");

describe("resumo do torneio — clareza para o recreativo", () => {
  it("não exibe uma segunda distribuição Fold/Call/Raise que contradiz o gráfico principal", () => {
    expect(summarySource).not.toContain("Padrão das mãos que você JOGOU: Fold");
    expect(summarySource).toContain("Em todas as mãos em que você tomou uma decisão");
  });

  it("mantém apenas um compartilhamento principal no resumo", () => {
    const shareComponents = ["<HandShareButton", "<TrophyShareButton"].filter((token) => summarySource.includes(token));
    expect(shareComponents).toHaveLength(1);
  });

  it("diagnostica excesso de call sem transformar isso em regra universal sobre recreativos", () => {
    const decisions = [
      ...Array(14).fill({ heroAction: "fold" }),
      ...Array(24).fill({ heroAction: "call" }),
      ...Array(62).fill({ heroAction: "raise" }),
    ];
    const result = anatomyFromDecisions(decisions);
    expect(result.note).toContain("Nos spots analisados neste torneio");
    expect(result.note).not.toContain("O recreativo paga demais");
    expect(result.note).not.toContain("Ou toma a iniciativa");
  });
});
