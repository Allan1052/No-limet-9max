import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("../app/App.tsx", import.meta.url), "utf8");

describe("Uma mão por vez", () => {
  it("mantém a próxima mão como CTA dominante e recolhe ferramentas secundárias", () => {
    expect(appSource).toContain('className="controls action-row one-hand-focus"');
    expect(appSource).toContain('className="btn primary one-hand-primary"');
    expect(appSource).toContain("Mais opções de estudo");
    expect(appSource).toContain('className="one-hand-secondary"');
  });
});
