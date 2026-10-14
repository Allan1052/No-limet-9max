// ---------------------------------------------------------------------------
// O banco de spots só vale se cada spot for COERENTE e a conta for REAL.
// Estes testes guardam as duas coisas — e, principalmente, que a tela nunca
// passe a dar veredito num spot que é disputado por natureza.
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
// @ts-ignore — disponível no ambiente Node/Vitest; o projeto não declara @types/node no build.
import { readFileSync } from "node:fs";
import {
  SPOTS,
  blefeNecessario,
  combosDoRange,
  contaDoSpot,
  precoExigido,
  spotPorId,
} from "./spotQueDivide";
import { cardsFromString, seededRng } from "../engine/cards";

const viewSource = readFileSync(new URL("../ui/SpotQueDivideView.tsx", import.meta.url), "utf8");
function semComentarios(src: string): string {
  return src.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[ \t]*\/\/.*$/gm, " ");
}
const viewCodigo = semComentarios(viewSource);

describe("Cada spot é coerente", () => {
  it("tem id único e campos preenchidos", () => {
    const ids = new Set(SPOTS.map((s) => s.id));
    expect(ids.size).toBe(SPOTS.length);
    for (const s of SPOTS) {
      expect(s.titulo.length).toBeGreaterThan(5);
      expect(s.arquetipo.length).toBeGreaterThan(5);
      expect(s.porQueDivide.length).toBeGreaterThan(40);
      expect(s.comoLiORange.length).toBeGreaterThan(40);
      expect(s.inclinaCall.length).toBeGreaterThanOrEqual(2);
      expect(s.inclinaFold.length).toBeGreaterThanOrEqual(2);
      expect(spotPorId(s.id)?.id).toBe(s.id);
    }
  });

  it("as cartas são válidas e não se repetem entre mão e mesa", () => {
    for (const s of SPOTS) {
      const mao = cardsFromString(s.maoHeroi);
      expect(mao).toHaveLength(2);
      const board = s.board.trim() ? cardsFromString(s.board) : [];
      expect(board.length).toBeLessThanOrEqual(5);
      const todas = new Set([...mao, ...board]);
      expect(todas.size).toBe(mao.length + board.length);
    }
  });

  it("a ação cobre a mão inteira, até a rua da decisão", () => {
    for (const s of SPOTS) {
      expect(s.acoes.some((a) => a.rua === "preflop")).toBe(true);
      expect(s.acoes.some((a) => a.marco)).toBe(true);
      // O board tem de ter cartas compatíveis com a rua da decisão.
      const n = s.board.trim() ? cardsFromString(s.board).length : 0;
      if (s.rua === "flop" && n > 0) expect(n).toBe(3);
      if (s.rua === "turn") expect(n).toBe(4);
      if (s.rua === "river") expect(n).toBe(5);
    }
  });

  it("valor e blefe são ranges separados e não vazios", () => {
    for (const s of SPOTS) {
      expect(s.rangeValor.length).toBeGreaterThan(0);
      expect(s.rangeBlefe.length).toBeGreaterThan(0);
      expect(combosDoRange(s.rangeValor).length).toBeGreaterThan(0);
      expect(combosDoRange(s.rangeBlefe).length).toBeGreaterThan(0);
      // Nenhuma mão pode estar nos dois lados — seria contar duas vezes.
      const v = new Set(s.rangeValor);
      expect(s.rangeBlefe.filter((b) => v.has(b))).toHaveLength(0);
    }
  });
});

describe("A conta é real", () => {
  it("preço exigido é aritmética do pote", () => {
    expect(precoExigido(100, 100)).toBeCloseTo(0.5, 6);
    expect(precoExigido(90, 10)).toBeCloseTo(0.1, 6);
    expect(precoExigido(0, 0)).toBe(0);
  });

  it("todo spot produz equity entre 0 e 1 e margem coerente", () => {
    for (const s of SPOTS) {
      const c = contaDoSpot(s, 4000, seededRng(1));
      expect(c.equity).toBeGreaterThan(0);
      expect(c.equity).toBeLessThan(1);
      expect(c.margem).toBeCloseTo(c.equity - c.precoExigido, 6);
      // A equity total fica entre a de valor e a de blefe.
      const lo = Math.min(c.equityVsValor, c.equityVsBlefe);
      const hi = Math.max(c.equityVsValor, c.equityVsBlefe);
      expect(c.equity).toBeGreaterThanOrEqual(lo - 1e-9);
      expect(c.equity).toBeLessThanOrEqual(hi + 1e-9);
    }
  });

  it("você ganha mais contra blefe do que contra valor — senão o spot está errado", () => {
    for (const s of SPOTS) {
      const c = contaDoSpot(s, 4000, seededRng(7));
      expect(c.equityVsBlefe).toBeGreaterThan(c.equityVsValor);
    }
  });
});

describe("A pergunta que decide o spot", () => {
  it("se já paga contra valor puro, não precisa de blefe nenhum", () => {
    expect(blefeNecessario(0.8, 100, 0.95, 50, 0.5)).toBe(0);
  });

  it("se nem blefe puro cobre o preço, não existe resposta", () => {
    expect(blefeNecessario(0.1, 100, 0.3, 50, 0.6)).toBeUndefined();
  });

  it("a proporção devolvida realmente empata a conta", () => {
    const eqV = 0.2, nV = 100, eqB = 0.95, nB = 50, preco = 0.5;
    const frac = blefeNecessario(eqV, nV, eqB, nB, preco)!;
    // Reconstrói o range com essa fração e confere a equity resultante.
    const eq = frac * eqB + (1 - frac) * eqV;
    expect(eq).toBeCloseTo(preco, 6);
  });

  it("fica sempre entre 0 e 1", () => {
    for (const s of SPOTS) {
      const c = contaDoSpot(s, 4000, seededRng(3));
      if (c.blefeNecessario === undefined) continue;
      expect(c.blefeNecessario).toBeGreaterThanOrEqual(0);
      expect(c.blefeNecessario).toBeLessThanOrEqual(1);
    }
  });
});

describe("A tela NÃO dá veredito", () => {
  it("nunca diz que uma das jogadas era a certa", () => {
    for (const proibido of [
      "a jogada certa", "o certo era", "você errou", "você acertou",
      "resposta correta", "incorreto",
    ]) {
      expect(viewCodigo).not.toContain(proibido);
    }
  });

  it("diz explicitamente que não vai dar a resposta", () => {
    expect(viewCodigo).toContain("não vai te dizer qual era a certa");
    expect(viewCodigo).toContain("estimativa");
  });

  it("mostra a mão inteira antes da decisão, e a conta só depois", () => {
    const acoes = viewCodigo.indexOf("sqd-acoes");
    const decisao = viewCodigo.indexOf("sqd-decisao");
    const numeros = viewCodigo.indexOf("sqd-numeros");
    expect(acoes).toBeLessThan(decisao);
    expect(decisao).toBeLessThan(numeros);
    // A conta só roda depois da escolha.
    expect(viewCodigo).toContain("escolha ? contaDoSpot(spot, 20_000) : null");
  });

  it("mostra os dois lados do debate", () => {
    expect(viewCodigo).toContain("inclinaCall");
    expect(viewCodigo).toContain("inclinaFold");
  });
});
