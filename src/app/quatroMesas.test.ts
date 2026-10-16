// ---------------------------------------------------------------------------
// QUATRO MESAS, DE VERDADE.
//
// O teste que importa não é o do registro (mesas.test.ts) — é este: jogar mãos
// em duas mesas, alternando, e provar que os stacks NÃO se misturam. Era
// exatamente isso que o formato antigo (um save por buy-in) não conseguia.
// ---------------------------------------------------------------------------
import { beforeEach, describe, expect, it } from "vitest";
import { GameController } from "./gameController";
import { seededRng } from "../engine/cards";
import { abrirMesa, carregarMesa, fecharMesa, salvarMesa, MAX_MESAS } from "./mesas";
import type { Action } from "../game/engine";

class MemStorage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}
beforeEach(() => {
  (globalThis as unknown as { localStorage: MemStorage }).localStorage = new MemStorage();
});

function acao(g: GameController): Action {
  const la = g.legal();
  const adv = g.computeHeroAdvice();
  const a = adv?.action ?? (la.canCheck ? "check" : "fold");
  if (a === "fold") return la.canCheck ? { type: "check" } : { type: "fold" };
  if (a === "check") return la.canCheck ? { type: "check" } : { type: "fold" };
  if (a === "call") return la.canCall ? { type: "call" } : la.canCheck ? { type: "check" } : { type: "fold" };
  if (!la.canRaise) return la.canCall ? { type: "call" } : la.canCheck ? { type: "check" } : { type: "fold" };
  const to = Math.max(la.minRaiseTo, Math.min(la.maxRaiseTo, g.suggestedRaiseTo() ?? la.minRaiseTo));
  return to >= la.maxRaiseTo ? { type: "allin" } : { type: "raise", to };
}

/** Joga `maos` mãos completas e devolve o controller no handOver. */
function jogar(g: GameController, maos: number): void {
  let feitas = 0;
  for (let passo = 0; passo < 20_000 && feitas < maos; passo++) {
    if (g.tournamentOver) break;
    if (g.phase === "handOver") { g.newHand(); feitas++; continue; }
    if (!g.isHeroTurn()) { g.botStep(); continue; }
    g.heroAct(acao(g));
  }
  // termina a mão corrente para poder salvar
  for (let passo = 0; passo < 20_000; passo++) {
    if (g.tournamentOver || g.phase === "handOver") break;
    if (!g.isHeroTurn()) { g.botStep(); continue; }
    g.heroAct(acao(g));
  }
}

describe("Jogar em duas mesas sem misturar nada", () => {
  it("dois torneios do MESMO buy-in mantêm stacks separados", () => {
    const a = abrirMesa(5)!;
    const b = abrirMesa(5)!;

    // --- mesa A: joga 6 mãos e salva ---
    const g = new GameController({ rng: seededRng(101) });
    g.configureTournament({ buyIn: 5, entrants: 300, stage: "inicio" });
    g.newHand();
    jogar(g, 6);
    const snapA = g.snapshot();
    expect(snapA).not.toBeNull();
    salvarMesa(a.id, snapA!);
    const stackA = snapA!.seats.find((s) => s.isHero)!.stack;

    // --- mesa B: torneio diferente, no mesmo controller ---
    const g2 = new GameController({ rng: seededRng(202) });
    g2.configureTournament({ buyIn: 5, entrants: 300, stage: "inicio" });
    g2.newHand();
    jogar(g2, 6);
    const snapB = g2.snapshot()!;
    salvarMesa(b.id, snapB);
    const stackB = snapB.seats.find((s) => s.isHero)!.stack;

    // --- a prova: cada save guardou o SEU stack ---
    expect(carregarMesa(a.id)!.seats.find((s) => s.isHero)!.stack).toBe(stackA);
    expect(carregarMesa(b.id)!.seats.find((s) => s.isHero)!.stack).toBe(stackB);
  });

  it("restaurar uma mesa devolve o torneio exatamente onde parou", () => {
    const m = abrirMesa(109)!;
    const g = new GameController({ rng: seededRng(303) });
    g.configureTournament({ buyIn: 109, entrants: 300, stage: "inicio" });
    g.newHand();
    jogar(g, 8);
    const snap = g.snapshot()!;
    salvarMesa(m.id, snap);
    const antes = {
      stack: snap.seats.find((s) => s.isHero)!.stack,
      campo: snap.tournament.fieldRemaining,
      nivel: snap.tournament.levelIndex,
      bb: snap.blinds.bb,
    };

    // outro controller, como se o app tivesse ido para outra mesa e voltado
    const outro = new GameController({ rng: seededRng(999) });
    outro.restore(carregarMesa(m.id)!);

    const hero = outro.table.players.find((p) => p.isHero)!;
    expect(hero.stack).toBe(antes.stack);
    expect(outro.tournament!.fieldRemaining).toBe(antes.campo);
    expect(outro.tournament!.levelIndex).toBe(antes.nivel);
    expect(outro.table.bigBlind).toBe(antes.bb);
    // E volta pronto para a próxima mão — nunca no meio de uma.
    expect(outro.phase).toBe("handOver");
  });

  it("ir e voltar entre duas mesas não contamina a outra", () => {
    const a = abrirMesa(5)!;
    const b = abrirMesa(11)!;
    const g = new GameController({ rng: seededRng(404) });

    g.configureTournament({ buyIn: 5, entrants: 300, stage: "inicio" });
    g.newHand(); jogar(g, 4);
    salvarMesa(a.id, g.snapshot()!);
    const aDepoisDe4 = g.snapshot()!.seats.find((s) => s.isHero)!.stack;

    // vai para a B (torneio novo), joga, salva
    g.configureTournament({ buyIn: 11, entrants: 300, stage: "inicio" });
    g.newHand(); jogar(g, 4);
    salvarMesa(b.id, g.snapshot()!);

    // volta para a A: tem de estar como foi deixada
    g.restore(carregarMesa(a.id)!);
    expect(g.table.players.find((p) => p.isHero)!.stack).toBe(aDepoisDe4);
    expect(g.tournament!.buyIn).toBe(5);

    // joga mais na A e salva — a B não pode mudar
    const bAntes = carregarMesa(b.id)!.seats.find((s) => s.isHero)!.stack;
    jogar(g, 3);
    salvarMesa(a.id, g.snapshot()!);
    expect(carregarMesa(b.id)!.seats.find((s) => s.isHero)!.stack).toBe(bAntes);
  });

  it("quatro mesas abertas convivem, cada uma com o seu torneio", () => {
    const ids: string[] = [];
    const stacks: number[] = [];
    for (let i = 0; i < MAX_MESAS; i++) {
      const m = abrirMesa([5, 11, 22, 109][i])!;
      ids.push(m.id);
      const g = new GameController({ rng: seededRng(500 + i * 37) });
      g.configureTournament({ buyIn: [5, 11, 22, 109][i], entrants: 300, stage: "inicio" });
      g.newHand(); jogar(g, 3);
      const snap = g.snapshot()!;
      salvarMesa(m.id, snap);
      stacks.push(snap.seats.find((s) => s.isHero)!.stack);
    }
    expect(abrirMesa(5)).toBeNull(); // a quinta não abre
    ids.forEach((id, i) => {
      const snap = carregarMesa(id)!;
      expect(snap.seats.find((s) => s.isHero)!.stack).toBe(stacks[i]);
      expect(snap.tournament.buyIn).toBe([5, 11, 22, 109][i]);
    });
  });

  it("fechar uma mesa não encosta nas outras", () => {
    const a = abrirMesa(5)!, b = abrirMesa(11)!;
    const g = new GameController({ rng: seededRng(606) });
    g.configureTournament({ buyIn: 11, entrants: 300, stage: "inicio" });
    g.newHand(); jogar(g, 3);
    salvarMesa(b.id, g.snapshot()!);
    const bStack = carregarMesa(b.id)!.seats.find((s) => s.isHero)!.stack;

    fecharMesa(a.id);
    expect(carregarMesa(a.id)).toBeNull();
    expect(carregarMesa(b.id)!.seats.find((s) => s.isHero)!.stack).toBe(bStack);
  });
});
