// ---------------------------------------------------------------------------
// O card da sessão só vale se ele FOR HONESTO no fim. Estes testes guardam o
// que ele não pode fazer: dar veredito no meio da sessão, transformar o saldo
// do dia em julgamento do jogo, e esconder o número do dinheiro real.
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
// @ts-ignore — disponível no ambiente Node/Vitest; o projeto não declara @types/node no build.
import { readFileSync } from "node:fs";

const cardSource = readFileSync(new URL("./SessaoCard.tsx", import.meta.url), "utf8");
const tourSource = readFileSync(new URL("./Tournament.tsx", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../app/App.tsx", import.meta.url), "utf8");

function semComentarios(src: string): string {
  return src
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[ \t]*\/\/.*$/gm, " ");
}
const cardCodigo = semComentarios(cardSource);

describe("O card não julga o jogador pelo saldo do dia", () => {
  it("o veredito só existe com a sessão COMPLETA", () => {
    const duranteRetorna = cardCodigo.indexOf("if (!p.completa)");
    const veredito = cardCodigo.indexOf("vereditoDaSessao(p.jogados");
    expect(duranteRetorna).toBeGreaterThan(-1);
    expect(duranteRetorna).toBeLessThan(veredito);
  });

  it("diz explicitamente que o acaso explica o dia", () => {
    expect(cardCodigo).toContain("O acaso explica esse dia sozinho");
    expect(cardCodigo).toContain("Um dia não mede o seu jogo");
  });

  it("nem no dia fora da faixa ele vira julgamento do jogo", () => {
    expect(cardCodigo).toContain("ele não mede o seu jogo");
  });

  it("não usa linguagem de culpa nem de elogio ao jogador", () => {
    for (const proibido of ["você jogou mal", "você jogou bem", "parabéns", "foi culpa"]) {
      expect(cardCodigo).not.toContain(proibido);
    }
  });
});

describe("Os dois mundos", () => {
  it("o veredito usa a régua do APP, onde a sessão aconteceu", () => {
    expect(cardCodigo).toContain('vereditoDaSessao(p.jogados, p.resultado, "app")');
  });

  it("mas mostra o número do PokerStars no plano, porque é lá que está o dinheiro", () => {
    expect(cardCodigo).toContain('faixaDaSessao(tamanho, "real")');
    expect(cardCodigo).toContain("PokerStars");
    expect(cardCodigo).toContain("rake");
  });
});

describe("Ligação com o resto do app", () => {
  it("está montado na tela de inscrição, abaixo da banca", () => {
    expect(tourSource).toContain("<SessaoCard />");
    expect(tourSource.indexOf("<BancaStrip")).toBeLessThan(tourSource.indexOf("<SessaoCard />"));
  });

  it("cada torneio terminado entra na sessão em BUY-INS", () => {
    expect(appSource).toContain("registrarTorneio(s.buyIn > 0 ? (s.cash - s.buyIn) / s.buyIn : 0)");
  });

  it("o registro fica sob o mesmo guarda que impede contar duas vezes", () => {
    const guarda = appSource.indexOf("summaryRef.current = key;");
    const registro = appSource.indexOf("registrarTorneio(");
    const fim = appSource.indexOf("addTournamentResult({");
    expect(guarda).toBeLessThan(registro);
    expect(registro).toBeLessThan(fim);
  });
});
