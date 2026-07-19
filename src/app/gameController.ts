// ---------------------------------------------------------------------------
// Controlador do jogo (independente de React).
//
// Orquestra uma sessão: cria a mesa com o herói + os 8 perfis, roda os bots
// automaticamente, para na vez do herói, calcula o "conselho" da linha de base
// para cada decisão sua e gera o feedback pós-mão.
//
// A interface só lê o estado e chama `heroAct` / `botStep` / `newHand`.
// ---------------------------------------------------------------------------

import { seededRng, type Card } from "../engine/cards";
import {
  createTable,
  startHand,
  applyAction,
  freshShuffledDeck,
  totalPot,
  moveButton,
  type Action,
} from "../game/engine";
import { legalActions, type LegalActions } from "../game/betting";
import type { TableState } from "../game/state";
import { botPreflopAction, preflopContextFor } from "../bots/preflopBot";
import { botPostflopAction, postflopContextFor } from "../bots/postflopBot";
import { BASELINE_PROFILE, PROFILES } from "../bots/profiles";
import { preflopDecision } from "../ranges/preflop";
import { postflopDecision } from "../bots/decision";
import { gradeDecision, type FeedbackItem, type HeroAdvice } from "../feedback/analyzer";
import {
  beginHand,
  emptyStats,
  recordPreflopAction,
  toRow,
  type PerHandFlags,
  type PlayerStats,
  type StatRow,
} from "../feedback/stats";
import type { HandHistory, ReplayEvent } from "./replay";

export interface GameOptions {
  smallBlind?: number;
  bigBlind?: number;
  startingStack?: number;
  /** Prêmios do torneio (ativam o ICM nas decisões de all-in pós-flop). */
  payouts?: number[];
}

const STREET_LABEL: Record<string, string> = {
  preflop: "Pré-flop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
  showdown: "Showdown",
  complete: "Fim",
};

export class GameController {
  table: TableState;
  heroSeat = 0;
  phase: "playing" | "handOver" = "handOver";
  feedback: FeedbackItem[] = [];
  message = "Clique em “Nova mão” para começar.";
  lastActionLabel: Record<number, string> = {};
  stats: Record<number, PlayerStats> = {};
  /** Histórico da mão anterior, para o replayer. */
  lastHand: HandHistory | null = null;
  private history: ReplayEvent[] = [];
  private perHand: Record<number, PerHandFlags> = {};
  private payouts?: number[];
  private rng = Math.random;
  private handSeed = 1;

  constructor(opts: GameOptions = {}) {
    const stack = opts.startingStack ?? 3000;
    this.payouts = opts.payouts;
    const seats = [
      { name: "Você", stack, isHero: true },
      ...PROFILES.map((p) => ({ name: p.name, stack, profileId: p.id })),
    ];
    this.table = createTable(
      { smallBlind: opts.smallBlind ?? 25, bigBlind: opts.bigBlind ?? 50 },
      seats,
      0,
    );
    for (const p of this.table.players) this.stats[p.seat] = emptyStats();
  }

  /** Inicia uma nova mão (avança o botão, embaralha, distribui). */
  newHand(): void {
    const alive = this.table.players.filter((p) => p.stack > 0).length;
    if (alive < 2) {
      this.message = "Fim da sessão: não há jogadores suficientes com fichas.";
      return;
    }
    if (this.table.handOver && this.table.result) moveButton(this.table);
    this.feedback = [];
    this.lastActionLabel = {};
    this.history = [];
    startHand(this.table, freshShuffledDeck(seededRng(this.handSeed++ * 2654435761)));
    // Conta a mão para cada jogador que recebeu cartas e zera as flags do turno.
    for (const p of this.table.players) {
      if (p.status !== "out") this.perHand[p.seat] = beginHand(this.stats[p.seat]);
    }
    this.phase = "playing";
    this.message = "";
  }

  /** Linhas de estatísticas (herói + bots) para exibição. */
  statRows(): StatRow[] {
    return this.table.players
      .filter((p) => this.stats[p.seat])
      .map((p) => toRow(p.seat, p.name, p.isHero, this.stats[p.seat]));
  }

  resetStats(): void {
    for (const p of this.table.players) this.stats[p.seat] = emptyStats();
  }

  get pot(): number {
    return totalPot(this.table);
  }

  isHeroTurn(): boolean {
    return this.phase === "playing" && this.table.toAct === this.heroSeat;
  }

  legal(): LegalActions {
    return legalActions(this.table);
  }

  /** Rótulo legível de uma ação, com valores. */
  private label(action: Action, la: LegalActions): string {
    switch (action.type) {
      case "fold":
        return "Fold";
      case "check":
        return "Check";
      case "call":
        return `Call ${la.callAmount}`;
      case "allin":
        return "All-in";
      case "raise":
        return la.callAmount > 0 ? `Raise ${action.to}` : `Aposta ${action.to}`;
    }
  }

  private applyLabeled(action: Action, advice?: HeroAdvice | null): void {
    const seat = this.table.toAct;
    const la = legalActions(this.table);
    const p = this.table.players[seat];
    // Estatísticas de pré-flop (antes de aplicar, para ler o estado da decisão).
    if (this.table.street === "preflop" && this.perHand[seat]) {
      const facingRaise = this.table.currentBet > this.table.bigBlind;
      recordPreflopAction(this.stats[seat], this.perHand[seat], action.type, facingRaise);
    }
    // Recomendação da linha de base para o replayer (calcula se não veio pronta).
    const ev = advice !== undefined ? advice : this.adviceForSeat(seat);
    this.history.push({
      street: STREET_LABEL[this.table.street] ?? this.table.street,
      seat,
      name: p.name,
      isHero: p.isHero,
      actionLabel: this.label(action, la),
      actionType: action.type,
      board: this.table.board.slice(),
      pot: totalPot(this.table),
      advice: ev
        ? { action: ev.action, reason: ev.reason, equity: ev.equity, potOdds: ev.potOdds }
        : undefined,
    });

    this.lastActionLabel[seat] = this.label(action, la);
    applyAction(this.table, action);
    if (this.table.handOver) this.finishHand();
  }

  /** Executa a ação de UM bot (a UI chama isto com um pequeno atraso). */
  botStep(): void {
    if (this.phase !== "playing" || this.isHeroTurn() || this.table.handOver) return;
    const seat = this.table.toAct;
    const action =
      this.table.street === "preflop"
        ? botPreflopAction(this.table, seat)
        : botPostflopAction(this.table, seat, this.rng, 1500, this.payouts);
    this.applyLabeled(action);
  }

  /** Aplica a ação do herói, avaliando-a antes contra a linha de base. */
  heroAct(action: Action): void {
    if (!this.isHeroTurn()) return;
    const advice = this.adviceForSeat(this.heroSeat);
    if (advice) {
      const streetLabel = STREET_LABEL[this.table.street] ?? this.table.street;
      const heroType = action.type === "raise" ? "raise" : action.type;
      this.feedback.push(gradeDecision(streetLabel, heroType, advice));
    }
    this.applyLabeled(action, advice);
  }

  /** Conselho da linha de base para a decisão atual do herói. */
  computeHeroAdvice(): HeroAdvice | null {
    if (!this.isHeroTurn()) return null;
    return this.adviceForSeat(this.heroSeat);
  }

  /** Recomendação da linha de base (quase-GTO) para o assento que vai agir. */
  private adviceForSeat(seat: number): HeroAdvice | null {
    if (this.table.toAct !== seat || this.table.handOver) return null;
    if (this.table.street === "preflop") {
      const ctx = preflopContextFor(this.table, seat, BASELINE_PROFILE);
      const d = preflopDecision(ctx);
      return { kind: "preflop", action: d.action, reason: d.reason };
    }
    const ctx = postflopContextFor(this.table, seat, BASELINE_PROFILE, this.rng, 1500, this.payouts);
    const d = postflopDecision(ctx);
    return {
      kind: "postflop",
      action: d.action,
      reason: d.reason,
      equity: d.equity,
      potOdds: d.requiredEquity || undefined,
    };
  }

  private finishHand(): void {
    this.phase = "handOver";
    // Congela o histórico da mão para o replayer (modo estudo: revela cartas).
    const holeCards: Record<number, Card[]> = {};
    const names: Record<number, string> = {};
    for (const p of this.table.players) {
      if (p.holeCards.length > 0) holeCards[p.seat] = p.holeCards.slice();
      names[p.seat] = p.name;
    }
    this.lastHand = {
      events: this.history.slice(),
      holeCards,
      names,
      heroSeat: this.heroSeat,
      finalBoard: this.table.board.slice(),
      buttonSeat: this.table.buttonSeat,
      result: this.table.result,
    };

    const r = this.table.result;
    const hero = this.table.players[this.heroSeat];
    const heroWin = r?.winningsBySeat[this.heroSeat] ?? 0;
    if (heroWin > 0) {
      this.message = `Você ganhou ${heroWin} fichas.`;
    } else if (hero.status === "folded") {
      this.message = "Você desistiu desta mão.";
    } else {
      this.message = "Você não levou o pote desta mão.";
    }
  }
}
