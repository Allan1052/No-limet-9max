import { describe, expect, it, vi } from "vitest";
import {
  LEARN_LESSONS,
  isLessonUnlocked,
  recordLesson,
  learnStats,
  loadLearn,
  type LearnProgress,
} from "./learn";

describe("Aprenda do Zero — conteúdo", () => {
  it("tem exatamente 7 lições, cada uma com 5 perguntas e resposta válida", () => {
    expect(LEARN_LESSONS).toHaveLength(7);
    for (const l of LEARN_LESSONS) {
      expect(l.quiz).toHaveLength(5);
      for (const q of l.quiz) {
        expect(q.choices.length).toBeGreaterThanOrEqual(2);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.choices.length);
        expect(q.question.length).toBeGreaterThan(5);
      }
      expect(l.body.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("Aprenda do Zero — progresso e travas", () => {
  const fresh = (): LearnProgress => ({ cleared: [], best: {} });

  it("a primeira lição sempre está destravada", () => {
    expect(isLessonUnlocked(0, fresh())).toBe(true);
  });

  it("lições seguintes ficam trancadas até a anterior ser aprovada", () => {
    expect(isLessonUnlocked(1, fresh())).toBe(false);
    expect(isLessonUnlocked(2, fresh())).toBe(false);

    let p = fresh();
    p = recordLesson(p, LEARN_LESSONS[0].id, 4).progress;
    expect(isLessonUnlocked(1, p)).toBe(true);
    expect(isLessonUnlocked(2, p)).toBe(false);

    p = recordLesson(p, LEARN_LESSONS[1].id, 3).progress;
    expect(isLessonUnlocked(2, p)).toBe(true);
  });

  it("acerto abaixo de 3 não destrava a próxima, mas mantém a lição aberta", () => {
    let p = fresh();
    p = recordLesson(p, LEARN_LESSONS[0].id, 2).progress;
    expect(isLessonUnlocked(1, p)).toBe(false);
    expect(p.cleared).toHaveLength(0);
    expect(p.best[LEARN_LESSONS[0].id]).toBe(2);
  });

  it("record de acertos persiste e é o máximo entre tentativas", () => {
    let p = fresh();
    p = recordLesson(p, LEARN_LESSONS[0].id, 3).progress;
    p = recordLesson(p, LEARN_LESSONS[0].id, 5).progress;
    expect(p.best[LEARN_LESSONS[0].id]).toBe(5);
    p = recordLesson(p, LEARN_LESSONS[0].id, 1).progress;
    expect(p.best[LEARN_LESSONS[0].id]).toBe(5);
  });

  it("aprovar reenvio não duplica a lição em cleared", () => {
    let p = fresh();
    p = recordLesson(p, LEARN_LESSONS[0].id, 5).progress;
    p = recordLesson(p, LEARN_LESSONS[0].id, 4).progress;
    expect(p.cleared.filter((id) => id === LEARN_LESSONS[0].id)).toHaveLength(1);
  });

  it("stats reflete lições concluídas", () => {
    let p = fresh();
    p = recordLesson(p, LEARN_LESSONS[0].id, 5).progress;
    expect(learnStats(p)).toEqual({ done: 1, total: 7 });
  });

  it("loadLearn tolera lixo no localStorage (key cof-learn-v1)", () => {
    const store: Record<string, string> = {};
    vi.stubGlobal(
      "localStorage",
      {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = v; },
        removeItem: (k: string) => { delete store[k]; },
      },
    );
    try {
      store["cof-learn-v1"] = "lixo{{invalido";
      expect(loadLearn()).toEqual({ cleared: [], best: {} });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
