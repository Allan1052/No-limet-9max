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
import { seatPositions } from "../bots/seatPosition";
import { botPreflopAction, preflopContextFor } from "../bots/preflopBot";
import { botPostflopAction, postflopContextFor } from "../bots/postflopBot";
import { BASELINE_PROFILE, PROFILES, profileById } from "../bots/profiles";
import { buildFieldSeats, pickReplacement } from "../bots/field";
import { preflopDecision } from "../ranges/preflop";
import { postflopDecision } from "../bots/decision";
import { gradeDecision, type FeedbackContext, type FeedbackItem, type HeroAdvice, type Rating } from "../feedback/analyzer";
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
import { getNickname } from "../lib/nickname";
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
import { recordTournamentWin } from "../tournament/eliteUnlock";
import { freshTilt, updateTilt, decayTilt, type TiltState } from "../bots/tilt";
import type { HeroRead } from "../bots/adapt";
import type { Archetype } from "../bots/profiles";

export type UserSubscriptionLevel = 'free' | 'technical' | 'ultra';

export interface GameOptions {
  userSubscriptionLevel?: UserSubscriptionLevel;
  smallBlind?: number;
  bigBlind?: number;
  startingStack?: number;
  /** Prêmios do torneio (ativam o ICM nas decisões de all-in pós-flop). */
  payouts?: number[];
  /** Chamado a cada decisão sua avaliada (placar de evolução + missões). */
  onDecision?: (d: { rating: Rating; heroType: string; isPreflop: boolean; buyIn?: number; heroBB?: number; facingAllin?: boolean; finalTable?: boolean }) => void;
  /** Chamado quando o herói recebe cartas numa nova mão. */
  onHeroHand?: () => void;
  /** Chamado quando um torneio termina para o herói (missões de torneio). */
  onTournamentEnd?: (d: { result: "campeao" | "eliminado"; inMoney: boolean }) => void;
  /** Chamado quando a bolha estoura (herói entra no dinheiro) — comemoração. */
  onBubble?: () => void;
  /** Chamado quando a MESA FINAL se forma (redraw junta todos) — aviso chamativo. */
  onFinalTable?: (d: { players: number }) => void;
  /** Chamado quando começa o HEADS-UP (2 jogadores) — aviso chamativo. */
  onHeadsUp?: (d: { heroStackBB: number; villainName: string; villainStackBB: number }) => void;
  /** Chamado quando o herói VENCE o torneio — comemoração de campeão. */
  onChampion?: (d: { entrants: number; cash: number }) => void;
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
  /**
   * Modo de jogo. "livre" (padrão) é o Treino Livre: tudo liberado, não pontua.
   * "circuito" é uma etapa oficial do circuito e vale ranking.
   */
  mode?: "livre" | "circuito";
  /** Etapa do circuito (1 a 10), quando mode === "circuito". */
  circuitStage?: number;
}

export interface TournamentState {
  buyIn: number;
  entrants: number;
  stage: Stage;
  /**
   * Estágio em que o torneio COMEÇOU. Diferente de `stage`, que avança sozinho
   * conforme o campo encolhe. Somente torneios iniciados em "inicio" contam para
   * o ranking — regra igual à WSOP: não existe entrar direto na mesa final.
   */
  initialStage?: Stage;
  levelIndex: number;
  prizePool: number;
  ladder: number[];
  handsPerLevel: number;
  handsThisLevel: number;
  /** Jogadores ainda vivos no torneio inteiro (encolhe com o tempo). */
  fieldRemaining: number;
  /** A bolha já estourou (o herói já entrou no dinheiro)? */
  bubbleBurst: boolean;
  /**
   * A mesa final já se formou (o redraw juntou todos numa mesa só)? A partir
   * daí a mesa só ENCOLHE — não repõe cadeira vazia nem move ninguém.
   */
  finalTableFormed?: boolean;
  /** Nº de mesas do torneio (ceil(vivos/9)) — cai conforme mesas quebram. */
  tables?: number;
  /** Nº da mesa atual do herói (cosmético) — muda quando ele é realocado. */
  tableId?: number;
  /** Modo do torneio: Treino Livre ou etapa do Circuito. */
  mode?: "livre" | "circuito";
  /** Etapa do circuito (1 a 10), se for torneio de circuito. */
  circuitStage?: number;
}

/** Análise de fim de torneio: resultado + estatísticas + notas + erros. */
export interface TournamentSummary {
  result: "eliminado" | "campeao";
  /** Posição final no torneio (1 = campeão). */
  finishPlace: number;
  entrants: number;
  /** Buy-in do torneio ($) — usado no cálculo de pontos do ranking. */
  buyIn: number;
  /** Estágio em que o torneio começou — só "inicio" pontua no ranking. */
  initialStage: Stage;
  /** Modo do torneio: só "circuito" grava pontos no ranking. */
  mode: "livre" | "circuito";
  /** Etapa do circuito disputada (1 a 10), quando for circuito. */
  circuitStage?: number;
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
  /** Histórico de TODAS as ações do herói — alimenta a anatomia (Fold/Call/Raise/Re-raise). */
  decisions: Array<{ heroAction: string }>;
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
  sessionFeedbackFree: FeedbackItem[];
  sessionFeedbackTechnical: FeedbackItem[];
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
  /** Feedback gerado no modo Simples (free) — para as abas do modal de dicas. */
  feedbackFree: FeedbackItem[] = [];
  /** Feedback gerado no modo Técnico (technical) — para as abas do modal de dicas. */
  feedbackTechnical: FeedbackItem[] = [];
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
  // Todas as ações do herói na sessão — a "anatomia" de fim de torneio.
  private sessionDecisions: Array<{ heroAction: string }> = [];
  private tournamentResult: "eliminado" | "campeao" | null = null;
  private tournamentFinishPlace: number | null = null;
  private history: ReplayEvent[] = [];
  private handStartStacks: Record<number, number> = {};
  private perHand: Record<number, PerHandFlags> = {};
  /** Estado emocional (tilt) por assento — Camada 2. */
  private tilt: Record<number, TiltState> = {};
  private payouts?: number[];
  private seatDefs: Array<{ name: string; profileId?: string; isHero?: boolean; personalitySeed?: number }>;
  private rng = Math.random;
  private onDecision?: (d: { rating: Rating; heroType: string; isPreflop: boolean; buyIn?: number; heroBB?: number; facingAllin?: boolean; finalTable?: boolean }) => void;
  private onHeroHand?: () => void;
  private onTournamentEnd?: (d: { result: "campeao" | "eliminado"; inMoney: boolean }) => void;
  private onBubble?: () => void;
  private onFinalTable?: (d: { players: number }) => void;
  private onHeadsUp?: (d: { heroStackBB: number; villainName: string; villainStackBB: number }) => void;
  private onChampion?: (d: { entrants: number; cash: number }) => void;
  /** Já anunciou a mesa final / o heads-up? (para disparar só uma vez). */
  private finalTableAnnounced = false;
  private headsUpAnnounced = false;
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
    this.onFinalTable = opts.onFinalTable;
    this.onHeadsUp = opts.onHeadsUp;
    this.onChampion = opts.onChampion;
    this.onPreflopFold = opts.onPreflopFold;
    this.onBadCall = opts.onBadCall;
    this.onCbet = opts.onCbet;
    this.onBotFolded = opts.onBotFolded;
    this.onHeroVpip = opts.onHeroVpip;
    this.seatDefs = [
      { name: this.heroName(), isHero: true },
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
  /** Nome do herói na mesa: o apelido registrado, ou "Você" como padrão. */
  private heroName(): string {
    return getNickname() || "Você";
  }

  configureTournament(cfg: TournamentConfig): void {
    const stageInfo = STAGES[cfg.stage];
    const levelIndex = stageInfo.levelIndex;
    const level = BLIND_LEVELS[levelIndex];
    const pool = prizePool(cfg.buyIn, cfg.entrants);
    const ladder = payoutLadder(cfg.entrants, pool);
    this.payouts = tablePayouts(stageInfo.icm, ladder);

    // Monta o CAMPO conforme o buy-in: micro = mais peixe, alto = mais regular.
    this.seatDefs = [
      { name: this.heroName(), isHero: true },
      ...buildFieldSeats(cfg.buyIn, PROFILES.length, this.rng),
    ];

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
    this.tilt = {}; // zera o estado emocional dos bots (Camada 2)
    const fieldRemaining = initialFieldRemaining(cfg.entrants, cfg.stage, ladder.length);
    this.tournament = {
      buyIn: cfg.buyIn,
      entrants: cfg.entrants,
      stage: cfg.stage,
      initialStage: cfg.stage,
      levelIndex,
      prizePool: pool,
      ladder,
      handsPerLevel: cfg.handsPerLevel ?? 10,
      handsThisLevel: 0,
      fieldRemaining,
      bubbleBurst: Math.round(fieldRemaining) <= ladder.length,
      finalTableFormed: Math.round(fieldRemaining) <= 9,
      tables: Math.max(1, Math.ceil(fieldRemaining / 9)),
      tableId: 1 + Math.floor(this.rng() * Math.max(1, Math.ceil(fieldRemaining / 9))),
      mode: cfg.mode ?? "livre",
      circuitStage: cfg.circuitStage,
    };
    // Avisos chamativos: se já começa na mesa final (Treino Livre), não anuncia
    // a formação dela — só o heads-up quando chegar a 2.
    this.finalTableAnnounced = Math.round(fieldRemaining) <= 9;
    this.headsUpAnnounced = false;
    this.phase = "handOver";
    this.lastHand = null;
    this.handLog = [];
    this.feedback = [];
    this.feedbackFree = [];
    this.feedbackTechnical = [];
    // Zera a análise acumulada do torneio (notas, erros e resultado).
    this.tournamentOver = false;
    this.heroRatings = { boa: 0, ok: 0, imprecisa: 0, ruim: 0 };
    this.sessionMistakes = [];
    this.sessionReview = [];
    this.sessionDecisions = [];
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
  /** Nº da nova mesa quando o herói foi realocado NESTA mão (0 = não moveu). */
  private heroMovedTo = 0;

  /** Stack de um recém-chegado: variado em torno da média (lognormal simples). */
  private variedStack(avg: number): number {
    const bb = this.table.bigBlind || 1;
    const g = this.rng() + this.rng() + this.rng() - 1.5; // ~Normal(0, ~0.29)
    const chips = avg * Math.exp(0.6 * g);
    return Math.max(bb * 3, Math.round(chips / bb) * bb);
  }

  /**
   * Preenche cadeiras vazias (não-herói) até a mesa ter `target` jogadores
   * ativos. Cada novo entra com stack VARIADO em torno de `avgOverride` (ou da
   * média da mesa), como quem vem de outra mesa. Devolve quantos entraram.
   */
  private fillEmptySeats(target: number, avgOverride?: number): number {
    const players = this.table.players;
    const withChips = players.filter((p) => p.stack > 0);
    if (withChips.length === 0 && avgOverride === undefined) return 0;
    const bb = this.table.bigBlind;
    const avgRaw =
      avgOverride ?? withChips.reduce((s, p) => s + p.stack, 0) / Math.max(1, withChips.length);
    const avg = Math.max(bb * 5, Math.round(avgRaw / bb) * bb);
    const usedNames = new Set(players.filter((x) => x.stack > 0 || x.isHero).map((x) => x.name));
    let active = withChips.length;
    let count = 0;
    for (const p of players) {
      if (active >= target) break;
      if (p.isHero || p.stack > 0) continue;
      const rep = pickReplacement(this.tournament?.buyIn, usedNames, this.rng);
      usedNames.add(rep.name);
      p.profileId = rep.profileId;
      p.name = rep.name;
      p.personalitySeed = 1 + Math.floor(this.rng() * 2_000_000_000); // estilo próprio (Camada 1)
      this.tilt[p.seat] = freshTilt(); // adversário novo entra calmo (Camada 2)
      p.stack = this.variedStack(avg);
      p.status = "active";
      this.stats[p.seat] = emptyStats(); // jogador novo → estatísticas zeradas
      active++;
      count++;
    }
    return count;
  }

  /** Equilibra a mesa ao tamanho-alvo: move o excedente e traz quem falta. */
  private balanceToTarget(target: number): number {
    const players = this.table.players;
    let active = players.filter((p) => p.stack > 0).length;
    // Acima do alvo: move o excedente (nunca o herói). Ordem embaralhada.
    if (active > target) {
      const movable = players.filter((p) => !p.isHero && p.stack > 0);
      for (let i = movable.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        [movable[i], movable[j]] = [movable[j], movable[i]];
      }
      for (const p of movable) {
        if (active <= target) break;
        p.stack = 0;
        p.status = "out"; // "moveu de mesa" — o campo global já o conta como vivo
        active--;
      }
    }
    return active < target ? this.fillEmptySeats(target) : 0;
  }

  /**
   * Realoca o HERÓI para uma mesa NOVA (adversários novos), como no online
   * quando a sua mesa quebra. Mantém o stack do herói; os oponentes vêm com
   * stacks variados em torno da média atual. Guarda o nº da mesa para o aviso.
   */
  private reseatHero(target: number, tables: number): number {
    const withChips = this.table.players.filter((p) => p.stack > 0);
    const avg = withChips.reduce((s, p) => s + p.stack, 0) / Math.max(1, withChips.length);
    for (const p of this.table.players) {
      if (p.isHero) continue;
      p.stack = 0;
      p.status = "out";
    }
    const added = this.fillEmptySeats(target, avg);
    // Novo número de mesa, diferente do atual.
    let n = 1 + Math.floor(this.rng() * tables);
    const cur = this.tournament?.tableId ?? 0;
    if (n === cur && tables > 1) n = (n % tables) + 1;
    if (this.tournament) this.tournament.tableId = n;
    this.heroMovedTo = n;
    return added;
  }

  /**
   * Table balancing como no online (GGPoker/PokerStars). Com N vivos há
   * ceil(N/9) mesas de 9-max; cada uma fica com ~ceil(N/mesas) jogadores.
   * Quando o campo encolhe a ponto de caber em MENOS mesas, uma mesa "quebra"
   * e há movimentação: com chance 1/mesas a mesa do herói é a que quebra e ele
   * é REALOCADO (adversários novos); senão, a mesa dele recebe/solta gente para
   * bater o tamanho-alvo. Na mesa final (≤9) faz o redraw e depois só encolhe.
   */
  private refillSeats(): number {
    if (!this.tournament) {
      // Sessão livre (sem torneio): mantém a mesa cheia, como sempre foi.
      return this.fillEmptySeats(9);
    }
    // Mesa final já formada: só ENCOLHE — não repõe cadeira vazia nem move ninguém.
    if (this.tournament.finalTableFormed) return 0;

    const remaining = Math.max(1, Math.round(this.tournament.fieldRemaining));
    const tables = Math.max(1, Math.ceil(remaining / 9));
    const target = Math.min(9, Math.ceil(remaining / tables));
    const prevTables = this.tournament.tables ?? tables;

    // Uma mesa quebrou (o campo agora cabe em menos mesas)? Isso gera
    // movimentação, como no online. Chance de a mesa do herói ser a que quebra
    // = 1/prevTables → ele é realocado. Só com 2+ mesas (fora da mesa final).
    let added: number;
    if (tables < prevTables && tables >= 2 && this.rng() < 1 / prevTables) {
      added = this.reseatHero(target, tables);
    } else {
      added = this.balanceToTarget(target);
    }
    this.tournament.tables = tables;

    const active = this.table.players.filter((p) => p.stack > 0).length;
    if (remaining <= 9 && active >= remaining) {
      this.tournament.finalTableFormed = true;
      if (!this.finalTableAnnounced) {
        this.finalTableAnnounced = true;
        this.onFinalTable?.({ players: active });
      }
    }
    return added;
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
    // Reposição/equilíbrio de mesas (como no online). heroMovedTo é setado
    // dentro de refillSeats quando o herói é realocado para uma mesa nova.
    this.heroMovedTo = 0;
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
        // Desbloqueio de elite: vitória do início com 100+ libera o próximo rolê.
        recordTournamentWin(
          this.tournament.buyIn,
          this.tournament.entrants,
          this.tournament.initialStage ?? this.tournament.stage,
        );
        this.onTournamentEnd?.({ result: "campeao", inMoney: true });
        this.onChampion?.({
          entrants: this.tournament.entrants,
          cash: cashForPlace(1, this.tournament.ladder),
        });
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
      // HEADS-UP: chegou a 2 jogadores — aviso chamativo (só uma vez).
      if (!this.headsUpAnnounced && Math.round(this.tournament.fieldRemaining) === 2) {
        this.headsUpAnnounced = true;
        const hero = this.table.players[this.heroSeat];
        const villain = this.table.players.find((p) => !p.isHero && p.stack > 0);
        const bb = this.table.bigBlind || 1;
        this.onHeadsUp?.({
          heroStackBB: +(hero.stack / bb).toFixed(1),
          villainName: villain?.name ?? "Oponente",
          villainStackBB: +((villain?.stack ?? 0) / bb).toFixed(1),
        });
      }
    }
    // As blinds sobem a cada `handsPerLevel` mãos, como num MTT online: o campo
    // acelera e os stacks encurtam conforme o torneio avança.
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
    this.feedbackFree = [];
    this.feedbackTechnical = [];
    this.lastActionLabel = {};
    this.history = [];
    // Camada 2: atualiza o tilt dos bots com o RESULTADO da mão que acabou
    // (antes de startHand postar as blinds da próxima e mexer nos stacks).
    this.updateTiltAfterHand();
    // Baralho verdadeiramente aleatório a cada mão (sem semente fixa — senão
    // toda sessão repetiria a mesma sequência de cartas e o mesmo vencedor).
    startHand(this.table, freshShuffledDeck());
    // Congela o stack inicial de cada jogador (stack + o que já foi para o pote,
    // ex. blinds/ante) — usado no range por profundidade ao revisar a mão.
    this.handStartStacks = {};
    for (const p of this.table.players) {
      if (p.status !== "out") this.handStartStacks[p.seat] = p.stack + p.totalCommitted;
    }
    // Mensagem do topo: bolha > realocação de mesa > subida de nível > reposição.
    if (bubbleMsg) {
      this.setMessage("msg.bubbleBurst");
    } else if (this.heroMovedTo > 0) {
      this.setMessage("msg.tableMoved", { n: this.heroMovedTo });
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
        ? { action: ev.action, reason: ev.reason, equity: ev.equity, potOdds: ev.potOdds, nBet: ev.nBet }
        : undefined,
    });

    this.lastActionLabel[seat] = this.label(action, la);
    // Bot foldou após aposta do herói (conta para gamificação).
    if (action.type === "fold" && !p.isHero && !this.isHeroTurn()) {
      this.onBotFolded?.();
    }
    const streetBefore = this.table.street;
    applyAction(this.table, action);
    // Virou a rua: as fichas da rua anterior foram recolhidas ao pote, então os
    // rótulos de ação ("Raise 3.3bb" etc.) somem JUNTO com elas — senão ficariam
    // grudados na caixinha do jogador, sobrepondo as apostas da rua seguinte.
    if (!this.table.handOver && this.table.street !== streetBefore) {
      this.lastActionLabel = {};
    }
    if (this.table.handOver) this.finishHand();
  }

  /** Leitura do herói para os bots adaptarem (Camada 3). Precisa de amostra. */
  private heroReadForBots(): HeroRead | undefined {
    const s = this.stats[this.heroSeat];
    if (!s || s.handsDealt < 6) return undefined;
    return {
      hands: s.handsDealt,
      vpip: s.vpip / s.handsDealt,
      pfr: s.pfr / s.handsDealt,
      threeBet: s.threeBetOpp > 0 ? s.threeBet / s.threeBetOpp : 0,
    };
  }

  /** Atualiza o tilt de cada bot pelo resultado da mão anterior (Camada 2). */
  private updateTiltAfterHand(): void {
    for (const p of this.table.players) {
      if (!p.profileId) continue; // só bots
      let next = decayTilt(this.tilt[p.seat] ?? freshTilt());
      const start = this.handStartStacks[p.seat];
      if (start && start > 0 && p.status !== "out") {
        const lossFrac = (start - p.stack) / start;
        next = updateTilt(next, p.profileId as Archetype, lossFrac, lossFrac > 0.35);
      }
      this.tilt[p.seat] = next;
    }
  }

  /** Executa a ação de UM bot (a UI chama isto com um pequeno atraso). */
  botStep(): void {
    if (this.phase !== "playing" || this.isHeroTurn() || this.table.handOver) return;
    const seat = this.table.toAct;
    const buyIn = this.tournament?.buyIn;
    const tilt = this.tilt[seat];
    const heroRead = this.heroReadForBots();
    const action =
      this.table.street === "preflop"
        ? botPreflopAction(this.table, seat, { payouts: this.payouts, buyIn, tilt, heroRead })
        : botPostflopAction(this.table, seat, this.rng, 800, this.payouts, buyIn, tilt, heroRead);
    this.applyLabeled(action);
  }

  /** Aplica a ação do herói, avaliando-a antes contra a linha de base. */
  private heroActing = false;
  heroAct(action: Action): void {
    if (!this.isHeroTurn()) return;
    // Travamento anti-empilhamento: se a ação anterior ainda está sendo
    // processada (clique rápido / tap duplo no celular), descarta o segundo.
    if (this.heroActing) return;
    this.heroActing = true;
    try {
    this.applyHeroAction(action);
    } finally {
    this.heroActing = false;
    }
  }

  private applyHeroAction(action: Action): void {
    const advice = this.adviceForSeat(this.heroSeat);
    if (advice) {
      const streetLabel = STREET_LABEL[this.table.street] ?? this.table.street;
      const heroType = action.type === "raise" ? "raise" : action.type;
      // Contexto da mão p/ o texto do feedback (posição, stack, estágio) —
      // UI-only, não altera nota nem decisão.
      const posMap = seatPositions(this.table);
      const feedbackCtx: FeedbackContext = {
        heroPosition: posMap.get(this.heroSeat),
        heroBB: (this.table.players[this.heroSeat].stack + this.table.players[this.heroSeat].committed) / (this.table.bigBlind || 1),
        stage: this.tournament?.stage,
      };
      const item = gradeDecision(streetLabel, this.userSubscriptionLevel, heroType, advice, feedbackCtx);
      this.feedback.push(item);
      // Gera também nos modos free e technical para as abas do modal de dicas.
      this.feedbackFree.push(gradeDecision(streetLabel, "free", heroType, advice, feedbackCtx));
      this.feedbackTechnical.push(gradeDecision(streetLabel, "technical", heroType, advice, feedbackCtx));
      // Acumula a nota para a análise de fim de torneio.
      this.heroRatings[item.rating]++;
      // Alimenta o placar de evolução e as missões.
      // Dados extras p/ conquistas (só leitura do estado): profundidade do herói,
      // se está pagando contra um all-in, e se já é mesa final.
      const heroP = this.table.players[this.heroSeat];
      const heroBB = (heroP.stack + heroP.committed) / this.table.bigBlind;
      const facingAllin = this.table.players.some(
        (p) => p.seat !== this.heroSeat && p.status === "allin",
      );
      this.onDecision?.({
        rating: item.rating,
        heroType,
        isPreflop: this.table.street === "preflop",
        buyIn: this.tournament?.buyIn,
        heroBB,
        facingAllin,
        finalTable: !!this.tournament?.finalTableFormed,
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
    // Anatomia: registra toda ação do herói (mesmo sem advice, para o check
    // contar como "não investiu") no raio-X Fold/Call/Raise/Re-raise.
    this.sessionDecisions.push({ heroAction: action.type === "raise" ? "raise" : action.type });
    this.applyLabeled(action, advice);
  }

  /** Conselho da linha de base para a decisão atual do herói. */
  computeHeroAdvice(): HeroAdvice | null {
    if (!this.isHeroTurn()) return null;
    return this.adviceForSeat(this.heroSeat);
  }

  /**
   * Tamanho de raise sugerido (em fichas) para o slider do herói já começar no
   * valor certo no pré-flop: 2.3bb padrão, +1bb por limper (isolamento). Sem
   * limper, é a abertura padrão de sempre. Retorna undefined quando não há um
   * raise a sugerir (pós-flop, ou recomendação de pagar/foldar).
   */
  suggestedRaiseTo(): number | undefined {
    if (!this.isHeroTurn() || this.table.street !== "preflop" || this.table.handOver) {
      return undefined;
    }
    const la = legalActions(this.table);
    if (!la.canRaise) return undefined;
    const ctx = preflopContextFor(this.table, this.heroSeat, BASELINE_PROFILE, {
      payouts: this.payouts,
    });
    const d = preflopDecision(ctx);
    if (d.action !== "raise" && d.action !== "3bet") return undefined;
    const to = Math.round(d.sizeBB * this.table.bigBlind);
    return Math.max(la.minRaiseTo, Math.min(la.maxRaiseTo, to));
  }

  /** Recomendação da linha de base (quase-GTO) para o assento que vai agir. */
  private adviceForSeat(seat: number): HeroAdvice | null {
    if (this.table.toAct !== seat || this.table.handOver) return null;
    if (this.table.street === "preflop") {
      const ctx = preflopContextFor(this.table, seat, BASELINE_PROFILE, { payouts: this.payouts });
      const d = preflopDecision(ctx);
      const positionLabels = ["BB", "SB", "BTN", "CO", "HJ", "LJ", "MP", "UTG1", "UTG"];
      return { kind: "preflop", action: d.action, reason: d.reason, mix: d.mix, effectiveBB: ctx.effectiveBB, nBet: d.nBet, stageLabel: this.tournament?.stage ?? undefined, heroPosition: positionLabels[seat % 9] };
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
    const positionLabels = ["BB", "SB", "BTN", "CO", "HJ", "LJ", "MP", "UTG1", "UTG"];
    return {
      kind: "postflop",
      action: d.action,
      reason: d.reason,
      equity: d.equity,
      potOdds: d.requiredEquity || undefined,
      villainRangePct: d.villainRangePct,
      mix: d.mix,
      evBB,
      stageLabel: this.tournament?.stage ?? undefined,
      heroPosition: positionLabels[seat % 9],
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
      buyIn: this.tournament.buyIn,
      initialStage: this.tournament.initialStage ?? this.tournament.stage,
      mode: this.tournament.mode ?? "livre",
      circuitStage: this.tournament.circuitStage,
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
      decisions: [...this.sessionDecisions],
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
    const heroStack = this.table.players[this.heroSeat].stack;
    const remaining = Math.round(this.tournament.fieldRemaining);
    // Se TODOS os vivos estão nesta mesa (mesa final), a classificação é exata:
    // conta quantos têm mais fichas que o herói. Fora disso, usa a estimativa.
    const exactRank =
      alive.length >= remaining ? 1 + alive.filter((p) => p.stack > heroStack).length : undefined;
    return fieldStatus({
      entrants: this.tournament.entrants,
      remaining: this.tournament.fieldRemaining,
      heroStack,
      avgStack,
      ladder: this.tournament.ladder,
      exactRank,
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
      sessionFeedbackFree: this.feedbackFree,
      sessionFeedbackTechnical: this.feedbackTechnical,
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
    // Preserva o apelido do assento (agora há duplicatas por arquétipo, então o
    // nome é POR ASSENTO, não por perfil). Fallback: nome canônico do perfil.
    const nameFor = (s: { name: string; profileId?: string; isHero?: boolean }) =>
      s.isHero ? this.heroName() : s.name || (s.profileId ? profileById(s.profileId).name : "Bot");
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
    this.feedbackFree = snap.sessionFeedbackFree ?? [];
    this.feedbackTechnical = snap.sessionFeedbackTechnical ?? [];
    this.tournamentResult = snap.tournamentResult;
    this.tournamentFinishPlace = snap.tournamentFinishPlace;
    this.tournamentOver = false;
    this.phase = "handOver";
    this.lastHand = null;
    this.handLog = snap.handLog ?? []; // preserva as mãos para o export
    this.feedback = [];
    this.feedbackFree = [];
    this.feedbackTechnical = [];
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
      handFeedback: this.feedback.slice(),
      // POSIÇÃO do herói (UTG, BTN, CO...) — sempre visível no card compartilhado.
      heroPosition: (() => {
        const posMap = seatPositions(this.table);
        const p = posMap.get(this.heroSeat);
        return p ?? "MP";
      })(),
      // ESTÁGIO do torneio no momento da mão (Início, Bolha...).
      tournamentStage: (() => {
        try {
          const s = STAGES[this.tournament?.stage ?? "inicio"];
          return s ? s.label : "";
        } catch {
          return "";
        }
      })(),
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
