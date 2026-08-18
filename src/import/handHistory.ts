// ---------------------------------------------------------------------------
// Leitor de HAND HISTORY (histórico de mãos) do poker online real.
//
// Você joga seu torneio no PokerStars ou GGPoker, exporta o arquivo de texto,
// e este módulo transforma cada mão num objeto estruturado que o nosso motor
// (equity, ranges, frequência) consegue analisar. É a ponte entre o poker de
// verdade e o estudo aqui dentro.
//
// Suporta os dois formatos de texto (são quase idênticos):
//   - PokerStars: "PokerStars Hand #..."
//   - GGPoker:    "Poker Hand #..."
//
// Foco em TORNEIO (stacks em fichas), que é o pedido principal. Cash games
// também são lidos, mas a análise assume torneio.
// ---------------------------------------------------------------------------

import { cardFromString, type Card } from "../engine/cards";
import type { Position } from "../ranges/types";

export type Site = "PokerStars" | "GGPoker" | "desconhecido";

export type Street = "preflop" | "flop" | "turn" | "river";

export type ActionType =
  | "fold"
  | "check"
  | "call"
  | "bet"
  | "raise"
  | "sb"
  | "bb"
  | "ante"
  | "uncalled"
  | "collected";

export interface ParsedAction {
  street: Street;
  player: string;
  type: ActionType;
  /** Fichas envolvidas (para call/bet = valor; para raise = total "to"). */
  amount: number;
  allIn: boolean;
}

export interface ParsedSeat {
  seat: number;
  name: string;
  stack: number; // fichas no início da mão
  position?: Position;
  isHero: boolean;
  isButton: boolean;
}

export interface ParsedHand {
  site: Site;
  handId: string;
  tournamentId?: string;
  sb: number;
  bb: number;
  ante: number;
  maxSeats: number;
  buttonSeat: number;
  seats: ParsedSeat[];
  heroName?: string;
  heroCards: Card[]; // vazio se não revelado
  board: Card[];
  actions: ParsedAction[];
  /** Cartas reveladas no showdown por jogador (nome → cartas). */
  shownCards?: Record<string, Card[]>;
  /** Descrição da mão feita por jogador ("dois pares, Ás e Nove"). */
  handDesc?: Record<string, string>;
  /** Quem levou (parte do) pote no showdown. */
  winners?: string[];
  /** Ordem original das linhas, guardada para depuração/replay futuro. */
  raw: string;
}

const NAMES_EARLY_TO_LATE = ["UTG", "UTG1", "MP", "LJ", "HJ", "CO"] as const;

/** Converte "Ah Kd" / "Ah" numa lista de Cards; ignora cartas ocultas. */
function parseCards(chunk: string): Card[] {
  const out: Card[] = [];
  const tokens = chunk.trim().split(/\s+/).filter(Boolean);
  for (const t of tokens) {
    if (t.length !== 2) continue;
    try {
      out.push(cardFromString(t));
    } catch {
      /* carta ilegível (mão oculta) — ignora */
    }
  }
  return out;
}

/** Remove separadores de milhar e converte para número. */
function num(s: string): number {
  return parseFloat(s.replace(/[,\s]/g, "")) || 0;
}

/**
 * Atribui posições (UTG..BTN/SB/BB) aos assentos a partir do botão.
 * A ação pré-flop começa em SB→BB→UTG…; os nomes "late" (CO, HJ…) são
 * atribuídos de trás pra frente, que é o que mais importa para a decisão.
 */
export function assignPositions(seats: ParsedSeat[], buttonSeat: number): void {
  const order = [...seats].sort((a, b) => a.seat - b.seat);
  const n = order.length;
  if (n === 0) return;
  const btnIdx = order.findIndex((s) => s.seat === buttonSeat);
  if (btnIdx < 0) return;

  // Heads-up: o botão É o small blind.
  if (n === 2) {
    order[btnIdx].position = "SB";
    order[(btnIdx + 1) % 2].position = "BB";
    return;
  }

  // Anel a partir do botão: ring[0]=SB, ring[1]=BB, …, ring[n-1]=BTN.
  const ring: ParsedSeat[] = [];
  for (let i = 1; i <= n; i++) ring.push(order[(btnIdx + i) % n]);
  ring[0].position = "SB";
  ring[1].position = "BB";
  ring[n - 1].position = "BTN";

  // Assentos do meio: ring[2 .. n-2]. São n-3 assentos, nomeados com o FINAL
  // da lista early→late (o mais perto do botão vira CO, o anterior HJ, …).
  const middleCount = n - 3;
  const names = NAMES_EARLY_TO_LATE.slice(NAMES_EARLY_TO_LATE.length - middleCount);
  for (let i = 0; i < middleCount; i++) {
    ring[2 + i].position = names[i] as Position;
  }
}

/** Detecta o site pelo cabeçalho. */
function detectSite(header: string): Site {
  if (/^PokerStars|^(Mão\s+)?PokerStars/i.test(header)) return "PokerStars";
  if (/^(GG|Poker Hand|Mão\s+Poker)/i.test(header) || /GGPoker/i.test(header)) return "GGPoker";
  return "desconhecido";
}

/** Divide o texto colado em blocos de mão (um bloco por mão). */
function splitHands(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // Cada mão começa numa linha "PokerStars Hand #" ou "Poker Hand #".
  const lines = normalized.split("\n");
  const blocks: string[] = [];
  let current: string[] = [];
  const isHeader = (l: string) =>
    /^(PokerStars|GGPoker)\b.*Hand\s+#/i.test(l) ||
    /^Poker Hand\s+#/i.test(l) ||
    /^Mão PokerStars\s+#/i.test(l);
  for (const line of lines) {
    if (isHeader(line)) {
      if (current.length) blocks.push(current.join("\n"));
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current.join("\n"));
  return blocks.filter((b) => /Hand\s+#/i.test(b) || /^Mão PokerStars\s+#/i.test(b));
}

function currentStreet(sawFlop: boolean, sawTurn: boolean, sawRiver: boolean): Street {
  if (sawRiver) return "river";
  if (sawTurn) return "turn";
  if (sawFlop) return "flop";
  return "preflop";
}

/** Interpreta UM bloco de mão. Devolve null se não parecer uma mão válida. */
export function parseHandBlock(block: string): ParsedHand | null {
  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 3) return null;

  const header = lines[0];
  const site = detectSite(header);

  const handId =
    (header.match(/(?:Hand|Mão)\s+#(\w+)/i)?.[1]) ??
    (header.match(/#(\d{8,})/)?.[1]) ??
    "";
  const tournamentId = header.match(/Tournament\s+#(\w+)/i)?.[1] || header.match(/Torneio\s+#(\w+)/i)?.[1];
  // Blinds: primeiro grupo "(X/Y)" no cabeçalho (nível ou stakes).
  const blindMatch = header.match(/\(\s*([\d.,]+)\s*\/\s*([\d.,]+)/);
  const sb = blindMatch ? num(blindMatch[1]) : 0;
  const bb = blindMatch ? num(blindMatch[2]) : 0;

  let maxSeats = 9;
  let buttonSeat = 1;
  const seats: ParsedSeat[] = [];
  const actions: ParsedAction[] = [];
  const board: Card[] = [];
  let heroName: string | undefined;
  let heroCards: Card[] = [];
  let ante = 0;
  let sawFlop = false;
  let sawTurn = false;
  let sawRiver = false;
  let inSummary = false;
  const shownCards: Record<string, Card[]> = {};
  const handDesc: Record<string, string> = {};
  const winners = new Set<string>();

  for (const line of lines) {
    // ── SHOWDOWN / RESUMO: cartas reveladas, descrição da mão e vencedores.
    // Vem antes de tudo pra pegar tanto a seção "SHOW DOWN" quanto o "SUMÁRIO".
    const showM = line.match(/^(.+?):\s*(?:mostra|shows)\s+\[([^\]]+)\](?:\s*\(([^)]+)\))?/i);
    if (showM) {
      const nm = showM[1].trim();
      const cs = parseCards(showM[2]);
      if (cs.length) shownCards[nm] = cs;
      if (showM[3]) handDesc[nm] = showM[3].trim();
      continue;
    }
    // Resumo: "Lugar 6: nome (small blind) mostrou [9s As] e ganhou (10602) com dois pares..."
    const sumShowM = line.match(
      /^(?:Seat|Lugar)\s+\d+:\s+(.+?)(?:\s+\([^)]*\))?\s+(?:mostrou|showed)\s+\[([^\]]+)\]\s+e\s+(ganhou|won|perdeu|lost)(?:\s*\(([\d.,]+)\))?(?:\s+com\s+(.+))?/i,
    );
    if (sumShowM) {
      const nm = sumShowM[1].trim();
      const cs = parseCards(sumShowM[2]);
      if (cs.length) shownCards[nm] = cs;
      if (sumShowM[5]) handDesc[nm] = sumShowM[5].trim();
      if (/ganhou|won/i.test(sumShowM[3])) winners.add(nm);
      continue;
    }
    // Vencedor: "nome recebeu 10602 do pote" / "name collected (10602)".
    const wonM =
      line.match(/^(.+?)\s+(?:recebeu|coletou)\s+[\d.,]+\s+do pote/i) ||
      line.match(/^(.+?)\s+collected\s+\(?[\d.,]+\)?\s+from/i);
    if (wonM) {
      winners.add(wonM[1].trim());
      continue;
    }
    // Mesa e botão.
    const tableMatch =
      line.match(/Table\s+'.*?'\s+(\d+)-max\s+Seat\s+#(\d+)\s+is the button/i) ||
      line.match(/Mesa\s+'.*?'\s+(\d+)-max\s+Lugar\s*#(\d+)\s+é o botão/i);
    if (tableMatch) {
      maxSeats = parseInt(tableMatch[1], 10);
      buttonSeat = parseInt(tableMatch[2], 10);
      continue;
    }

    // Assentos.
    const seatMatch =
      line.match(/^Seat\s+(\d+):\s+(.+?)\s+\(([\d.,]+)\s+in chips/i) ||
      line.match(/^Lugar\s+(\d+):\s+(.+?)\s+\(([\d.,]+)\s+em fichas/i);
    if (seatMatch && !inSummary) {
      seats.push({
        seat: parseInt(seatMatch[1], 10),
        name: seatMatch[2].trim(),
        stack: num(seatMatch[3]),
        isHero: false,
        isButton: parseInt(seatMatch[1], 10) === buttonSeat,
      });
      continue;
    }

    if (/^\*\*\* (SUMMARY|SUM[ÁA]RIO|RESUMO) \*\*\*/i.test(line)) {
      inSummary = true;
      continue;
    }
    if (inSummary) continue;

    // Ruas.
    const flopM = line.match(/^\*\*\* (FLOP|FIRST FLOP)[^[]*\[([^\]]+)\]/i);
    if (flopM) {
      sawFlop = true;
      board.push(...parseCards(flopM[2]));
      continue;
    }
    const turnM = line.match(/^\*\*\* (TURN|FIRST TURN)[^[]*\[[^\]]+\]\s*\[([^\]]+)\]/i);
    if (turnM) {
      sawTurn = true;
      board.push(...parseCards(turnM[2]));
      continue;
    }
    const riverM = line.match(/^\*\*\* (RIVER|FIRST RIVER)[^[]*\[[^\]]+\]\s*\[([^\]]+)\]/i);
    if (riverM) {
      sawRiver = true;
      board.push(...parseCards(riverM[2]));
      continue;
    }

    // Cartas do herói.
    const dealtM =
      line.match(/^Dealt to\s+(.+?)\s+\[([^\]]+)\]/i) ||
      line.match(/^(.+?)\s+recebe\s+\[([^\]]+)\]/);
    if (dealtM) {
      heroName = dealtM[1].trim();
      heroCards = parseCards(dealtM[2]);
      continue;
    }

    // Antes e blinds.
    const anteM =
      line.match(/^(.+?):\s+posts\s+the\s+ante\s+([\d.,]+)/i) ||
      line.match(/^(.+?):\s+coloca\s+ante\s+([\d.,]+)/i);
    if (anteM) {
      ante = Math.max(ante, num(anteM[2]));
      actions.push({ street: "preflop", player: anteM[1].trim(), type: "ante", amount: num(anteM[2]), allIn: /all-in/i.test(line) });
      continue;
    }
    const sbM =
      line.match(/^(.+?):\s+posts\s+small blind\s+([\d.,]+)/i) ||
      line.match(/^(.+?):\s+paga o small blind\s+([\d.,]+)/i);
    if (sbM) {
      actions.push({ street: "preflop", player: sbM[1].trim(), type: "sb", amount: num(sbM[2]), allIn: false });
      continue;
    }
    const bbM =
      line.match(/^(.+?):\s+posts\s+big blind\s+([\d.,]+)/i) ||
      line.match(/^(.+?):\s+paga o big blind\s+([\d.,]+)/i);
    if (bbM) {
      actions.push({ street: "preflop", player: bbM[1].trim(), type: "bb", amount: num(bbM[2]), allIn: false });
      continue;
    }

    // Ações de jogo.
    const street = currentStreet(sawFlop, sawTurn, sawRiver);
    const foldM =
      line.match(/^(.+?):\s+folds/i) || line.match(/^(.+?):\s+desiste\s*$/);
    if (foldM) {
      actions.push({ street, player: foldM[1].trim(), type: "fold", amount: 0, allIn: false });
      continue;
    }
    const checkM = line.match(/^(.+?):\s+checks/i) || line.match(/^(.+?):\s+passa\s*$/);
    if (checkM) {
      actions.push({ street, player: checkM[1].trim(), type: "check", amount: 0, allIn: false });
      continue;
    }
    const callM =
      line.match(/^(.+?):\s+calls\s+([\d.,]+)/i) ||
      line.match(/^(.+?):\s+iguala\s+([\d.,]+)/i);
    if (callM) {
      actions.push({ street, player: callM[1].trim(), type: "call", amount: num(callM[2]), allIn: /all-in/i.test(line) });
      continue;
    }
    const raiseM =
      line.match(/^(.+?):\s+raises\s+[\d.,]+\s+to\s+([\d.,]+)/i) ||
      line.match(/^(.+?):\s+aumenta\s+[\d.,]+\s+para\s+([\d.,]+)/i);
    if (raiseM) {
      actions.push({ street, player: raiseM[1].trim(), type: "raise", amount: num(raiseM[2]), allIn: /all-in/i.test(line) });
      continue;
    }
    const betM =
      line.match(/^(.+?):\s+bets\s+([\d.,]+)/i) ||
      line.match(/^(.+?):\s+aposta\s+([\d.,]+)/i);
    if (betM) {
      actions.push({ street, player: betM[1].trim(), type: "bet", amount: num(betM[2]), allIn: /all-in/i.test(line) });
      continue;
    }
    const uncalledM =
      line.match(/^Uncalled bet\s+\(([\d.,]+)\)\s+returned to\s+(.+)/i) ||
      line.match(/^Aposta não-igualada \(([\d.,]+)\) voltou para (.+)/i);
    if (uncalledM) {
      actions.push({ street, player: uncalledM[2].trim(), type: "uncalled", amount: num(uncalledM[1]), allIn: false });
      continue;
    }
  }

  if (seats.length < 2 || bb <= 0) return null;

  // Marca o herói e atribui posições.
  if (heroName) {
    for (const s of seats) if (s.name === heroName) s.isHero = true;
  }
  assignPositions(seats, buttonSeat);

  return {
    site,
    handId,
    tournamentId,
    sb,
    bb,
    ante,
    maxSeats,
    buttonSeat,
    seats,
    heroName,
    heroCards,
    board,
    actions,
    shownCards: Object.keys(shownCards).length ? shownCards : undefined,
    handDesc: Object.keys(handDesc).length ? handDesc : undefined,
    winners: winners.size ? [...winners] : undefined,
    raw: block,
  };
}

/** Interpreta um arquivo/colagem inteiro com várias mãos. */
export function parseHandHistory(text: string): ParsedHand[] {
  return splitHands(text)
    .map(parseHandBlock)
    .filter((h): h is ParsedHand => h != null);
}
