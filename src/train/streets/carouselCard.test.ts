// ---------------------------------------------------------------------------
// Teste do histórico completo da mão para o card de carrossel:
// valida a montagem do actionLog a partir dos ReplayEvents (simulados) e o
// mapeamento de correção (✓/✗) só para ações do herói.
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import type { ActionLogEntry, HandShareData } from "../../app/handShareCard";
import type { HandHistory } from "../../app/replay";
import type { FeedbackItem } from "../../feedback/analyzer";

function ev(
  street: string,
  name: string,
  isHero: boolean,
  actionLabel: string,
): HandHistory["events"][number] {
  return {
    street,
    seat: isHero ? 0 : 1,
    name,
    isHero,
    actionLabel,
    actionType: actionLabel.toLowerCase().split(" ")[0],
    board: [],
    pot: 0,
  };
}

function fb(street: string, heroAction: string, rating: FeedbackItem["rating"]): FeedbackItem {
  return {
    street,
    heroAction,
    advice: "call",
    rating,
    text: "",
  };
}

// Simula a mesma lógica do HandActions: monta o actionLog a partir da mão.
function buildActionLog(
  hand: HandHistory,
  feedback: FeedbackItem[],
): ActionLogEntry[] {
  const streetCorrect = new Map<string, boolean>();
  for (const it of feedback) streetCorrect.set(it.street, it.rating === "boa" || it.rating === "ok");
  return hand.events.map((e) => ({
    who: e.isHero ? "Você" : e.name,
    action: e.actionLabel,
    street: e.street,
    isHero: e.isHero,
    correct: e.isHero ? streetCorrect.get(e.street) : undefined,
  }));
}

describe("card carrossel — actionLog", () => {
  it("preserva a ordem das ações e os valores apostados", () => {
    const hand = {
      events: [
        ev("Pré-Flop", "Você", true, "Raise 2.3bb"),
        ev("Pré-Flop", "Bot1", false, "Call 2.3bb"),
        ev("Flop", "Você", true, "Aposta 3bb"),
        ev("Flop", "Bot1", false, "Call 3bb"),
        ev("Flop", "Você", true, "Check"),
        ev("Turn", "Bot1", false, "Aposta 7bb"),
        ev("Turn", "Você", true, "Call 7bb"),
        ev("River", "Você", true, "Check"),
        ev("River", "Bot1", false, "Aposta 14bb"),
        ev("River", "Você", true, "Fold"),
      ],
      holeCards: {},
      names: { 0: "Você", 1: "Bot1" },
      heroSeat: 0,
      finalBoard: [],
      buttonSeat: 1,
      bigBlind: 1,
    } satisfies HandHistory;

    const feedback: FeedbackItem[] = [
      fb("Flop", "Aposta 3bb", "boa"),
      fb("Turn", "Call 7bb", "boa"),
      fb("River", "Fold", "ok"),
    ];

    const log = buildActionLog(hand, feedback);
    expect(log).toHaveLength(10);
    expect(log[0]).toEqual({ who: "Você", action: "Raise 2.3bb", street: "Pré-Flop", isHero: true, correct: undefined });
    expect(log[3]).toEqual({ who: "Bot1", action: "Call 3bb", street: "Flop", isHero: false, correct: undefined });
    expect(log[6]).toEqual({ who: "Você", action: "Call 7bb", street: "Turn", isHero: true, correct: true });
    expect(log[9]).toEqual({ who: "Você", action: "Fold", street: "River", isHero: true, correct: true });
    // Ações do herói em ruas SEM feedback ficam sem correção (apenas o pré-flop
    // aqui não tem feedback); ações em ruas com feedback herdam a avaliação da
    // rua (o Check do Flop usa a mesma nota da aposta do Flop: "boa").
    expect(log[0].correct).toBeUndefined();
    expect(log[4].correct).toBe(true);
  });

  it("marca errado quando a avaliação da rua é ruim/imprecisa", () => {
    const hand = {
      events: [
        ev("River", "Você", true, "Call 20bb"),
      ],
      holeCards: {},
      names: {},
      heroSeat: 0,
      finalBoard: [],
      buttonSeat: 1,
      bigBlind: 1,
    } satisfies HandHistory;

    const log = buildActionLog(hand, [fb("River", "Call 20bb", "ruim")]);
    expect(log[0].correct).toBe(false);
  });

  it("HandShareData aceita actionLog e o cardType historico requer 3+ ações", () => {
    const data: HandShareData = {
      heroCards: [],
      board: [],
      heroAction: "FOLD",
      coachAction: "FOLD",
      rating: "boa",
      coachTip: "",
      street: "River",
      tournamentInfo: "Teste",
      context: "",
      position: "BTN",
      stackBB: "100bb",
      actionLog: buildActionLog(
        {
          events: [
            ev("Flop", "Você", true, "Aposta 3bb"),
            ev("Flop", "Bot1", false, "Call 3bb"),
            ev("Turn", "Bot1", false, "Aposta 7bb"),
            ev("Turn", "Você", true, "Call 7bb"),
          ],
          holeCards: {},
          names: {},
          heroSeat: 0,
          finalBoard: [],
          buttonSeat: 1,
          bigBlind: 1,
        } satisfies HandHistory,
        [fb("Turn", "Call 7bb", "boa")],
      ),
    };
    expect(data.actionLog!.length).toBe(4);
    // Botão carrossel só aparece com 3+ ações (regra do HandShareButton)
    expect(data.actionLog!.length >= 3).toBe(true);
  });
});
