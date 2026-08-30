import { describe, expect, it } from "vitest";
import source from "./HandShareButton.tsx?raw";

describe("integração do card Instagram premium", () => {
  it("usa o renderer premium no card principal", () => {
    expect(source).toContain('import { drawInstagramPremiumShareCard } from "../app/instagramPremiumShareCard"');
    expect(source).toContain("drawInstagramPremiumShareCard(data, mode)");
  });

  it("usa o renderer premium como primeiro card do carrossel", () => {
    expect(source).toContain('drawInstagramPremiumShareCard(data, "simples")');
    expect(source).toContain('drawHandShareCard(data, "simples", "narrativa")');
  });
});
