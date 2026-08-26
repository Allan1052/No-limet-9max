// Centro da mesa: pote + cartas comunitárias.
import { CardView } from "./Card";
import { ChipStack } from "./ChipStack";
import { fmtAmount } from "../app/format";
import { useSettings } from "../app/settings";
import type { Card as CardT } from "../engine/cards";

export function Board({
  board,
  pot,
  chipPot,
  bigBlind,
  inline = false,
  buyIn,
}: {
  board: CardT[];
  pot: number;
  /** Fichas JÁ recolhidas ao pote (ruas anteriores) — a pilha central. As
   * apostas da rua atual ficam na frente dos jogadores, não aqui. Sem isto,
   * mostra o pote inteiro. */
  chipPot?: number;
  bigBlind: number;
  /** Quando true, flui dentro da coluna central (sem posicionamento absoluto). */
  inline?: boolean;
  /** Valor do torneio — aparece discretamente junto ao pote, na mesa. */
  buyIn?: number;
}) {
  const { unit } = useSettings();
  const pile = chipPot ?? pot;
  return (
    <div className={`center ${inline ? "inline" : ""}`}>
      {buyIn ? (
        <div className="tbl-buyin">🏆 {Math.round(buyIn).toLocaleString("pt-BR")} fichas simuladas</div>
      ) : null}
      <div className="pot">Pote: {fmtAmount(pot, bigBlind, unit)}</div>
      {pile > 0 ? <ChipStack amount={pile} bigBlind={bigBlind} showLabel={false} className="pot-chips" /> : null}
      <div className="board">
        {board.map((c, i) => (
          <CardView key={i} card={c} />
        ))}
      </div>
    </div>
  );
}
