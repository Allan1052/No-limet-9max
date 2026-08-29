// @ts-ignore
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const analyticsSource = readFileSync(new URL("./analytics.ts", import.meta.url), "utf8");
const progressSource = readFileSync(new URL("../ui/SessionProgressStrip.tsx", import.meta.url), "utf8");
const shareSource = readFileSync(new URL("../ui/HandShareButton.tsx", import.meta.url), "utf8");

describe("Umami activation funnel", () => {
  it("normalizes the existing hand events into stable funnel names", () => {
    expect(analyticsSource).toContain('"hand_started"');
    expect(analyticsSource).toContain('"decision_made"');
    expect(analyticsSource).toContain('"next_hand_started"');
  });

  it("tracks a completed hand when session progress increases", () => {
    expect(progressSource).toContain('trackEvent("hand_completed"');
  });

  it("keeps the existing share funnel", () => {
    expect(shareSource).toContain('trackEvent("share_started"');
    expect(shareSource).toContain('trackEvent("share_succeeded"');
  });
});
