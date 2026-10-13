// ---------------------------------------------------------------------------
// A BANCA IMPÕE NA TELA, não só no módulo.
//
// Pedido do Allan: *"o app vai impor que eu seguisse a regra certinho."* O
// módulo `train/banca.ts` sabe a regra; estes testes guardam que a TELA
// realmente obedece a ela — que o torneio não começa e que o prêmio volta.
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
// @ts-ignore — disponível no ambiente Node/Vitest; o projeto não declara @types/node no build.
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../app/App.tsx", import.meta.url), "utf8");
const tourSource = readFileSync(new URL("./Tournament.tsx", import.meta.url), "utf8");
const stripSource = readFileSync(new URL("./BancaStrip.tsx", import.meta.url), "utf8");

/**
 * Tira comentários antes de procurar texto proibido — senão o teste lê a PROSA
 * que explica a regra como se fosse violação dela. Mesma armadilha já pega em
 * `alvoTemFim.test.ts`: aqui o comentário da linha da ruína cita os "depósitos"
 * do Allan, e "depósito" está na lista de palavras que a TELA não pode usar.
 */
function semComentarios(src: string): string {
  return src
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[ \t]*\/\/.*$/gm, " ");
}
const stripCodigo = semComentarios(stripSource);

describe("A tela obedece a regra", () => {
  it("o torneio NÃO começa quando a banca não cobre o buy-in", () => {
    expect(appSource).toContain("if (banca && !liberado(cfg.buyIn, banca.saldo)) return;");
    // o return vem ANTES de iniciar o torneio
    const guarda = appSource.indexOf("if (banca && !liberado(cfg.buyIn, banca.saldo)) return;");
    const inicio = appSource.indexOf("startTournament(cfg);\n            setView(\"play\");");
    expect(guarda).toBeGreaterThan(-1);
    expect(guarda).toBeLessThan(inicio);
  });

  it("a inscrição é debitada ao começar", () => {
    expect(appSource).toContain("debitarInscricao(cfg.buyIn)");
  });

  it("o prêmio é creditado uma vez só, sob o mesmo guarda do resultado", () => {
    expect(appSource).toContain("creditarPremio(s.cash)");
    const guarda = appSource.indexOf("summaryRef.current = key;");
    const credito = appSource.indexOf("creditarPremio(s.cash)");
    const fim = appSource.indexOf("addTournamentResult({");
    expect(guarda).toBeLessThan(credito);
    expect(credito).toBeLessThan(fim);
  });

  it("a faixa acima da banca fica travada e explica por quê", () => {
    expect(tourSource).toContain("bancaPermite");
    expect(tourSource).toContain("faltaParaLiberar");
    expect(tourSource).toContain("🏦");
  });

  it("sem banca ligada o app volta a ser o de antes — nada fica travado", () => {
    expect(tourSource).toContain("const bancaPermite = (v: number) => !banca || liberado(v, banca.saldo);");
  });
});

describe("A linha da ruína", () => {
  it("mostra a chance de zerar ANTES da inscrição, não depois", () => {
    expect(stripCodigo).toContain("retratoDaRuina");
    expect(stripCodigo).toContain("chance de zerar");
    expect(stripCodigo).toContain("buy-ins</b> de reserva");
  });

  it("fora da faixa medida fala em 'mais de' / 'menos de', não num número exato", () => {
    expect(stripCodigo).toContain("dentroDaFaixaMedida");
    expect(stripCodigo).toContain("mais de");
    expect(stripCodigo).toContain("menos de");
  });
});

describe("A tira da banca é honesta sobre a própria regra", () => {
  it("diz que 100 é a regra de bolso e mostra o número medido", () => {
    expect(stripSource).toContain("RESERVA_MEDIDA_ALLAN");
    expect(stripSource).toContain("regra de bolso");
  });

  it("recomeçar e desligar pedem confirmação — são destrutivos", () => {
    const recomecar = stripSource.indexOf("Recomeçar a banca em");
    const desligar = stripSource.indexOf("Desligar a regra?");
    expect(recomecar).toBeGreaterThan(-1);
    expect(desligar).toBeGreaterThan(-1);
    expect(stripSource.match(/confirm\(/g)?.length).toBe(2);
  });

  it("não promete lucro nem sugere dinheiro de verdade entrando ou saindo", () => {
    // ⚠️ "dinheiro real" NÃO entra nesta lista: a tira usa a frase para dizer
    // que NÃO há dinheiro real em jogo, que é o oposto do risco. O que não pode
    // existir é promessa de ganho ou linguagem de saque.
    for (const proibido of ["lucro garantido", "sacar", "retirada", "depositar", "depósito"]) {
      expect(stripCodigo).not.toContain(proibido);
    }
    expect(stripSource).toContain("não há\n        dinheiro real em jogo");
  });
});
