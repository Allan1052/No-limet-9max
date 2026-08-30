import { describe, expect, it } from "vitest";
import { instagramPremiumLayout } from "./handShareCard";

describe("Instagram premium share card", () => {
  it("usa formato vertical 4:5 para ocupar mais espaço no feed", () => {
    expect(instagramPremiumLayout.width).toBe(1080);
    expect(instagramPremiumLayout.height).toBe(1350);
    expect(instagramPremiumLayout.aspectRatio).toBe("4:5");
  });

  it("define hierarquia visual centrada em cartas e comparação Você x Coach V2", () => {
    expect(instagramPremiumLayout.heroCardsEmphasis).toBe("primary");
    expect(instagramPremiumLayout.decisionComparison).toBe("hero-vs-coach");
    expect(instagramPremiumLayout.metricsStyle).toBe("chips");
    expect(instagramPremiumLayout.brandSignature).toBe("Call ou Fold · Coach V2");
  });
});
