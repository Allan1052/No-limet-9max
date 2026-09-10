// @ts-nocheck -- Site-only contract uses Node built-ins under Vitest; the app tsconfig intentionally has no Node typings.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const siteHtml = readFileSync(new URL("../site/index.html", import.meta.url), "utf8");
const publicHtml = readFileSync(new URL("../public/site/index.html", import.meta.url), "utf8");
const pricing = readFileSync(new URL("../site/planos-section.html", import.meta.url), "utf8");
const publicPricing = readFileSync(new URL("../public/site/planos-section.html", import.meta.url), "utf8");

function gitBlobSha(path: URL): string {
  const bytes = readFileSync(path);
  return createHash("sha1")
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest("hex");
}

describe("/site premium-free contract", () => {
  it("keeps source and deployed site mirrors identical", () => {
    expect(publicHtml).toBe(siteHtml);
    expect(publicPricing).toBe(pricing);
  });

  it("preserves the original official logo bytes in both site mirrors", () => {
    const expected = "62d9153a938cdb6177c07d5d4a3ad97a8d7db7c0";
    expect(gitBlobSha(new URL("../site/logo.png", import.meta.url))).toBe(expected);
    expect(gitBlobSha(new URL("../public/site/logo.png", import.meta.url))).toBe(expected);
  });

  it("uses only logo.png as the landing logo reference", () => {
    const logoRefs = [...siteHtml.matchAll(/<img[^>]+src=["']([^"']*logo[^"']*)["']/gi)].map((m) => m[1]);
    expect(logoRefs.length).toBeGreaterThan(0);
    expect(new Set(logoRefs)).toEqual(new Set(["logo.png"]));
  });

  it("contains no paid offer language in maintained site HTML", () => {
    const corpus = `${siteHtml}\n${publicHtml}\n${pricing}\n${publicPricing}`;
    expect(corpus).not.toMatch(/R\$\s*\d/i);
    expect(corpus).not.toMatch(/\/\s*m[eê]s/i);
    expect(corpus).not.toMatch(/\bassin(ar|atura|e)\b/i);
  });

  it("puts a free primary CTA in the hero and uses three core pillars", () => {
    const hero = siteHtml.match(/<header class="hero"[\s\S]*?<\/header>/i)?.[0] ?? "";
    expect(hero).toMatch(/Jogar gr[aá]tis agora/i);
    expect(siteHtml).toMatch(/>Jogue</i);
    expect(siteHtml).toMatch(/>Entenda</i);
    expect(siteHtml).toMatch(/>Evolua</i);
  });

  it("does not schedule an automatic install banner after three seconds", () => {
    expect(siteHtml).not.toMatch(/setTimeout\(createBanner,\s*3000\)/);
    expect(siteHtml).not.toMatch(/id=["']install-banner["']/i);
  });
});
