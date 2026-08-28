import { describe, expect, it } from "vitest";
import fs from "fs";

const app = fs.readFileSync(new URL("../app/App.tsx", import.meta.url), "utf8");
const component = fs.readFileSync(new URL("./SessionProgressStrip.tsx", import.meta.url), "utf8");

describe("Etapa 4 - progresso compacto durante o jogo", () => {
  it("integra a faixa de progresso no fluxo principal", () => {
    expect(app).toContain("<SessionProgressStrip");
    expect(app).toContain("summary={progress()}");
  });

  it("mostra mãos, decisões e precisão da sessão usando dados existentes", () => {
    expect(component).toContain("summary.hands");
    expect(component).toContain("summary.decisions");
    expect(component).toContain("summary.counts.boa + summary.counts.ok");
    expect(component).toContain('aria-label="Progresso desta sessão"');
  });
});
