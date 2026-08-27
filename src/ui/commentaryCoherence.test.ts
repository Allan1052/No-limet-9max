// @ts-nocheck — usa fs/path do Node (o projeto não instala @types/node); o
// vitest roda via esbuild sem checagem de tipos. É um guard que lê o fonte.
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// Guarda de COERÊNCIA das dicas (parecer da Manus — auditoria combinatória):
// os comentários do coach não devem afirmar composição de range com FALSA
// PRECISÃO ("60% do valor de quem 3-beta é AK/QQ+"). Um número desses fica
// fixo no template e "vale" pra qualquer spot — é o alerta "número de equity
// incompatível". Aproximações com premissa clara ("~66% vs range do BTN") são
// aceitáveis; o que este teste bane é o número-fato sobre composição de range.
describe("coerência das dicas — sem falsa precisão de composição de range", () => {
  const src = readFileSync(join(__dirname, "handCommentary.ts"), "utf8");

  it("nenhuma dica afirma 'NN% do valor/range/mãos/combos é ...'", () => {
    const matches = src.match(/\d{1,3}%\s+(do valor|do range|das mãos|dos combos)/g) ?? [];
    expect(matches, `falsa precisão de composição: ${matches.join(" | ")}`).toHaveLength(0);
  });

  it("nenhuma dica inventa 'NN% do VPIP' ou 'NN bb/mão' como estatística exata", () => {
    const matches = src.match(/~?\d[\d.]*%?\s*(do VPIP|bb\/mão)/g) ?? [];
    expect(matches, `estatística inventada: ${matches.join(" | ")}`).toHaveLength(0);
  });
});
