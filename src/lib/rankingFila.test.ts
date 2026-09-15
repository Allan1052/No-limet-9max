// ---------------------------------------------------------------------------
// NENHUM PONTO LEGÍTIMO SE PERDE POR CAUSA DA REDE.
// 🐞 15/09/2026 — Allan: "não conseguiu falar com o servidor do ranking e os
// pontos não foram salvos. E não é a primeira vez."
// ---------------------------------------------------------------------------
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  enfileirar,
  pendentes,
  pontosGuardados,
  reenviarPendentes,
  limparFila,
  MAX_NA_FILA,
  VALIDADE_DIAS,
} from "./rankingFila";

function comLocalStorage() {
  const store: Record<string, string> = {};
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  });
}

const DIA = 24 * 60 * 60 * 1000;

describe("fila de reenvio do ranking", () => {
  beforeEach(() => { comLocalStorage(); limparFila(); });

  it("guarda o resultado que não subiu", () => {
    enfileirar("hash-a", 1176, { tier: "baixa" });
    expect(pendentes()).toHaveLength(1);
    expect(pontosGuardados()).toBe(1176);
  });

  it("o MESMO resultado não entra duas vezes", () => {
    enfileirar("hash-a", 1176, { tier: "baixa" });
    enfileirar("hash-a", 1176, { tier: "baixa" });
    enfileirar("hash-a", 1176, { tier: "baixa" });
    expect(pendentes()).toHaveLength(1);
    expect(pontosGuardados()).toBe(1176);
  });

  it("reenvio aceito tira da fila; recusado fica e conta a tentativa", async () => {
    enfileirar("ok", 100, { v: 1 });
    enfileirar("ruim", 200, { v: 2 });
    const r = await reenviarPendentes<{ v: number }>(async (p) => p.v === 1);
    expect(r).toEqual({ tentados: 2, enviados: 1, aindaNaFila: 1 });
    const resto = pendentes<{ v: number }>();
    expect(resto).toHaveLength(1);
    expect(resto[0].id).toBe("ruim");
    expect(resto[0].tentativas).toBe(1);
  });

  it("erro lançado no envio conta como recusa, não derruba o reenvio", async () => {
    enfileirar("a", 100, { v: 1 });
    enfileirar("b", 100, { v: 2 });
    const r = await reenviarPendentes<{ v: number }>(async (p) => {
      if (p.v === 1) throw new Error("rede caiu");
      return true;
    });
    expect(r.enviados).toBe(1);
    expect(pendentes()).toHaveLength(1);
    expect(pendentes()[0].id).toBe("a");
  });

  it("tudo aceito esvazia a fila", async () => {
    enfileirar("a", 100, {});
    enfileirar("b", 200, {});
    const r = await reenviarPendentes(async () => true);
    expect(r.enviados).toBe(2);
    expect(pendentes()).toHaveLength(0);
    expect(pontosGuardados()).toBe(0);
  });

  it("resultado velho sai sozinho (a temporada já virou)", () => {
    const agora = Date.now();
    enfileirar("velho", 100, {}, agora - (VALIDADE_DIAS + 1) * DIA);
    enfileirar("novo", 200, {}, agora);
    const p = pendentes(agora);
    expect(p.map((i) => i.id)).toEqual(["novo"]);
  });

  it("a fila tem teto — mantém os mais novos", () => {
    const agora = Date.now();
    for (let i = 0; i < MAX_NA_FILA + 8; i++) {
      enfileirar(`h${i}`, 10, {}, agora - (MAX_NA_FILA + 8 - i) * 1000);
    }
    const p = pendentes(agora);
    expect(p).toHaveLength(MAX_NA_FILA);
    expect(p[0].id).toBe(`h${MAX_NA_FILA + 7}`); // o mais recente
  });

  it("fila vazia não chama o servidor", async () => {
    const enviar = vi.fn(async () => true);
    const r = await reenviarPendentes(enviar);
    expect(enviar).not.toHaveBeenCalled();
    expect(r).toEqual({ tentados: 0, enviados: 0, aindaNaFila: 0 });
  });

  it("localStorage quebrado não derruba nada", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => { throw new Error("bloqueado"); },
      setItem: () => { throw new Error("bloqueado"); },
      removeItem: () => {},
    });
    expect(() => enfileirar("a", 100, {})).not.toThrow();
    expect(pendentes()).toEqual([]);
    expect(pontosGuardados()).toBe(0);
    await expect(reenviarPendentes(async () => true)).resolves.toEqual({
      tentados: 0, enviados: 0, aindaNaFila: 0,
    });
  });

  it("os parâmetros do envio voltam inteiros — é o que permite reenviar", async () => {
    const params = { nickname: "Allan", tier: "baixa", points: 1176, decisions: [{ hand: "AKs", action: "raise", position: "BTN" }] };
    enfileirar("h", 1176, params);
    let recebido: unknown = null;
    await reenviarPendentes<typeof params>(async (p) => { recebido = p; return true; });
    expect(recebido).toEqual(params);
  });
});
