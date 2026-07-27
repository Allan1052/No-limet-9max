// Centro da mesa: pote + cartas comunitárias.
import { CardView } from "./Card";
import { fmtAmount } from "../app/format";
import { useSettings } from "../app/settings";
import type { Card as CardT } from "../engine/cards";

export function Board({
  board,
  pot,
  bigBlind,
  inline = false,
}: {
  board: CardT[];
  pot: number;
  bigBlind: number;
  /** Quando true, flui dentro da coluna central (sem posicionamento absoluto). */
  inline?: boolean;
}) {
  const { unit } = useSettings();
  return (
    <div className={`center ${inline ? "inline" : ""}`}>
      <div className="pot">Pote: {fmtAmount(pot, bigBlind, unit)}</div>
      <div className="board">
        {board.map((c, i) => (
          <CardView key={i} card={c} />
        ))}
      </div>
    </div>
  );
}
