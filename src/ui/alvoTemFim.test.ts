// ---------------------------------------------------------------------------
// O ALVO TEM FIM — e é isso que estes testes guardam.
//
// O app já tinha streak, missões, campanha, XP, conquistas, progresso e
// maestria. Toda peça nova tende a virar mais um loop infinito; o alvo só
// resolve o problema do Allan (*"começo e não termino"*) enquanto continuar
// sendo a exceção. Estes testes existem para que um refactor futuro não
// transforme o alvo em mais uma streak sem ninguém perceber.
// ---------------------------------------------------------------------------
import { beforeEach, describe, expect, it } from "vitest";
// @ts-ignore — disponível no ambiente Node/Vitest; o projeto não declara @types/node no build.
import { readFileSync } from "node:fs";
import { GameController } from "../app/gameController";
import { seededRng } from "../engine/cards";
import { SPOTS_DO_ALVO, carregarAlvo, comecarAlvo } from "../train/alvo";
import type { Action } from "../game/engine";

/**
 * Tira comentários antes de procurar texto proibido. Sem isto o teste lê a
 * PROSA que explica a regra ("nada recomeça sozinho") como se fosse violação
 * dela — foi o que aconteceu na primeira execução.
 */
function semComentarios(src: string): string {
  return src
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, " ") // {/* comentário JSX */}
    .replace(/\/\*[\s\S]*?\*\//g, " ") // /* bloco */
    .replace(/^[ \t]*\/\/.*$/gm, " "); // // linha
}

const cardSource = readFileSync(new URL("./AlvoCard.tsx", import.meta.url), "utf8");
const cardCodigo = semComentarios(cardSource);
const hojeSource = readFileSync(new URL("./HojeView.tsx", import.meta.url), "utf8");
const controllerSource = readFileSync(new URL("../app/gameController.ts", import.meta.url), "utf8");

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
  clear() { this.data.clear(); }
}

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    value: new MemoryStorage(),
    configurable: true,
  });
});

describe("O card do alvo", () => {
  it("SOME quando o ciclo é encerrado — fim não deixa resíduo na tela", () => {
    expect(cardCodigo).toContain("if (alvo?.fechadoEm) return null;");
  });

  it("só abre ciclo por toque do jogador, nunca sozinho", () => {
    // `comecarAlvo` só pode aparecer dentro de um onClick.
    const chamadas = cardCodigo.match(/comecarAlvo\(\)/g) ?? [];
    expect(chamadas.length).toBe(1);
    expect(cardCodigo).toContain("onClick={() => setAlvo(comecarAlvo())}");
    // E nada de abrir em efeito de montagem.
    expect(cardCodigo).not.toMatch(/useEffect\([^)]*comecarAlvo/);
  });

  it("não propõe o próximo ciclo na tela de fim", () => {
    for (const proibido of ["Começar outro", "Próximo alvo", "Novo ciclo", "Recomeçar"]) {
      expect(cardCodigo).not.toContain(proibido);
    }
  });

  it("não encosta na streak, nas missões nem no XP", () => {
    // O que importa é o que o card IMPORTA e CHAMA — a prosa pode citar.
    for (const proibido of ["train/streak", "app/achievements", "train/campaign", "MissionsPanel"]) {
      expect(cardSource).not.toContain(proibido);
    }
    for (const proibido of ["processXpEvent(", "getTrainingDayStatus(", "recordProgress("]) {
      expect(cardCodigo).not.toContain(proibido);
    }
    // "streak" APARECE no texto visível — o card explica ao jogador que o alvo
    // não vira streak. Isso é cópia, não dependência: o guarda é o import.
  });

  it("mostra o contra-placar — senão o alvo ensinaria a agredir sempre", () => {
    expect(cardCodigo).toContain("escalou demais");
    expect(cardCodigo).toContain("falhasExcesso");
  });

  it("nunca chama de evolução uma diferença dentro do ruído", () => {
    expect(cardCodigo).toContain("ev.saiDoRuido");
    expect(cardCodigo).toContain("dentro do ruído");
  });

  it("o texto da TELA é genérico — o calloufold.com.br é público", () => {
    // O diagnóstico nasceu do histórico do Allan comparado ao do irmão, mas
    // "comparando o seu histórico com o do seu irmão" não quer dizer nada para
    // qualquer outro jogador. O caso particular vive no comentário do motor.
    for (const pessoal of ["seu irmão", "PokerStars", "SharkScope", "Allan"]) {
      expect(cardCodigo).not.toContain(pessoal);
    }
  });

  it("está montado no Hoje, abaixo da mão do dia", () => {
    expect(hojeSource).toContain("<AlvoCard />");
    expect(hojeSource.indexOf("<DailyHand />")).toBeLessThan(hojeSource.indexOf("<AlvoCard />"));
  });
});

describe("O motor alimenta o alvo", () => {
  it("o controller registra cada decisão avaliada", () => {
    expect(controllerSource).toContain("registrarNoAlvo({ adviceFam: item.adviceFam");
  });

  it("jogando de verdade, a barra anda e para no fim", () => {
    comecarAlvo();
    const g = new GameController({ rng: seededRng(20261013) });
    g.configureTournament({ buyIn: 5, entrants: 100, stage: "inicio" });
    g.newHand();

    for (let passo = 0; passo < 30_000; passo++) {
      if (g.tournamentOver) break;
      if (g.phase === "handOver") { g.newHand(); continue; }
      if (!g.isHeroTurn()) { g.botStep(); continue; }
      // Herói sempre ESCALA quando pode — enche o alvo rápido e de propósito.
      const la = g.legal();
      let a: Action;
      if (la.canRaise) {
        const to = Math.max(la.minRaiseTo, Math.min(la.maxRaiseTo, g.suggestedRaiseTo() ?? la.minRaiseTo));
        a = to >= la.maxRaiseTo ? { type: "allin" } : { type: "raise", to };
      } else if (la.canCall) a = { type: "call" };
      else if (la.canCheck) a = { type: "check" };
      else a = { type: "fold" };
      g.heroAct(a);
      const atual = carregarAlvo();
      if (atual?.concluidoEm) break;
    }

    const a = carregarAlvo()!;
    expect(a.decisoes).toBeGreaterThan(0);
    // Nunca passa do tamanho do ciclo, jogue-se o que se jogar.
    expect(a.spots).toBeLessThanOrEqual(SPOTS_DO_ALVO);
    expect(a.escalou).toBeLessThanOrEqual(a.spots);
    // Um herói que só escala acumula contra-placar: a trava está viva.
    expect(a.escalouDemais).toBeGreaterThan(0);
  }, 120_000);
});
