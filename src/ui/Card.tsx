// Renderização de uma carta (ou verso). Cartas são inteiros 0..51.
import { RANKS, SUITS, type Card as CardT } from "../engine/cards";

const SUIT_SYMBOL = ["♣", "♦", "♥", "♠"]; // paus, ouros, copas, espadas
const RED_SUITS = new Set([1, 2]); // ouros e copas

export function CardView({ card, small }: { card: CardT; small?: boolean }) {
  const rank = RANKS[card >> 2];
  const suit = card & 3;
  const color = RED_SUITS.has(suit) ? "red" : "black";
  return (
    <div className={`card ${small ? "sm" : ""} ${color}`}>
      <span className="rank">{rank}</span>
      <span className="suit">{SUIT_SYMBOL[suit]}</span>
    </div>
  );
}

export function CardBack({ small }: { small?: boolean }) {
  return (
    <div className={`card back ${small ? "sm" : ""}`}>
      <span className="mono">◆</span>
    </div>
  );
}

/** Nome curto de carta para tooltip/log. */
export function cardLabel(card: CardT): string {
  return RANKS[card >> 2] + SUITS[card & 3];
}
