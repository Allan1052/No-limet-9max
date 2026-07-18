// ---------------------------------------------------------------------------
// Controlador do jogo (independente de React).
//
// Orquestra uma sessão: cria a mesa com o herói + os 8 perfis, roda os bots
// automaticamente, para na vez do herói, calcula o "conselho" da linha de base
// para cada decisão sua e gera o feedback pós-mão.
//
// A interface só lê o estado e chama `heroAct` / `botStep` / `newHand`.
// ---------------------------------------------------------------------------

import { seededRng } from "../engine/cards";
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

export interface GameOptions {
  smallBlind?: number;
  bigBlind?: number;
  startingStack?: number;
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
  private rng = Math.random;
  private handSeed = 1;

  constructor(opts: GameOptions = {}) {
    const stack = opts.startingStack ?? 3000;
    const seats = [
      { name: "Você", stack, isHero: true },
      ...PROFILES.map((p) => ({ name: p.name, stack, profileId: p.id })),
    ];
    this.table = createTable(
      { smallBlind: opts.smallBlind ?? 25, bigBlind: opts.bigBlind ?? 50 },
      seats,
      0,
    );
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
    startHand(this.table, freshShuffledDeck(seededRng(this.handSeed++ * 2654435761)));
    this.phase = "playing";
    this.message = "";
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

  private applyLabeled(action: Action): void {
    const seat = this.table.toAct;
    const la = legalActions(this.table);
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
        : botPostflopAction(this.table, seat, this.rng, 1500);
    this.applyLabeled(action);
  }

  /** Aplica a ação do herói, avaliando-a antes contra a linha de base. */
  heroAct(action: Action): void {
    if (!this.isHeroTurn()) return;
    const advice = this.computeHeroAdvice();
    if (advice) {
      const streetLabel = STREET_LABEL[this.table.street] ?? this.table.street;
      const heroType = action.type === "raise" ? "raise" : action.type;
      this.feedback.push(gradeDecision(streetLabel, heroType, advice));
    }
    this.applyLabeled(action);
  }

  /** Conselho da linha de base para a decisão atual do herói. */
  computeHeroAdvice(): HeroAdvice | null {
    if (!this.isHeroTurn()) return null;
    if (this.table.street === "preflop") {
      const ctx = preflopContextFor(this.table, this.heroSeat, BASELINE_PROFILE);
      const d = preflopDecision(ctx);
      return { kind: "preflop", action: d.action, reason: d.reason };
    }
    const ctx = postflopContextFor(this.table, this.heroSeat, BASELINE_PROFILE, this.rng, 2500);
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
