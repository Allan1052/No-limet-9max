// Centro da mesa: pote + cartas comunitárias.
import { CardView } from "./Card";
import type { Card as CardT } from "../engine/cards";

export function Board({ board, pot }: { board: CardT[]; pot: number }) {
  return (
    <div className="center">
      <div className="pot">Pote: {pot}</div>
      <div className="board">
        {board.map((c, i) => (
          <CardView key={i} card={c} />
        ))}
      </div>
    </div>
  );
}
