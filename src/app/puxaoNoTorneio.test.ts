// ---------------------------------------------------------------------------
// O PUXÃO DE ORELHA jogando de verdade.
//
// Os testes de `feedback/puxaoDeOrelha.test.ts` cobrem a régua com janelas
// montadas à mão. Estes aqui jogam torneios inteiros no motor e cobram as duas
// pontas que importam para o Allan:
//   - jogando passivo demais, o aviso CHEGA;
//   - jogando no padrão, o app CALA A BOCA.
// Sem a segunda metade o aviso vira ruído e ele desliga.
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import { GameController } from "./gameController";
import { seededRng } from "../engine/cards";
import {
  MAX_AVISOS_POR_TORNEIO,
  JANELA_DE_SPOTS,
  FALHAS_PARA_PUXAO,
} from "../feedback/puxaoDeOrelha";
import type { Action } from "../game/engine";
import type { Puxao } from "../feedback/puxaoDeOrelha";

type Jeito = "passivo" | "padrao" | "agressivo";

function acao(g: GameController, jeito: Jeito): Action {
  const la = g.legal();
  if (jeito === "passivo") {
    // ⚠️ NÃO é uma calling station. A primeira versão deste teste pagava tudo
    // e o herói bustava em 4 a 6 mãos (medido) — nunca chegava aos spots.
    // O vazamento do Allan é outro: ele SOBREVIVE bem (ITM 23,5%, 57,8% do
    // campo) e não escala. Então aqui o herói joga o PADRÃO em tudo, menos
    // quando o padrão manda escalar: aí ele paga ou dá check.
    const adv = g.computeHeroAdvice();
    const a = adv?.action ?? (la.canCheck ? "check" : "fold");
    if (a === "raise" || a === "allin") {
      if (la.canCall) return { type: "call" };
      return la.canCheck ? { type: "check" } : { type: "fold" };
    }
    if (a === "fold") return la.canCheck ? { type: "check" } : { type: "fold" };
    if (a === "check") return la.canCheck ? { type: "check" } : { type: "fold" };
    return la.canCall ? { type: "call" } : la.canCheck ? { type: "check" } : { type: "fold" };
  }
  if (jeito === "agressivo") {
    if (la.canRaise) {
      const to = Math.max(la.minRaiseTo, Math.min(la.maxRaiseTo, g.suggestedRaiseTo() ?? la.minRaiseTo));
      return to >= la.maxRaiseTo ? { type: "allin" } : { type: "raise", to };
    }
    if (la.canCall) return { type: "call" };
    return la.canCheck ? { type: "check" } : { type: "fold" };
  }
  const adv = g.computeHeroAdvice();
  const a = adv?.action ?? (la.canCheck ? "check" : "fold");
  if (a === "fold") return la.canCheck ? { type: "check" } : { type: "fold" };
  if (a === "check") return la.canCheck ? { type: "check" } : { type: "fold" };
  if (a === "call") return la.canCall ? { type: "call" } : la.canCheck ? { type: "check" } : { type: "fold" };
  if (!la.canRaise) return la.canCall ? { type: "call" } : la.canCheck ? { type: "check" } : { type: "fold" };
  const to = Math.max(la.minRaiseTo, Math.min(la.maxRaiseTo, g.suggestedRaiseTo() ?? la.minRaiseTo));
  return to >= la.maxRaiseTo ? { type: "allin" } : { type: "raise", to };
}

function jogar(jeito: Jeito, semente: number, dicasLigadas = true): Puxao[] {
  const g = new GameController({ rng: seededRng(semente) });
  g.setDicasLigadas(dicasLigadas);
  g.configureTournament({ buyIn: 109, entrants: 300, stage: "inicio" });
  g.newHand();
  const puxoes: Puxao[] = [];
  for (let passo = 0; passo < 40_000; passo++) {
    if (g.tournamentOver) break;
    if (g.phase === "handOver") {
      const p = g.consumirPuxaoDeOrelha();
      if (p) puxoes.push(p);
      g.newHand();
      continue;
    }
    if (!g.isHeroTurn()) { g.botStep(); continue; }
    g.heroAct(acao(g, jeito));
  }
  const ultimo = g.consumirPuxaoDeOrelha();
  if (ultimo) puxoes.push(ultimo);
  return puxoes;
}

describe("O puxão de orelha num torneio de verdade", () => {
  it("jogando passivo demais, o aviso CHEGA", () => {
    // Várias sementes: o aviso depende de o torneio durar o bastante e de o
    // stack encurtar — uma mão azarada não pode derrubar o teste.
    const comAviso = [11, 22, 33, 44].filter(
      (sem) => jogar("passivo", sem).some((p) => p.tipo === "passivo"),
    );
    expect(comAviso.length).toBeGreaterThan(0);
  }, 240_000);

  it("o texto do aviso carrega os números que o sustentam", () => {
    for (const sem of [11, 22, 33, 44]) {
      const p = jogar("passivo", sem).find((x) => x.tipo === "passivo");
      if (!p) continue;
      expect(p.base.olhados).toBeGreaterThanOrEqual(JANELA_DE_SPOTS);
      expect(p.base.falhas).toBeGreaterThanOrEqual(FALHAS_PARA_PUXAO);
      expect(p.texto).toContain(String(p.base.olhados));
      expect(p.texto).toMatch(/\d+bb/);
      return;
    }
    throw new Error("nenhuma semente gerou aviso passivo — recalibrar o teste");
  }, 240_000);

  it("jogando no PADRÃO, o app cala a boca", () => {
    for (const sem of [11, 22, 33]) {
      expect(jogar("padrao", sem).filter((p) => p.tipo === "passivo")).toHaveLength(0);
    }
  }, 240_000);

  it("nunca passa do teto de avisos por torneio", () => {
    for (const sem of [11, 22, 33, 44]) {
      expect(jogar("passivo", sem).length).toBeLessThanOrEqual(MAX_AVISOS_POR_TORNEIO);
    }
  }, 240_000);

  it("no modo JOGAR SOZINHO não fala — senão contamina a própria medição", () => {
    for (const sem of [11, 22, 33, 44]) {
      expect(jogar("passivo", sem, false)).toHaveLength(0);
    }
  }, 240_000);
});
