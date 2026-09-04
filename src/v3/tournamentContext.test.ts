import { describe, expect, it } from "vitest";
import { sameCertifiedContext, type TournamentContextV3 } from "./tournamentContext";

const base: TournamentContextV3 = {
  format: "PKO",
  fieldRemainingPct: 50,
  positions: ["SB", "BB"],
  stacksBB: { SB: 33, BB: 20 },
  effectiveStackBB: 20,
  coverage: [{ covers: "SB", covered: "BB" }],
};

describe("sameCertifiedContext", () => {
  it("accepts identical certified context", () => {
    expect(sameCertifiedContext(base, { ...base })).toBe(true);
  });

  it("rejects same effective stack when coverage is inverted", () => {
    expect(sameCertifiedContext(base, {
      ...base,
      stacksBB: { SB: 20, BB: 33 },
      coverage: [{ covers: "BB", covered: "SB" }],
    })).toBe(false);
  });

  it("rejects Vanilla vs PKO", () => {
    expect(sameCertifiedContext(base, { ...base, format: "VANILLA" })).toBe(false);
  });
});
