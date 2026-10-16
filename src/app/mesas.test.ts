// ---------------------------------------------------------------------------
// AS MESAS — o registro de até quatro torneios abertos.
//
// O que estes testes guardam, em ordem de importância:
//   1. a migração dos saves antigos (quem já tinha torneio não pode perdê-lo);
//   2. o teto de 4 mesas, no REGISTRO e não só na tela;
//   3. cada mesa manter o seu próprio save, inclusive no MESMO buy-in — que é
//      justamente o que o formato antigo (chaveado por buy-in) não permitia.
// ---------------------------------------------------------------------------
import { beforeEach, describe, expect, it } from "vitest";
import {
  MAX_MESAS,
  abrirMesa,
  carregarMesa,
  fecharMesa,
  listarMesas,
  mesaKey,
  mesaMaisApertada,
  mesasVivas,
  migrarSlotsAntigos,
  proximaMesa,
  salvarMesa,
} from "./mesas";
import { saveSlot, listSlots } from "./tournamentSlots";
import type { GameSnapshot } from "./gameController";

class MemStorage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}

function snap(buyIn: number, heroStack = 5000, bb = 50, savedAt = "2026-10-16T10:00:00Z"): GameSnapshot {
  return {
    v: 1,
    seats: [{ name: "Você", isHero: true, stack: heroStack }],
    buttonSeat: 0,
    blinds: { sb: bb / 2, bb, ante: 0 },
    stats: {},
    tournament: {
      buyIn, entrants: 500, stage: "meio", levelIndex: 2, prizePool: 5000,
      ladder: [1000], handsPerLevel: 12, handsThisLevel: 3,
      fieldRemaining: 200, bubbleBurst: false,
    },
    heroRatings: { boa: 0, ok: 0, imprecisa: 0, ruim: 0 },
    sessionMistakes: [], sessionFeedbackFree: [], sessionFeedbackTechnical: [],
    tournamentResult: null, tournamentFinishPlace: null, savedAt,
  } as unknown as GameSnapshot;
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: MemStorage }).localStorage = new MemStorage();
});

describe("A migração não pode perder torneio de ninguém", () => {
  it("move os saves antigos (um por buy-in) para mesas, e some com os antigos", () => {
    saveSlot(snap(5));
    saveSlot(snap(22));
    expect(listSlots()).toHaveLength(2);

    expect(migrarSlotsAntigos()).toBe(2);

    const mesas = listarMesas();
    expect(mesas).toHaveLength(2);
    expect(mesas.map((m) => m.buyIn).sort((a, b) => a - b)).toEqual([5, 22]);
    // o save veio junto, não só a entrada no registro
    for (const m of mesas) expect(carregarMesa(m.id)?.tournament.buyIn).toBe(m.buyIn);
    // e o formato antigo foi limpo, para não migrar de novo nem duplicar
    expect(listSlots()).toHaveLength(0);
  });

  it("roda UMA vez só", () => {
    saveSlot(snap(5));
    expect(migrarSlotsAntigos()).toBe(1);
    saveSlot(snap(11));
    expect(migrarSlotsAntigos()).toBe(0);
    expect(listarMesas()).toHaveLength(1);
  });

  it("sem save antigo nenhum, não inventa mesa", () => {
    expect(migrarSlotsAntigos()).toBe(0);
    expect(listarMesas()).toHaveLength(0);
  });
});

describe("O teto de quatro mesas", () => {
  it("abre até MAX_MESAS e recusa a quinta", () => {
    for (let i = 0; i < MAX_MESAS; i++) expect(abrirMesa(5)).not.toBeNull();
    expect(abrirMesa(5)).toBeNull();
    expect(listarMesas()).toHaveLength(MAX_MESAS);
  });

  it("fechar uma libera vaga", () => {
    const abertas = [];
    for (let i = 0; i < MAX_MESAS; i++) abertas.push(abrirMesa(5)!);
    expect(abrirMesa(11)).toBeNull();
    fecharMesa(abertas[0].id);
    expect(abrirMesa(11)).not.toBeNull();
    expect(listarMesas()).toHaveLength(MAX_MESAS);
  });

  it("fechar apaga o save junto — mesa fechada não deixa lixo", () => {
    const m = abrirMesa(5)!;
    salvarMesa(m.id, snap(5));
    expect(carregarMesa(m.id)).not.toBeNull();
    fecharMesa(m.id);
    expect(carregarMesa(m.id)).toBeNull();
    expect(localStorage.getItem(mesaKey(m.id))).toBeNull();
  });
});

describe("Cada mesa tem o SEU save — inclusive no mesmo buy-in", () => {
  it("dois torneios de $5 não se sobrescrevem (o bug do formato antigo)", () => {
    const a = abrirMesa(5)!;
    const b = abrirMesa(5)!;
    expect(a.id).not.toBe(b.id);
    salvarMesa(a.id, snap(5, 3000));
    salvarMesa(b.id, snap(5, 9000));
    expect(carregarMesa(a.id)!.seats[0].stack).toBe(3000);
    expect(carregarMesa(b.id)!.seats[0].stack).toBe(9000);
  });

  it("mesasVivas lê o estado de cada save e calcula o stack em bb", () => {
    const a = abrirMesa(5)!;
    const b = abrirMesa(109)!;
    salvarMesa(a.id, snap(5, 1200, 100));
    const vivas = mesasVivas();
    const va = vivas.find((m) => m.id === a.id)!;
    const vb = vivas.find((m) => m.id === b.id)!;
    expect(va.temSave).toBe(true);
    expect(va.heroBB).toBe(12);
    expect(va.stage).toBe("meio");
    // mesa aberta e ainda sem mão jogada não tem save — e isso não é erro
    expect(vb.temSave).toBe(false);
    expect(vb.heroBB).toBeUndefined();
  });
});

describe("Navegar entre as mesas", () => {
  it("com uma mesa só não há para onde pular", () => {
    const m = abrirMesa(5)!;
    expect(proximaMesa(m.id)).toBeUndefined();
    expect(proximaMesa(null)).toBeUndefined();
  });

  it("gira em roda e volta ao começo", () => {
    const a = abrirMesa(5)!, b = abrirMesa(11)!, c = abrirMesa(22)!;
    expect(proximaMesa(a.id)!.id).toBe(b.id);
    expect(proximaMesa(b.id)!.id).toBe(c.id);
    expect(proximaMesa(c.id)!.id).toBe(a.id);
  });

  it("de uma mesa que já não existe, cai na primeira", () => {
    const a = abrirMesa(5)!;
    abrirMesa(11);
    expect(proximaMesa("fantasma")!.id).toBe(a.id);
  });

  it("aponta a mesa mais apertada — a que tem menos big blinds", () => {
    const a = abrirMesa(5)!, b = abrirMesa(11)!, c = abrirMesa(22)!;
    salvarMesa(a.id, snap(5, 4000, 100));   // 40bb
    salvarMesa(b.id, snap(11, 700, 100));   // 7bb
    salvarMesa(c.id, snap(22, 2500, 100));  // 25bb
    expect(mesaMaisApertada()!.id).toBe(b.id);
  });

  it("sem nenhuma mesa com save, não aponta nada", () => {
    abrirMesa(5);
    expect(mesaMaisApertada()).toBeUndefined();
  });
});
