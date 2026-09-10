import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const pricing = readFileSync(new URL("./planos-section.html", import.meta.url), "utf8");

describe("/site premium-free contract", () => {
  it("uses only the official site/logo.png brand asset in landing markup", () => {
    const logoRefs = [...html.matchAll(/<img[^>]+src=["']([^"']*logo[^"']*)["']/gi)].map((m) => m[1]);
    expect(logoRefs.length).toBeGreaterThan(0);
    expect(new Set(logoRefs)).toEqual(new Set(["logo.png"]));
  });

  it("contains no paid offer language in maintained site HTML", () => {
    const corpus = `${html}\n${pricing}`;
    expect(corpus).not.toMatch(/R\$\s*\d/i);
    expect(corpus).not.toMatch(/\/\s*m[eê]s/i);
    expect(corpus).not.toMatch(/\bassin(ar|atura|e)\b/i);
  });

  it("puts a free primary CTA in the hero and uses three core pillars", () => {
    const hero = html.match(/<header class="hero"[\s\S]*?<\/header>/i)?.[0] ?? "";
    expect(hero).toMatch(/Jogar gr[aá]tis agora/i);
    expect(html).toMatch(/>Jogue</i);
    expect(html).toMatch(/>Entenda</i);
    expect(html).toMatch(/>Evolua</i);
  });

  it("does not schedule an automatic install banner after three seconds", () => {
    expect(html).not.toMatch(/setTimeout\(createBanner,\s*3000\)/);
  });
});
