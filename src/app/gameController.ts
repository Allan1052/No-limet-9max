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
import { toBB } from "./format";
import {
  BLIND_LEVELS,
  STAGES,
  prizePool,
  payoutLadder,
  tablePayouts,
  unevenStacks,
  type Stage,
} from "../tournament/structure";

export interface GameOptions {
  smallBlind?: number;
  bigBlind?: number;
  startingStack?: number;
  /** Prêmios do torneio (ativam o ICM nas decisões de all-in pós-flop). */
  payouts?: number[];
}

export interface TournamentConfig {
  buyIn: number;
  entrants: number;
  stage: Stage;
  /** Mãos por nível antes de as blinds subirem (0 = não sobem sozinhas). */
  handsPerLevel?: number;
}

export interface TournamentState {
  buyIn: number;
  entrants: number;
  stage: Stage;
  levelIndex: number;
  prizePool: number;
  ladder: number[];
  handsPerLevel: number;
  handsThisLevel: number;
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
  /** Estado do torneio, se estivermos em modo torneio (senão, sessão cash). */
  tournament: TournamentState | null = null;
  private history: ReplayEvent[] = [];
  private perHand: Record<number, PerHandFlags> = {};
  private payouts?: number[];
  private seatDefs: Array<{ name: string; profileId?: string; isHero?: boolean }>;
  private rng = Math.random;
  private handSeed = 1;

  constructor(opts: GameOptions = {}) {
    const stack = opts.startingStack ?? 3000;
    this.payouts = opts.payouts;
    this.seatDefs = [
      { name: "Você", isHero: true },
      ...PROFILES.map((p) => ({ name: p.name, profileId: p.id })),
    ];
    const seats = this.seatDefs.map((s) => ({ ...s, stack }));
    this.table = createTable(
      { smallBlind: opts.smallBlind ?? 25, bigBlind: opts.bigBlind ?? 50 },
      seats,
      0,
    );
    for (const p of this.table.players) this.stats[p.seat] = emptyStats();
  }

  /**
   * Configura (ou reconfigura) um torneio: define blinds do nível, stacks
   * DESIGUAIS pela média do estágio, prêmios e ICM. Reinicia a sessão.
   */
  configureTournament(cfg: TournamentConfig): void {
    const stageInfo = STAGES[cfg.stage];
    const levelIndex = stageInfo.levelIndex;
    const level = BLIND_LEVELS[levelIndex];
    const pool = prizePool(cfg.buyIn, cfg.entrants);
    const ladder = payoutLadder(cfg.entrants, pool);
    this.payouts = tablePayouts(stageInfo.icm, ladder);

    const avgChips = stageInfo.avgBB * level.bb;
    const stacks = unevenStacks(avgChips, this.seatDefs.length, stageInfo.spread, this.rng, level.bb * 3);
    const seats = this.seatDefs.map((s, i) => ({ ...s, stack: stacks[i] }));

    this.table = createTable({ smallBlind: level.sb, bigBlind: level.bb, ante: level.ante }, seats, 0);
    for (const p of this.table.players) this.stats[p.seat] = emptyStats();
    this.tournament = {
      buyIn: cfg.buyIn,
      entrants: cfg.entrants,
      stage: cfg.stage,
      levelIndex,
      prizePool: pool,
      ladder,
      handsPerLevel: cfg.handsPerLevel ?? 10,
      handsThisLevel: 0,
    };
    this.phase = "handOver";
    this.lastHand = null;
    this.feedback = [];
    this.message = `Torneio configurado — ${stageInfo.label}. Clique em “Nova mão”.`;
  }

  /** Aplica um nível de blind (usado pelo filtro clicável e pela subida automática). */
  setBlindLevel(levelIndex: number): void {
    const idx = Math.max(0, Math.min(BLIND_LEVELS.length - 1, levelIndex));
    const level = BLIND_LEVELS[idx];
    this.table.smallBlind = level.sb;
    this.table.bigBlind = level.bb;
    this.table.ante = level.ante;
    if (this.tournament) {
      this.tournament.levelIndex = idx;
      this.tournament.handsThisLevel = 0;
    }
  }

  /** Inicia uma nova mão (avança o botão, embaralha, distribui). */
  newHand(): void {
    const alive = this.table.players.filter((p) => p.stack > 0).length;
    if (alive < 2) {
      this.message = "Fim da sessão: não há jogadores suficientes com fichas.";
      return;
    }
    if (this.table.handOver && this.table.result) moveButton(this.table);
    // Torneio: sobe o nível de blind a cada `handsPerLevel` mãos (simula o tempo).
    let levelUp = false;
    if (this.tournament && this.tournament.handsPerLevel > 0) {
      this.tournament.handsThisLevel++;
      if (
        this.tournament.handsThisLevel > this.tournament.handsPerLevel &&
        this.tournament.levelIndex < BLIND_LEVELS.length - 1
      ) {
        this.setBlindLevel(this.tournament.levelIndex + 1);
        levelUp = true;
      }
    }
    this.feedback = [];
    this.lastActionLabel = {};
    this.history = [];
    startHand(this.table, freshShuffledDeck(seededRng(this.handSeed++ * 2654435761)));
    if (levelUp) {
      const lv = BLIND_LEVELS[this.tournament!.levelIndex];
      this.message = `Nível subiu: blinds ${lv.sb}/${lv.bb}.`;
    }
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

  /** Rótulo legível de uma ação, com valores em big blinds. */
  private label(action: Action, la: LegalActions): string {
    const bb = this.table.bigBlind;
    switch (action.type) {
      case "fold":
        return "Fold";
      case "check":
        return "Check";
      case "call":
        return `Call ${toBB(la.callAmount, bb)}`;
      case "allin":
        return "All-in";
      case "raise":
        return la.callAmount > 0 ? `Raise ${toBB(action.to, bb)}` : `Aposta ${toBB(action.to, bb)}`;
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
        ? botPreflopAction(this.table, seat, { payouts: this.payouts })
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
      const ctx = preflopContextFor(this.table, seat, BASELINE_PROFILE, { payouts: this.payouts });
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
      bigBlind: this.table.bigBlind,
      result: this.table.result,
    };

    const r = this.table.result;
    const hero = this.table.players[this.heroSeat];
    const heroWin = r?.winningsBySeat[this.heroSeat] ?? 0;
    if (heroWin > 0) {
      this.message = `Você ganhou ${toBB(heroWin, this.table.bigBlind)}.`;
    } else if (hero.status === "folded") {
      this.message = "Você desistiu desta mão.";
    } else {
      this.message = "Você não levou o pote desta mão.";
    }
  }
}
