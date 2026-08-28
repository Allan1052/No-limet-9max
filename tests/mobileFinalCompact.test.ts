import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const controls = fs.readFileSync(path.join(root, "src/ui/Controls.tsx"), "utf8");
const app = fs.readFileSync(path.join(root, "src/app/App.tsx"), "utf8");

describe("acabamento mobile aprovado", () => {
  it("remove o titulo redundante das acoes sem alterar os botoes", () => {
    expect(controls).not.toContain("AÇÕES PRINCIPAIS");
    expect(controls).toContain("action-row action-row-primary");
  });

  it("abrevia fichas simuladas para FS no HUD ITM", () => {
    expect(app).toContain("FS`");
    expect(app).not.toContain("fichas simuladas`");
  });
});
