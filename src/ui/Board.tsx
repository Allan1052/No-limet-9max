// Centro da mesa: pote + cartas comunitárias.
import { CardView } from "./Card";
import { toBB } from "../app/format";
import type { Card as CardT } from "../engine/cards";

export function Board({ board, pot, bigBlind }: { board: CardT[]; pot: number; bigBlind: number }) {
  return (
    <div className="center">
      <div className="pot">Pote: {toBB(pot, bigBlind)}</div>
      <div className="board">
        {board.map((c, i) => (
          <CardView key={i} card={c} />
        ))}
      </div>
    </div>
  );
}
