// O tsconfig do app não carrega @types/node; Vitest executa este built-in normalmente.
// @ts-ignore -- tipos Node ficam fora do bundle/browser de produção.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const focusCss = readFileSync(new URL("./bottomNavFocus.css", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../app/App.tsx", import.meta.url), "utf8");

describe("Uma mão por vez", () => {
  it("mantém jogar como destino principal da navegação", () => {
    expect(appSource).toContain('const [view, setView] = useState<AppView>("play")');
    expect(focusCss).toContain(".bottom-nav .bn-item.bn-primary");
  });

  it("faz da próxima mão o CTA dominante entre mãos e reduz competição visual", () => {
    expect(focusCss).toContain(".play .action-row > .btn.primary:first-child");
    expect(focusCss).toContain("width: 100%");
    expect(focusCss).toContain(".play .action-row > .btn:not(.primary)");
    expect(focusCss).toContain("opacity: 0.72");
  });
});
