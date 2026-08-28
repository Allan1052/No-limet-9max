import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";

describe("Etapa 3 - resumo de resultado da mão", () => {
  it("integra o resumo visual pós-mão no fluxo principal", () => {
    expect(appSource).toContain("<HandResultSummary");
    expect(appSource).toContain("feedback={controller.feedback}");
  });
});
