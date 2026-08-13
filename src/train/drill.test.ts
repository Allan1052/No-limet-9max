// ---------------------------------------------------------------------------
// Testes do Drill Mode — validação da lógica.
// ---------------------------------------------------------------------------
import { describe, it, expect } from "vitest";
import {
  createDrillSession,
  answerDrillHand,
  computeDrillResult,
  generateDrillHand,
  DRILL_PRESETS,
  recordDrillResult,
} from "./drill";

describe("Drill Mode", () => {
  it("deve ter 8 presets disponíveis", () => {
    expect(DRILL_PRESETS.length).toBe(8);
  });

  it("deve gerar 30 mãos por sessão (default)", () => {
    const session = createDrillSession("btn_open", 30, () => 0.5);
    expect(session.hands.length).toBe(30);
    expect(session.currentIndex).toBe(0);
    expect(session.done).toBe(false);
  });

  it("deve gerar mão válida com 2 cartas", () => {
    const preset = DRILL_PRESETS[0];
    const spot = preset.build(() => 0.5);
    const hand = generateDrillHand(spot, () => 0.5);
    expect(hand.hand.length).toBe(2);
    expect(hand.advice.action).toBeDefined();
    expect(hand.advice.reason).toBeDefined();
  });

  it("btn_open deve ter heroPosition BTN", () => {
    const preset = DRILL_PRESETS.find((p) => p.id === "btn_open")!;
    const spot = preset.build();
    expect(spot.heroPosition).toBe("BTN");
    expect(spot.type).toBe("open");
  });

  it("bb_defense deve ter heroPosition BB e raiserPosition definido", () => {
    const preset = DRILL_PRESETS.find((p) => p.id === "bb_defense")!;
    const spot = preset.build();
    expect(spot.heroPosition).toBe("BB");
    expect(spot.raiserPosition).toBeDefined();
    expect(spot.type).toBe("vsOpen");
  });

  it("push_fold_sb deve ter effectiveBB entre 8 e 14", () => {
    const preset = DRILL_PRESETS.find((p) => p.id === "push_fold_sb")!;
    const spot = preset.build();
    expect(spot.effectiveBB).toBeGreaterThanOrEqual(8);
    expect(spot.effectiveBB).toBeLessThanOrEqual(14);
    expect(spot.type).toBe("pushFold");
  });

  it("deve responder mãos e acumular acertos", () => {
    const session = createDrillSession("btn_open", 30, () => 0.5);
    let correctCount = 0;
    for (let i = 0; i < 30; i++) {
      const result = answerDrillHand(session, "fold"); // fold genérico
      if (result.correct) correctCount++;
    }
    expect(session.done).toBe(true);
    expect(session.currentIndex).toBe(30);
    expect(session.correctCount).toBe(correctCount);
  });

  it("deve calcular resultado final com mastery", () => {
    const session = createDrillSession("btn_open", 30, () => 0.5);
    // Responder todas com fold
    for (let i = 0; i < 30; i++) {
      answerDrillHand(session, "fold");
    }
    const result = computeDrillResult(session);
    expect(result.totalHands).toBe(30);
    expect(result.accuracy).toBeGreaterThanOrEqual(0);
    expect(result.accuracy).toBeLessThanOrEqual(100);
    expect(["beginner", "intermediate", "advanced", "master"]).toContain(result.mastery);
  });

  it("localStorage persiste progresso do drill", () => {
    // Mock localStorage
    const store: Record<string, string> = {};
    const mock = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { for (const k of Object.keys(store)) delete store[k]; },
      length: Object.keys(store).length,
      key: () => null,
    };
    const original = globalThis.localStorage;
    globalThis.localStorage = mock as unknown as Storage;

    const progress = recordDrillResult("btn_open", 85, "advanced");
    expect(progress["btn_open"].attempts).toBe(1);
    expect(progress["btn_open"].lastAccuracy).toBe(85);
    expect(progress["btn_open"].bestAccuracy).toBe(85);
    expect(progress["btn_open"].mastery).toBe("advanced");

    // Segunda tentativa
    const progress2 = recordDrillResult("btn_open", 92, "master");
    expect(progress2["btn_open"].attempts).toBe(2);
    expect(progress2["btn_open"].bestAccuracy).toBe(92);
    expect(progress2["btn_open"].mastery).toBe("master");

    globalThis.localStorage = original;
  });

  it("vs_three_bet deve ter raiserPosition definido", () => {
    const preset = DRILL_PRESETS.find((p) => p.id === "vs_three_bet")!;
    const spot = preset.build();
    expect(spot.raiserPosition).toBeDefined();
    expect(spot.type).toBe("vsThreeBet");
  });
});
