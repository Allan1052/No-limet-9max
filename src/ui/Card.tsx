// Renderização de uma carta (ou verso). Cartas são inteiros 0..51.
import { RANKS, SUITS, type Card as CardT } from "../engine/cards";

const SUIT_SYMBOL = ["♣", "♦", "♥", "♠"]; // paus, ouros, copas, espadas
// Baralho de 4 cores (padrão GGPoker/moderno): cada naipe tem sua cor, o que
// deixa copas×ouros e paus×espadas fáceis de distinguir num olhar. Ordem SUITS
// = "cdhs" → 0 paus (verde), 1 ouros (azul), 2 copas (vermelho), 3 espadas (preto).
const SUIT_CLASS = ["s-clubs", "s-diamonds", "s-hearts", "s-spades"];

export function CardView({ card, small }: { card: CardT; small?: boolean }) {
  const rank = RANKS[card >> 2];
  const suit = card & 3;
  return (
    <div className={`card ${small ? "sm" : ""} ${SUIT_CLASS[suit]}`}>
      <span className="idx">
        <span className="rank">{rank}</span>
        <span className="suit">{SUIT_SYMBOL[suit]}</span>
      </span>
      <span className="pip">{SUIT_SYMBOL[suit]}</span>
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
