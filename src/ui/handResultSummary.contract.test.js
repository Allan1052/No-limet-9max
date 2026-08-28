import { describe, expect, it } from "vitest";
import fs from "fs";

const app = fs.readFileSync(new URL("../app/App.tsx", import.meta.url), "utf8");

describe("Etapa 3 - resumo de resultado da mão", () => {
  it("mostra um resumo visual de acerto/erro ao encerrar a mão", () => {
    expect(app).toContain("<HandResultSummary");
    expect(app).toContain("feedback={controller.feedback}");
  });
});
