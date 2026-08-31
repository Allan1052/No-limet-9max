import { describe, expect, it } from "vitest";
import handLabSource from "./HandLab.tsx?raw";

describe("HandLab → compartilhamento por card de referência", () => {
  it("usa o compartilhador específico sem substituir o fluxo genérico global", () => {
    expect(handLabSource).toContain('HandLabReferenceShare');
    expect(handLabSource).toContain('<HandLabReferenceShare analysis={result} />');
    expect(handLabSource).not.toContain('<TrainingShareButton');
  });
});
