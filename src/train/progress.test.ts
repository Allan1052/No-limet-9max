import { beforeEach, describe, expect, it } from "vitest";
import {
  bucketsFor,
  recordProgress,
  progressReport,
  biggestOpportunity,
  resetProgress,
  type ProgressContext,
} from "./progress";

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

const ctx = (over: Partial<ProgressContext> = {}): ProgressContext => ({
  kind: "preflop",
  stage: "inicio",
  effectiveBB: 15,
  correct: true,
  ...over,
});

function recordMany(n: number, over: Partial<ProgressContext> = {}) {
  for (let i = 0; i < n; i++) recordProgress(ctx(over));
}

describe("evolução — baldes de uma decisão", () => {
  it("um lance cai em rua + faixa de stack + estágio", () => {
    const b = bucketsFor(ctx({ effectiveBB: 15, stage: "mesa_final", kind: "preflop" }));
    const ids = b.map((x) => x.id).sort();
    expect(ids).toEqual(["rua_pre", "stg_mesa_final", "stk_1020"].sort());
    // famílias corretas
    expect(b.find((x) => x.id === "stk_1020")!.family).toBe("stack");
    expect(b.find((x) => x.id === "stg_mesa_final")!.family).toBe("estagio");
  });

  it("as faixas de stack seguem os limites (≤12, ≤20, ≤40, 40+)", () => {
    const idFor = (bb: number) => bucketsFor(ctx({ effectiveBB: bb })).find((x) => x.family === "stack")!.id;
    expect(idFor(8)).toBe("stk_curto");
    expect(idFor(15)).toBe("stk_1020");
    expect(idFor(30)).toBe("stk_2040");
    expect(idFor(80)).toBe("stk_fundo");
  });
});

describe("evolução — placar e amostra mínima", () => {
  it("não mostra balde com pouquíssimos dados (< mínimo)", () => {
    recordMany(3, { effectiveBB: 15 }); // 3 decisões só
    const rep = progressReport();
    expect(rep.find((b) => b.id === "stk_1020")).toBeUndefined();
  });

  it("mostra o acerto atual quando há dados suficientes", () => {
    recordMany(6, { effectiveBB: 15, correct: true });
    const rep = progressReport();
    const bucket = rep.find((b) => b.id === "stk_1020");
    expect(bucket).toBeTruthy();
    expect(bucket!.accuracy).toBe(1);
    expect(bucket!.total).toBe(6);
    expect(bucket!.delta).toBeNull(); // amostra insuficiente pra seta
  });

  it("calcula a evolução (recente vs janela anterior) quando há amostra dos dois lados", () => {
    // 25 certas (janela anterior) e depois 25 erradas (janela recente).
    recordMany(25, { effectiveBB: 15, correct: true });
    recordMany(25, { effectiveBB: 15, correct: false });
    const bucket = progressReport().find((b) => b.id === "stk_1020")!;
    expect(bucket.accuracy).toBe(0); // janela recente: 25 erradas
    expect(bucket.delta).toBe(-100); // caiu de 100% pra 0%
  });
});

describe("evolução — maior oportunidade", () => {
  it("aponta o balde de stack/estágio mais fraco", () => {
    // 12–20bb: fraco (muitos erros). Stack fundo: forte.
    recordMany(10, { effectiveBB: 15, correct: false });
    recordMany(10, { effectiveBB: 80, correct: true });
    const opp = biggestOpportunity();
    expect(opp).toBeTruthy();
    expect(opp!.id).toBe("stk_1020");
    expect(opp!.family).not.toBe("rua"); // nunca sugere "pré/pós" como treino
  });

  it("devolve null quando ainda não há amostra suficiente", () => {
    recordMany(3, { effectiveBB: 15, correct: false });
    expect(biggestOpportunity()).toBeNull();
  });

  it("não sugere balde já dominado (acerto alto)", () => {
    recordMany(15, { effectiveBB: 15, correct: true }); // 100% — dominado
    expect(biggestOpportunity()).toBeNull();
  });
});

describe("evolução — reset", () => {
  it("limpa o histórico", () => {
    recordMany(10, { effectiveBB: 15 });
    resetProgress();
    expect(progressReport()).toEqual([]);
  });
});
