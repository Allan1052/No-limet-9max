// ---------------------------------------------------------------------------
// Controlador do jogo (independente de React).
//
// Orquestra uma sessão: cria a mesa com o herói + os 8 perfis, roda os bots
// automaticamente, para na vez do herói, calcula o "conselho" da linha de base
// para cada decisão sua e gera o feedback pós-mão.
//
// A interface só lê o estado e chama `heroAct` / `botStep` / `newHand`.
// ---------------------------------------------------------------------------

import { type Card, cardsToString } from "../engine/cards";
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
import { BASELINE_PROFILE, PROFILES, profileById } from "../bots/profiles";
import { preflopDecision } from "../ranges/preflop";
import { postflopDecision } from "../bots/decision";
import { gradeDecision, type FeedbackItem, type HeroAdvice, type Rating } from "../feedback/analyzer";
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
import { TRANSLATIONS, type TransKey } from "../i18n/translations";
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
import {
  initialFieldRemaining,
  attritionPerHand,
  fieldStatus,
  cashForPlace,
  stageForField,
  type FieldStatus,
} from "../tournament/field";

export type UserSubscriptionLevel = 'free' | 'technical' | 'ultra';

export interface GameOptions {
  userSubscriptionLevel?: UserSubscriptionLevel;
  smallBlind?: number;
  bigBlind?: number;
  startingStack?: number;
  /** Prêmios do torneio (ativam o ICM nas decisões de all-in pós-flop). */
  payouts?: number[];
  /** Chamado a cada decisão sua avaliada (placar de evolução + missões). */
  onDecision?: (d: { rating: Rating; heroType: string; isPreflop: boolean; buyIn?: number }) => void;
  /** Chamado quando o herói recebe cartas numa nova mão. */
  onHeroHand?: () => void;
  /** Chamado quando um torneio termina para o herói (missões de torneio). */
  onTournamentEnd?: (d: { result: "campeao" | "eliminado"; inMoney: boolean }) => void;
  /** Chamado quando a bolha estoura (herói entra no dinheiro) — comemoração. */
  onBubble?: () => void;
  /** Variante do jogo: "holdem" (padrão) ou "omaha" (PLO). */
  variant?: "holdem" | "omaha";

  // ---- Disciplina / progressão ----
  /** Fold pré-flop correto (para VPIP e badges). */
  onPreflopFold?: (chipsSaved: number) => void;
  /** Call avaliado como ruim (para contador de "chips perdidos"). */
  onBadCall?: (chipsLost: number) => void;
  /** C-bet do herói. */
  onCbet?: () => void;
  /** Bot foldou após aposta do herói. */
  onBotFolded?: () => void;
  /** Herói entrou no pote (VPIP++). */
  onHeroVpip?: () => void;
}

export interface TournamentConfig {
  buyIn: number;
  entrants: number;
  stage: Stage;
  /** Mãos por nível antes de as blinds subirem (0 = não sobem sozinhas). */
  handsPerLevel?: number;
  /** Variante: "holdem" (padrão) ou "omaha" (PLO). */
  variant?: "holdem" | "omaha";
  /** Modo curto (10 mãos) para "Omaha no Ônibus". */
  shortMode?: boolean;
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
  /** Jogadores ainda vivos no torneio inteiro (encolhe com o tempo). */
  fieldRemaining: number;
  /** A bolha já estourou (o herói já entrou no dinheiro)? */
  bubbleBurst: boolean;
}

/** Análise de fim de torneio: resultado + estatísticas + notas + erros. */
export interface TournamentSummary {
  result: "eliminado" | "campeao";
  /** Posição final no torneio (1 = campeão). */
  finishPlace: number;
  entrants: number;
  /** Prêmio recebido ($) — 0 se terminou fora do dinheiro. */
  cash: number;
  inMoney: boolean;
  handsPlayed: number;
  vpip: number;
  pfr: number;
  threeBet: number;
  ratings: Record<Rating, number>;
  styleNote: string;
  qualityNote: string;
  mistakes: FeedbackItem[];
  /** Todas as decisões não "boa" (ok+imprecisa+ruim), para filtrar por categoria. */
  review: FeedbackItem[];
}

/** Estado serializável para salvar/retomar um torneio (entre mãos). */
export interface GameSnapshot {
  v: 1;
  seats: Array<{ name: string; profileId?: string; isHero?: boolean; stack: number }>;
  buttonSeat: number;
  blinds: { sb: number; bb: number; ante: number };
  stats: Record<number, PlayerStats>;
  tournament: TournamentState;
  payouts?: number[];
  heroRatings: Record<Rating, number>;
  sessionMistakes: FeedbackItem[];
  tournamentResult: "eliminado" | "campeao" | null;
  tournamentFinishPlace: number | null;
  /** Histórico de mãos jogadas (para o export continuar após retomar). */
  handLog?: HandHistory[];
  /** Variante do jogo salva ("holdem" ou "omaha"). */
  variant?: "holdem" | "omaha";
  savedAt: string;
}

/** Interpola {chaves} num texto (mesma sintaxe do i18n) para o fallback PT. */
function interpolatePt(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
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
  userSubscriptionLevel: UserSubscriptionLevel;

  table: TableState;
  heroSeat = 0;
  phase: "playing" | "handOver" = "handOver";
  feedback: FeedbackItem[] = [];
  /**
   * Mensagem de status do topo. Mantemos o texto em PT (fallback e testes),
   * mas a UI prefere traduzir por `messageKey`/`messageVars` no idioma ativo.
   */
  message: string = TRANSLATIONS.pt["msg.newHandHint"];
  messageKey: TransKey | null = "msg.newHandHint";
  messageVars: Record<string, string | number> | undefined = undefined;
  lastActionLabel: Record<number, string> = {};
  stats: Record<number, PlayerStats> = {};
  /** Histórico da mão anterior, para o replayer. */
  lastHand: HandHistory | null = null;
  /** Log da sessão (mãos jogadas), para exportar e revisar depois. */
  handLog: HandHistory[] = [];
  /** Estado do torneio, se estivermos em modo torneio (senão, sessão cash). */
  tournament: TournamentState | null = null;
  /** Verdadeiro quando o torneio terminou para o herói (mostra a análise). */
  tournamentOver = false;
  private heroRatings: Record<Rating, number> = { boa: 0, ok: 0, imprecisa: 0, ruim: 0 };
  private sessionMistakes: FeedbackItem[] = [];
  // Todas as decisões NÃO "boa" (ok + imprecisa + ruim), para o resumo do
  // torneio deixar clicar em cada categoria e ver as mãos.
  private sessionReview: FeedbackItem[] = [];
  private tournamentResult: "eliminado" | "campeao" | null = null;
  private tournamentFinishPlace: number | null = null;
  private history: ReplayEvent[] = [];
  private handStartStacks: Record<number, number> = {};
  private perHand: Record<number, PerHandFlags> = {};
  private payouts?: number[];
  private seatDefs: Array<{ name: string; profileId?: string; isHero?: boolean }>;
  private rng = Math.random;
  private onDecision?: (d: { rating: Rating; heroType: string; isPreflop: boolean; buyIn?: number }) => void;
  private onHeroHand?: () => void;
  private onTournamentEnd?: (d: { result: "campeao" | "eliminado"; inMoney: boolean }) => void;
  private onBubble?: () => void;
  private onPreflopFold?: (chipsSaved: number) => void;
  private onBadCall?: (chipsLost: number) => void;
  private onCbet?: () => void;
  private onBotFolded?: () => void;
  private onHeroVpip?: () => void;


  constructor(opts: GameOptions = {}) {
    this.userSubscriptionLevel = opts.userSubscriptionLevel ?? 'free';
    const stack = opts.startingStack ?? 3000;
    this.payouts = opts.payouts;
    this.onDecision = opts.onDecision;
    this.onHeroHand = opts.onHeroHand;
    this.onTournamentEnd = opts.onTournamentEnd;
    this.onBubble = opts.onBubble;
    this.onPreflopFold = opts.onPreflopFold;
    this.onBadCall = opts.onBadCall;
    this.onCbet = opts.onCbet;
    this.onBotFolded = opts.onBotFolded;
    this.onHeroVpip = opts.onHeroVpip;
    this.seatDefs = [
      { name: "Você", isHero: true },
      ...PROFILES.map((p) => ({ name: p.name, profileId: p.id })),
    ];
    const seats = this.seatDefs.map((s) => ({ ...s, stack }));
    this.table = createTable(
      { smallBlind: opts.smallBlind ?? 25, bigBlind: opts.bigBlind ?? 50 },
      seats,
      0,
      opts.variant || "holdem",
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

    // A variant do torneio vem do cfg (se fornecido), senão mantém a atual.
    const newVariant = cfg.variant ?? this.table.variant ?? "holdem";
    this.table = createTable(
      { smallBlind: level.sb, bigBlind: level.bb, ante: level.ante },
      seats,
      0,
      newVariant,
    );
    for (const p of this.table.players) this.stats[p.seat] = emptyStats();
    const fieldRemaining = initialFieldRemaining(cfg.entrants, cfg.stage, ladder.length);
    this.tournament = {
      buyIn: cfg.buyIn,
      entrants: cfg.entrants,
      stage: cfg.stage,
      levelIndex,
      prizePool: pool,
      ladder,
      handsPerLevel: cfg.handsPerLevel ?? 10,
      handsThisLevel: 0,
      fieldRemaining,
      bubbleBurst: Math.round(fieldRemaining) <= ladder.length,
    };
    this.phase = "handOver";
    this.lastHand = null;
    this.handLog = [];
    this.feedback = [];
    // Zera a análise acumulada do torneio (notas, erros e resultado).
    this.tournamentOver = false;
    this.heroRatings = { boa: 0, ok: 0, imprecisa: 0, ruim: 0 };
    this.sessionMistakes = [];
    this.sessionReview = [];
    this.tournamentResult = null;
    this.tournamentFinishPlace = null;
    this.setMessage("msg.tourneyConfigured", { stage: stageInfo.label });
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

  /**
   * Reposição estilo GGPoker: cadeiras vazias (bot quebrado) recebem um novo
   * jogador, com stack = média da mesa e um arquétipo sorteado (sem repetir
   * nome ativo). Na MESA FINAL não há reposição — a mesa encolhe até o heads-up.
   * Devolve quantas cadeiras foram repostas.
   */
  private refillSeats(): number {
    // Sem reposição na mesa final (campo global ≤ 9): a mesa encolhe até o
    // heads-up. Antes disso, cadeiras vazias são repostas (table balancing).
    if (this.tournament && Math.round(this.tournament.fieldRemaining) <= 9) return 0;
    const players = this.table.players;
    const withChips = players.filter((p) => p.stack > 0);
    if (withChips.length === 0) return 0;
    const bb = this.table.bigBlind;
    const avgRaw = withChips.reduce((s, p) => s + p.stack, 0) / withChips.length;
    const avg = Math.max(bb * 5, Math.round(avgRaw / bb) * bb);

    let count = 0;
    for (const p of players) {
      if (p.isHero || p.stack > 0) continue;
      const activeIds = new Set(
        players.filter((x) => x.stack > 0 && x.profileId).map((x) => x.profileId),
      );
      const pool = PROFILES.filter((pr) => !activeIds.has(pr.id));
      const chosen = (pool.length ? pool : PROFILES)[Math.floor(this.rng() * (pool.length || PROFILES.length))];
      p.profileId = chosen.id;
      p.name = chosen.name;
      p.stack = avg;
      p.status = "active";
      this.stats[p.seat] = emptyStats(); // jogador novo → estatísticas zeradas
      count++;
    }
    return count;
  }

  /**
   * Define a mensagem de status por chave i18n (a UI traduz no idioma ativo).
   * Também preenche `message` com o PT interpolado — fallback e testes.
   */
  private setMessage(key: TransKey | null, vars?: Record<string, string | number>): void {
    this.messageKey = key;
    this.messageVars = vars;
    this.message = key ? interpolatePt(TRANSLATIONS.pt[key] as string, vars) : "";
  }

  /** Inicia uma nova mão (avança o botão, embaralha, distribui). */
  newHand(): void {
    // Reposição de jogadores (bust → entra outro), exceto na mesa final.
    const refilled = this.refillSeats();
    const hero = this.table.players[this.heroSeat];
    if (hero.stack <= 0) {
      // Herói bustou: termina no lugar = campo restante (é o próximo a cair).
      if (this.tournament) {
        const place = Math.max(1, Math.round(this.tournament.fieldRemaining));
        this.tournamentFinishPlace = place;
        this.tournamentResult = "eliminado";
        this.tournamentOver = true;
        const cash = cashForPlace(place, this.tournament.ladder);
        this.onTournamentEnd?.({ result: "eliminado", inMoney: cash > 0 });
        this.setMessage(cash > 0 ? "msg.bustedItm" : "msg.busted", {
          place,
          entrants: this.tournament.entrants,
        });
      } else {
        this.setMessage("msg.bustedCash");
      }
      return;
    }
    const alive = this.table.players.filter((p) => p.stack > 0).length;
    // Vitória: só o herói tem fichas na mesa final (campo global já ≤ 9).
    if (alive < 2 && (!this.tournament || Math.round(this.tournament.fieldRemaining) <= 9)) {
      if (this.tournament) {
        this.tournamentFinishPlace = 1;
        this.tournamentResult = "campeao";
        this.tournamentOver = true;
        this.onTournamentEnd?.({ result: "campeao", inMoney: true });
      }
      this.setMessage(this.tournament ? "msg.tourneyWon" : "msg.sessionEnd");
      return;
    }
    if (this.table.handOver && this.table.result) moveButton(this.table);
    // Torneio: campo global encolhe a cada mão (gente bustando em outras mesas),
    // sobe o nível de blind e detecta o estouro da bolha.
    let bubbleMsg = false;
    if (this.tournament && Math.round(this.tournament.fieldRemaining) > 9) {
      const busts = attritionPerHand(this.tournament.fieldRemaining, this.tournament.levelIndex);
      let after = this.tournament.fieldRemaining - busts;
      // Não deixa o campo global passar da mesa final por atrito abstrato.
      after = Math.max(9, after);
      this.tournament.fieldRemaining = after;
      const paid = this.tournament.ladder.length;
      if (!this.tournament.bubbleBurst && Math.round(after) <= paid) {
        this.tournament.bubbleBurst = true;
        bubbleMsg = true;
        this.onBubble?.();
      }
    } else if (this.tournament) {
      // Na mesa final o "campo" passa a ser a própria mesa (encolhe de verdade).
      this.tournament.fieldRemaining = this.table.players.filter((p) => p.stack > 0).length;
    }
    // O torneio avança de estágio sozinho conforme o campo encolhe (início →
    // meio → bolha → mesa final) e a pressão de ICM acompanha.
    if (this.tournament) {
      const newStage = stageForField(
        this.tournament.fieldRemaining,
        this.tournament.entrants,
        this.tournament.ladder.length,
      );
      if (newStage !== this.tournament.stage) {
        this.tournament.stage = newStage;
        this.payouts = tablePayouts(STAGES[newStage].icm, this.tournament.ladder);
      }
    }
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
    // Baralho verdadeiramente aleatório a cada mão (sem semente fixa — senão
    // toda sessão repetiria a mesma sequência de cartas e o mesmo vencedor).
    startHand(this.table, freshShuffledDeck());
    // Congela o stack inicial de cada jogador (stack + o que já foi para o pote,
    // ex. blinds/ante) — usado no range por profundidade ao revisar a mão.
    this.handStartStacks = {};
    for (const p of this.table.players) {
      if (p.status !== "out") this.handStartStacks[p.seat] = p.stack + p.totalCommitted;
    }
    // Mensagem do topo: bolha > subida de nível > reposição (a mais relevante).
    if (bubbleMsg) {
      this.setMessage("msg.bubbleBurst");
    } else if (levelUp) {
      const lv = BLIND_LEVELS[this.tournament!.levelIndex];
      this.setMessage("msg.levelUp", { sb: lv.sb, bb: lv.bb });
    } else if (refilled > 0) {
      this.setMessage(refilled === 1 ? "msg.refillOne" : "msg.refillMany", { n: refilled });
    } else {
      this.setMessage(null);
    }
    // Conta a mão para cada jogador que recebeu cartas e zera as flags do turno.
    for (const p of this.table.players) {
      if (p.status !== "out") this.perHand[p.seat] = beginHand(this.stats[p.seat]);
    }
    // Placar de evolução: conta uma mão jogada pelo herói.
    if (this.table.players[this.heroSeat].status !== "out") this.onHeroHand?.();
    this.phase = "playing";
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
    // Bot foldou após aposta do herói (conta para gamificação).
    if (action.type === "fold" && !p.isHero && !this.isHeroTurn()) {
      this.onBotFolded?.();
    }
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
      const item = gradeDecision(streetLabel, this.userSubscriptionLevel, heroType, advice);
      this.feedback.push(item);
      // Acumula a nota para a análise de fim de torneio.
      this.heroRatings[item.rating]++;
      // Alimenta o placar de evolução e as missões.
      this.onDecision?.({
        rating: item.rating,
        heroType,
        isPreflop: this.table.street === "preflop",
        buyIn: this.tournament?.buyIn,
      });
      // ---- Disciplina / progressão ----
      const isPreflop = this.table.street === "preflop";
      // Call ruim = chips perdidos
      if (heroType === "call" && item.rating === "ruim") {
        const lost = totalPot(this.table); // chips já no pote que o herói paga
        this.onBadCall?.(lost);
      }
      // Fold pré-flop correto
      if (heroType === "fold" && isPreflop && (item.rating === "boa" || item.rating === "ok")) {
        const saved = totalPot(this.table); // chips que o herói NÃO pagou
        this.onPreflopFold?.(saved);
      }
      // C-bet (aposta após ter iniciativa pré-flop)
      if (heroType === "raise" && !isPreflop && item.rating === "boa") {
        this.onCbet?.();
      }
      // VPIP: herói entrou no pote (não foldou)
      if (heroType !== "fold" && isPreflop) {
        this.onHeroVpip?.();
      }
      // Guarda os erros claros (ruim/imprecisa) para revisar depois — limita a
      // uma lista enxuta com os mais graves primeiro.
      if (item.rating === "ruim" || item.rating === "imprecisa") {
        this.sessionMistakes.push(item);
      }
      if (item.rating !== "boa") this.sessionReview.push(item);
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
      return { kind: "preflop", action: d.action, reason: d.reason, mix: d.mix };
    }
    const ctx = postflopContextFor(this.table, seat, BASELINE_PROFILE, this.rng, 1500, this.payouts);
    const d = postflopDecision(ctx);
    // EV (em bb) de PAGAR: equity × (pote + call) − call. Foldar vale 0. Só quando
    // há uma aposta para pagar (senão não há decisão de preço).
    const bb = this.table.bigBlind || 1;
    const evBB =
      ctx.toCall > 0
        ? (d.equity * (ctx.potSize + ctx.toCall) - ctx.toCall) / bb
        : undefined;
    return {
      kind: "postflop",
      action: d.action,
      reason: d.reason,
      equity: d.equity,
      potOdds: d.requiredEquity || undefined,
      villainRangePct: d.villainRangePct,
      mix: d.mix,
      evBB,
    };
  }

  /**
   * Análise da forma como o herói jogou o torneio: resultado, quantas mãos,
   * métricas próprias (VPIP/PFR/3-bet), leitura do estilo e os erros a rever.
   * Devolve null se não estivermos em torneio.
   */
  tournamentSummary(): TournamentSummary | null {
    if (!this.tournament) return null;
    const s = this.stats[this.heroSeat];
    const row = toRow(this.heroSeat, "Você", true, s);
    const ratings = this.heroRatings;
    const totalGraded = ratings.boa + ratings.ok + ratings.imprecisa + ratings.ruim;

    // Leitura do estilo a partir do VPIP/PFR (referências clássicas de MTT).
    const gap = row.vpip - row.pfr;
    let styleNote: string;
    if (row.hands < 8) {
      styleNote = "Amostra curta — jogue mais mãos para uma leitura confiável do seu estilo.";
    } else if (row.vpip >= 40) {
      styleNote = `Você jogou muito solto (VPIP ${row.vpip}%): entrou em mãos demais. Em MTT, apertar a seleção pré-flop costuma render mais.`;
    } else if (row.vpip <= 15) {
      styleNote = `Você jogou bem apertado (VPIP ${row.vpip}%): sólido, mas dá para roubar mais blinds abrindo um pouco a range em posição.`;
    } else if (gap >= 12) {
      styleNote = `Estilo passivo (VPIP ${row.vpip}% / PFR ${row.pfr}%): você paga bem mais do que aumenta. Tomar a iniciativa (raise em vez de call) tende a ganhar mais potes.`;
    } else {
      styleNote = `Estilo equilibrado (VPIP ${row.vpip}% / PFR ${row.pfr}%): faixa saudável de MTT — seleção de mãos e agressão bem calibradas.`;
    }

    // Qualidade média das decisões avaliadas.
    let qualityNote: string;
    if (totalGraded === 0) {
      qualityNote = "Não houve decisões suas para avaliar (mãos resolvidas antes da sua vez).";
    } else {
      const goodPct = Math.round(((ratings.boa + ratings.ok) / totalGraded) * 100);
      if (ratings.ruim === 0 && ratings.imprecisa <= 1) {
        qualityNote = `Excelente disciplina: ${goodPct}% das suas decisões seguiram o padrão, sem erros claros de EV.`;
      } else if (ratings.ruim <= 1) {
        qualityNote = `Bom no geral: ${goodPct}% das decisões alinhadas, com poucas imprecisões para lapidar.`;
      } else {
        qualityNote = `${goodPct}% das decisões alinhadas, mas houve ${ratings.ruim} erros claros de EV — foque neles abaixo.`;
      }
    }

    // Erros mais graves primeiro (ruim antes de imprecisa), limitado a 5.
    const mistakes = [...this.sessionMistakes]
      .sort((a, b) => (a.rating === "ruim" ? 0 : 1) - (b.rating === "ruim" ? 0 : 1))
      .slice(0, 5);

    const finishPlace =
      this.tournamentFinishPlace ?? Math.max(1, Math.round(this.tournament.fieldRemaining));
    const cash = cashForPlace(finishPlace, this.tournament.ladder);

    return {
      result: this.tournamentResult ?? "eliminado",
      finishPlace,
      entrants: this.tournament.entrants,
      cash,
      inMoney: cash > 0,
      handsPlayed: row.hands,
      vpip: row.vpip,
      pfr: row.pfr,
      threeBet: row.threeBet,
      ratings: { ...ratings },
      styleNote,
      qualityNote,
      mistakes,
      review: [...this.sessionReview],
    };
  }

  /**
   * Situação do herói no CAMPO do torneio agora: vivos restantes, classificação
   * estimada, se está no dinheiro e o prêmio garantido. Null fora de torneio.
   */
  fieldStatus(): FieldStatus | null {
    if (!this.tournament) return null;
    const alive = this.table.players.filter((p) => p.stack > 0);
    const avgStack = alive.length ? alive.reduce((s, p) => s + p.stack, 0) / alive.length : 0;
    return fieldStatus({
      entrants: this.tournament.entrants,
      remaining: this.tournament.fieldRemaining,
      heroStack: this.table.players[this.heroSeat].stack,
      avgStack,
      ladder: this.tournament.ladder,
    });
  }

  /**
   * Snapshot serializável para retomar o torneio depois (sair e voltar). Só faz
   * sentido ENTRE mãos (handOver), quando os stacks estão fechados. Devolve null
   * fora de torneio ou com o torneio já encerrado.
   */
  snapshot(): GameSnapshot | null {
    if (!this.tournament || this.tournamentOver) return null;
    return {
      v: 1,
      seats: this.table.players.map((p) => ({
        name: p.name,
        profileId: p.profileId,
        isHero: p.isHero,
        stack: p.stack,
      })),
      buttonSeat: this.table.buttonSeat,
      blinds: { sb: this.table.smallBlind, bb: this.table.bigBlind, ante: this.table.ante ?? 0 },
      stats: this.stats,
      tournament: this.tournament,
      payouts: this.payouts,
      heroRatings: { ...this.heroRatings },
      sessionMistakes: this.sessionMistakes,
      tournamentResult: this.tournamentResult,
      tournamentFinishPlace: this.tournamentFinishPlace,
      // Guarda as últimas mãos para o export continuar após retomar (limita
      // para o save não crescer demais).
      handLog: this.handLog.slice(-80),
      variant: this.table.variant,
      savedAt: new Date().toISOString(),
    };
  }

  /** Restaura um torneio salvo, pronto para continuar na próxima mão. */
  restore(snap: GameSnapshot): void {
    // Re-deriva o nome pelo profileId (assim renomeações dos perfis chegam
    // também aos torneios salvos antes da mudança). O herói mantém "Você".
    const nameFor = (s: { name: string; profileId?: string; isHero?: boolean }) =>
      s.isHero || !s.profileId ? s.name : profileById(s.profileId).name;
    const seats = snap.seats.map((s) => ({
      name: nameFor(s),
      profileId: s.profileId,
      isHero: s.isHero,
      stack: s.stack,
    }));
    this.seatDefs = snap.seats.map((s) => ({
      name: nameFor(s),
      profileId: s.profileId,
      isHero: s.isHero,
    }));
    this.table = createTable(
      { smallBlind: snap.blinds.sb, bigBlind: snap.blinds.bb, ante: snap.blinds.ante },
      seats,
      snap.buttonSeat,
      snap.variant ?? "holdem",
    );
    this.stats = {};
    for (const p of this.table.players) this.stats[p.seat] = snap.stats[p.seat] ?? emptyStats();
    this.tournament = snap.tournament;
    this.payouts = snap.payouts;
    this.heroRatings = snap.heroRatings;
    this.sessionMistakes = snap.sessionMistakes;
    this.tournamentResult = snap.tournamentResult;
    this.tournamentFinishPlace = snap.tournamentFinishPlace;
    this.tournamentOver = false;
    this.phase = "handOver";
    this.lastHand = null;
    this.handLog = snap.handLog ?? []; // preserva as mãos para o export
    this.feedback = [];
    this.setMessage("msg.tourneyResumed");
  }

  /**
   * Exporta o histórico da sessão em texto legível (estilo hand history), com
   * board, cartas reveladas, sequência de ações e resultado de cada mão. Serve
   * para revisar fora do app ou colar num fórum/coach.
   */
  exportSessionText(): string {
    const lines: string[] = [];
    lines.push(`Call ou Fold — histórico da sessão (${this.handLog.length} mãos)`);
    lines.push(`Exportado em ${new Date().toISOString().slice(0, 16).replace("T", " ")}`);
    lines.push("");
    this.handLog.forEach((h, i) => {
      const bb = h.bigBlind;
      lines.push(`===== Mão ${i + 1} =====`);
      const heroCards = h.holeCards[h.heroSeat];
      if (heroCards) lines.push(`Você: ${cardsToString(heroCards)}`);
      let lastStreet = "";
      for (const ev of h.events) {
        if (ev.street !== lastStreet) {
          lastStreet = ev.street;
          const board = ev.board.length ? ` [${cardsToString(ev.board)}]` : "";
          lines.push(`-- ${ev.street}${board} --`);
        }
        lines.push(`  ${ev.name}${ev.isHero ? " (você)" : ""}: ${ev.actionLabel}`);
      }
      if (h.finalBoard.length) lines.push(`Board final: ${cardsToString(h.finalBoard)}`);
      const r = h.result;
      if (r) {
        const winners = Object.entries(r.winningsBySeat)
          .filter(([, v]) => v > 0)
          .map(([seat, v]) => `${h.names[Number(seat)]} (+${(v / bb).toFixed(1)}bb)`);
        lines.push(`Resultado: ${winners.length ? winners.join(", ") : "—"}${r.showdown ? " (showdown)" : ""}`);
      }
      lines.push("");
    });
    return lines.join("\n");
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
      startingStacks: { ...this.handStartStacks },
      result: this.table.result,
    };
    // Guarda no log da sessão (limita para não crescer sem fim).
    this.handLog.push(this.lastHand);
    if (this.handLog.length > 300) this.handLog.shift();

    const r = this.table.result;
    const hero = this.table.players[this.heroSeat];
    const heroWin = r?.winningsBySeat[this.heroSeat] ?? 0;
    if (heroWin > 0) {
      this.setMessage("msg.wonHand", { amount: toBB(heroWin, this.table.bigBlind) });
    } else if (hero.status === "folded") {
      this.setMessage("msg.foldedHand");
    } else {
      this.setMessage("msg.lostHand");
    }
  }
}
