import { describe, it, expect } from "vitest";
import { cardsFromString, seededRng } from "../engine/cards";
import { preflopDecision } from "./preflop";
import { BASELINE_PROFILE } from "../bots/profiles";

// Regressão do leak do SB pego na auditoria: fora de posição, o SB é
// 3-bet-ou-fold, mas o motor 3-betava LIXO de blefe (K6s, K5s, K3s, Q6s…)
// enquanto FOLDAVA os bons blockers (A5s-A2s, broadways). Motivo: os bons
// blockers caíam na defendRange e, como o SB não flata OOP, viravam fold — e o
// bluffZone só sobrava com os dregs. Agora o 3-bet de blefe usa mãos de blocker
// de verdade e o lixo folda.

function toCards(ht: string): string {
  const hi = ht[0], lo = ht[1];
  if (hi === lo) return `${hi}s${lo}h`;
  return ht.endsWith("s") ? `${hi}s${lo}s` : `${hi}s${lo}h`;
}

function act(ht: string, raiser: string, seed = 7): string {
  const d = preflopDecision({
    heroPosition: "SB",
    hand: cardsFromString(toCards(ht)),
    effectiveBB: 40,
    profile: BASELINE_PROFILE,
    raiserPosition: raiser as never,
    openSizeBB: 2.3,
    rng: seededRng(seed),
  } as never);
  return d.action;
}

describe("defesa do SB (OOP) vs abertura — 3-bet-ou-fold coerente", () => {
  it("NÃO 3-beta lixo suited de blefe (Kx/Qx raggy)", () => {
    for (const junk of ["K6s", "K5s", "K4s", "K3s", "Q8s", "Q7s", "Q6s", "J8s"]) {
      expect(act(junk, "BTN"), `${junk} não deveria 3-betar`).not.toBe("3bet");
    }
  });

  it("os bons blockers viram 3-bet de blefe vs BTN (nunca fold do A5s-A2s)", () => {
    for (const blk of ["A5s", "A4s", "A3s", "A2s"]) {
      expect(act(blk, "BTN"), `${blk} deveria 3-betar (blocker)`).toBe("3bet");
    }
  });

  it("valor premium sempre 3-beta (não flata OOP)", () => {
    for (const v of ["AA", "KK", "QQ", "AKs", "AKo", "AQs", "JJ", "TT"]) {
      expect(act(v, "BTN")).toBe("3bet");
    }
  });

  it("SB não flata OOP — não existe call vs abertura (só 3bet ou fold)", () => {
    const RANKS = "AKQJT98765432".split("");
    const hands: string[] = [];
    for (let i = 0; i < 13; i++) for (let j = 0; j < 13; j++) {
      if (i === j) hands.push(RANKS[i] + RANKS[j]);
      else if (i < j) hands.push(RANKS[i] + RANKS[j] + "s");
      else hands.push(RANKS[j] + RANKS[i] + "o");
    }
    const calls = hands.filter((h) => act(h, "BTN") === "call").length;
    expect(calls).toBe(0);
  });

  it("range de 3-bet do SB vs BTN é mais largo que vs UTG (abridor mais solto)", () => {
    const RANKS = "AKQJT98765432".split("");
    const hands: string[] = [];
    for (let i = 0; i < 13; i++) for (let j = 0; j < 13; j++) {
      if (i === j) hands.push(RANKS[i] + RANKS[j]);
      else if (i < j) hands.push(RANKS[i] + RANKS[j] + "s");
      else hands.push(RANKS[j] + RANKS[i] + "o");
    }
    const count = (raiser: string) => hands.filter((h) => act(h, raiser) === "3bet").length;
    expect(count("BTN")).toBeGreaterThanOrEqual(count("UTG"));
  });
});
