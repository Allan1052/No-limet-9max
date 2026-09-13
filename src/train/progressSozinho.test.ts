// ---------------------------------------------------------------------------
// ONDE VOCÊ VAZA JOGANDO SOZINHO (Etapa 3 do modo sozinho).
//
// A Etapa 1 respondeu "quanto eu acerto sem ajuda". Esta responde "ONDE eu erro
// sem ajuda" — que é o que vira treino. O teste garante as duas coisas que
// importam: o relatório sozinho não mistura decisão assistida, e o histórico
// antigo (sem a marca) continua contando como jogado COM dica.
// ---------------------------------------------------------------------------
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  biggestOpportunity,
  progressReport,
  recordProgress,
  tendenciaSozinho,
} from "./progress";

function gravar(n: number, opts: { semDica: boolean; correct: boolean; bb?: number }) {
  for (let i = 0; i < n; i++) {
    recordProgress({
      kind: "preflop",
      stage: "inicio",
      effectiveBB: opts.bb ?? 50,
      correct: opts.correct,
      semDica: opts.semDica,
    });
  }
}

describe("relatório de progresso separado por sozinho", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    });
  });

  it("o relatório sozinho NÃO conta decisão tomada com a dica na tela", () => {
    gravar(20, { semDica: false, correct: true });
    gravar(20, { semDica: true, correct: false });
    const todos = progressReport().find((b) => b.id === "rua_pre")!;
    const so = progressReport({ somenteSozinho: true }).find((b) => b.id === "rua_pre")!;
    expect(todos.total).toBe(40);
    expect(so.total).toBe(20);
    expect(so.accuracy).toBe(0); // as 20 às cegas foram todas erradas
  });

  it("sem nenhuma decisão às cegas, o relatório sozinho vem vazio (não vem zerado)", () => {
    gravar(30, { semDica: false, correct: true });
    expect(progressReport({ somenteSozinho: true })).toHaveLength(0);
    expect(biggestOpportunity({ somenteSozinho: true })).toBeNull();
  });

  it("aponta o balde mais fraco DAS DECISÕES ÀS CEGAS", () => {
    // Fundo de stack: acerta. Stack curto: erra. Só sozinho.
    gravar(20, { semDica: true, correct: true, bb: 60 });
    gravar(20, { semDica: true, correct: false, bb: 8 });
    const alvo = biggestOpportunity({ somenteSozinho: true })!;
    expect(alvo.id).toBe("stk_curto");
    expect(alvo.label).toContain("curto");
  });

  it("o que o app aponta com ajuda pode ser DIFERENTE do que ele aponta sem — é o ponto", () => {
    gravar(20, { semDica: false, correct: false, bb: 60 }); // com dica erra fundo
    gravar(20, { semDica: true, correct: false, bb: 8 });   // sozinho erra curto
    expect(biggestOpportunity()!.id).not.toBe(biggestOpportunity({ somenteSozinho: true })!.id);
  });

  it("registro ANTIGO (sem a marca) conta como jogado COM dica", () => {
    // Simula o histórico que já existia no aparelho antes de 13/09.
    localStorage.setItem(
      "cof-progress-v1",
      JSON.stringify([{ d: 1, b: "rua_pre", c: 1 }, { d: 1, b: "rua_pre", c: 1 }]),
    );
    expect(progressReport({ somenteSozinho: true })).toHaveLength(0);
  });

  it("a curva do sozinho só existe com as duas janelas", () => {
    expect(tendenciaSozinho()).toBeNull();
    gravar(8, { semDica: true, correct: false });
    expect(tendenciaSozinho(), "uma janela só não é comparação").toBeNull();
    gravar(30, { semDica: true, correct: true });
    const t = tendenciaSozinho()!;
    expect(t).not.toBeNull();
    expect(t.delta).toBe(t.recente - t.anterior);
    expect(t.recente).toBeGreaterThan(t.anterior); // melhorou de verdade
  });

  it("a curva ignora decisão com dica (senão mediria outra coisa)", () => {
    gravar(40, { semDica: true, correct: false });
    gravar(40, { semDica: false, correct: true });
    expect(tendenciaSozinho()!.recente).toBe(0);
  });
});
