import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../app/App.tsx", import.meta.url), "utf8");

describe("integração da dica Coach V2 na mesa", () => {
  it("usa a decisão estruturada do Coach V2 em vez da dica baseline crua", () => {
    expect(app).toContain('from "./coachV2Live"');
    expect(app).toContain('from "../ui/coachV2Hint"');
    expect(app).toContain("computeHeroCoachDecision(controller)");
    expect(app).toContain("buildCoachV2HintView(coachDecision)");
  });
});
