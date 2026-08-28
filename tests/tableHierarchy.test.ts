import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const seatSource = readFileSync(new URL("../src/ui/Seat.tsx", import.meta.url), "utf8");
const hierarchyCss = readFileSync(new URL("../src/ui/tableHierarchy.css", import.meta.url), "utf8");

describe("hierarquia visual da mesa", () => {
  it("identifica o Hero explicitamente sem depender só de cor", () => {
    expect(seatSource).toContain('className="hero-kicker"');
    expect(seatSource).toContain("VOCÊ");
  });

  it("dá tratamento visual dedicado ao Hero e à vez de agir", () => {
    expect(hierarchyCss).toContain(".seat.hero .pod");
    expect(hierarchyCss).toContain(".seat.hero.acting .pod");
    expect(hierarchyCss).toContain(".seat.hero .stack");
    expect(hierarchyCss).toContain(".seat.hero .hole");
  });

  it("preserva uma composição específica para telas pequenas", () => {
    expect(hierarchyCss).toContain("@media (max-width: 640px)");
    expect(hierarchyCss).toContain(".seat.hero");
    expect(hierarchyCss).toContain(".hero-kicker");
  });
});
