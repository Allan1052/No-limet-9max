import { describe, expect, test } from "vitest";
import css from "./tableModern.css?raw";

describe("Etapa 2 - contrato visual mobile", () => {
  test("libera mais altura útil entre status, mesa e controles", () => {
    expect(css).toContain("height: clamp(360px, calc(100dvh - 265px), 535px)");
    expect(css).toContain(".app.nav-hidden .topbar");
    expect(css).toContain("padding-bottom: 4px");
    expect(css).toContain("margin-bottom: 4px");
    expect(css).toContain(".app.nav-hidden .hub-subnav");
    expect(css).toContain("margin-bottom: 0");
    expect(css).toContain(".app.nav-hidden .play .controls");
    expect(css).toContain("margin-top: 2px");
  });

  test("usa o verde vivo aprovado sem excesso de claridade", () => {
    expect(css).toContain("rgba(48,126,88,.98)");
    expect(css).toContain("rgba(22,82,55,.99)");
    expect(css).toContain("rgba(116,211,157,.16)");
  });
});
