// @ts-ignore
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
const shareSource = readFileSync(new URL("../ui/HandShareButton.tsx", import.meta.url), "utf8");

describe("Umami activation funnel", () => {
  it("tracks the core hand funnel with stable event names", () => {
    expect(appSource).toContain('trackEvent("hand_started"');
    expect(appSource).toContain('trackEvent("decision_made"');
    expect(appSource).toContain('trackEvent("hand_completed"');
    expect(appSource).toContain('trackEvent("next_hand_started"');
  });

  it("keeps the existing share funnel", () => {
    expect(shareSource).toContain('trackEvent("share_started"');
    expect(shareSource).toContain('trackEvent("share_succeeded"');
  });
});
