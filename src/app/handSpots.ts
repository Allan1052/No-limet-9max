// ---------------------------------------------------------------------------
// Reconstrói, a partir de uma mão finalizada (HandHistory), o SPOT pré-flop de
// cada jogador que teve ação: a posição, a mão que ele realmente tinha e se ele
// estava abrindo (pote não aberto) ou defendendo contra um raise.
//
// Alimenta o "range por jogador" do modo avançado: clico num jogador e vejo a
// grade que ele deveria jogar naquele spot, com a mão dele em destaque.
// ---------------------------------------------------------------------------

import type { HandHistory } from "./replay";
import { tablePositions } from "../ranges/positions";
import { comboToHandType, type Position } from "../ranges/types";
import type { Card } from "../engine/cards";

export interface PlayerSpot {
  seat: number;
  name: string;
  position: Position;
  isHero: boolean;
  cards: Card[];
  handType: string;
  effectiveBB: number;
  /** Primeira ação voluntária do jogador no pré-flop (fold/call/raise/allin). */
  actionType: string;
  /** Posição de quem abriu, se o jogador enfrentou um raise. Ausente = abertura. */
  raiserPosition?: Position;
  openSizeBB?: number;
  /**
   * Se este jogador ABRIU e depois levou um 3-bet, guarda o spot da resposta ao
   * 3-bet (4-bet / pagar / foldar) — o popup mostra também essa grade.
   */
  vs3bet?: { threeBettorPosition: Position; threeBetSizeBB: number };
}

const VOLUNTARY = new Set(["fold", "check", "call", "raise", "allin", "bet"]);

function isPreflop(street: string): boolean {
  return street === "Pré-flop" || street.toLowerCase() === "preflop";
}

/** Extrai o tamanho (em bb) de um rótulo tipo "Raise 2.3bb". */
function sizeFromLabel(label: string): number | undefined {
  const m = label.match(/(\d+(?:[.,]\d+)?)\s*bb/i);
  return m ? parseFloat(m[1].replace(",", ".")) : undefined;
}

/** Spots pré-flop de todos os jogadores que agiram na mão. */
export function handSpots(h: HandHistory): PlayerSpot[] {
  const bb = h.bigBlind || 1;
  const seatSet = new Set<number>();
  for (const e of h.events) seatSet.add(e.seat);
  for (const s of Object.keys(h.holeCards)) seatSet.add(Number(s));
  const positions = tablePositions([...seatSet], h.buttonSeat);

  const effBB = (seat: number): number => {
    const chips = h.startingStacks?.[seat];
    if (chips == null) return 100; // mãos antigas sem stack gravado
    return Math.max(1, Math.round((chips / bb) * 10) / 10);
  };

  const spots: PlayerSpot[] = [];
  const seen = new Set<number>();
  let raiserPosition: Position | undefined;
  let openSizeBB: number | undefined;
  // Sequência de raises do pré-flop (abertura, 3-bet, 4-bet...) na ordem.
  const raises: { seat: number; position: Position; sizeBB: number }[] = [];

  for (const e of h.events) {
    if (!isPreflop(e.street)) break;
    if (!VOLUNTARY.has(e.actionType)) continue;

    // Registra o spot na PRIMEIRA ação voluntária do jogador (ele enfrenta o
    // raise anterior, não o próprio).
    if (!seen.has(e.seat)) {
      seen.add(e.seat);
      const cards = h.holeCards[e.seat] ?? [];
      const pos = positions[e.seat];
      // BB em pote não aberto (só deu check) não tem "range de abertura" — pula.
      const bbUnopened = pos === "BB" && raiserPosition == null;
      // Inclui TODOS que agiram no pré-flop, mesmo sem cartas reveladas (aí só
      // não há a mão real pra destacar — o range mesmo aparece).
      if (pos && !bbUnopened) {
        spots.push({
          seat: e.seat,
          name: h.names[e.seat] ?? `#${e.seat}`,
          position: pos,
          isHero: e.seat === h.heroSeat,
          cards: cards.slice(0, 2),
          handType: cards.length >= 2 ? comboToHandType(cards[0], cards[1]) : "",
          effectiveBB: effBB(e.seat),
          actionType: e.actionType,
          raiserPosition,
          openSizeBB,
        });
      }
    }

    // Atualiza a abertura mais recente APÓS registrar este jogador.
    if (e.actionType === "raise" || e.actionType === "allin") {
      raiserPosition = positions[e.seat];
      openSizeBB = sizeFromLabel(e.actionLabel) ?? (e.actionType === "allin" ? effBB(e.seat) : 2.3);
      const pos = positions[e.seat];
      if (pos) raises.push({ seat: e.seat, position: pos, sizeBB: openSizeBB });
    }
  }

  // Quem ABRIU (1º raise) e levou um 3-bet (2º raise) ganha o spot de resposta
  // ao 3-bet: clicar nele mostra também a grade de 4-bet / pagar / foldar.
  if (raises.length >= 2) {
    const opener = raises[0];
    const threeBettor = raises[1];
    if (opener.seat !== threeBettor.seat) {
      const openerSpot = spots.find((s) => s.seat === opener.seat && s.raiserPosition == null);
      if (openerSpot) {
        openerSpot.vs3bet = {
          threeBettorPosition: threeBettor.position,
          threeBetSizeBB: threeBettor.sizeBB,
        };
      }
    }
  }
  return spots;
}
