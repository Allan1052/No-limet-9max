// Mesa 9-max: posiciona os assentos ao redor do oval, board e botão do dealer.
import { Seat } from "./Seat";
import { Board } from "./Board";
import type { TableState } from "../game/state";

// Posições (%) dos 9 assentos. O herói (assento 0) fica embaixo, no centro.
const SEAT_POS: Array<{ top: string; left: string }> = [
  { top: "90%", left: "50%" }, // 0 herói
  { top: "82%", left: "19%" }, // 1
  { top: "52%", left: "9%" }, // 2
  { top: "20%", left: "14%" }, // 3
  { top: "8%", left: "37%" }, // 4
  { top: "8%", left: "63%" }, // 5
  { top: "20%", left: "86%" }, // 6
  { top: "52%", left: "91%" }, // 7
  { top: "82%", left: "81%" }, // 8
];

function towardCenter(pos: { top: string; left: string }, f: number) {
  const t = parseFloat(pos.top);
  const l = parseFloat(pos.left);
  return { top: `${t + (50 - t) * f}%`, left: `${l + (50 - l) * f}%` };
}

export function PokerTable({
  table,
  lastActionLabel = {},
}: {
  table: TableState;
  lastActionLabel?: Record<number, string>;
}) {
  const reveal = table.handOver && !!table.result?.showdown;

  return (
    <div className="table-wrap">
      <div className="felt" />
      <div className="table-label">Poker Sim · Estudo</div>

      <Board
        board={table.board}
        pot={table.players.reduce((s, p) => s + p.totalCommitted, 0)}
        bigBlind={table.bigBlind}
      />

      {table.players.map((p) => {
        const pos = SEAT_POS[p.seat] ?? { top: "50%", left: "50%" };
        return (
          <Seat
            key={p.seat}
            player={p}
            acting={table.toAct === p.seat && !table.handOver}
            reveal={reveal}
            lastAction={lastActionLabel[p.seat]}
            bigBlind={table.bigBlind}
            style={{ top: pos.top, left: pos.left }}
          />
        );
      })}

      {/* Botão do dealer, deslocado do assento em direção ao centro. */}
      {(() => {
        const pos = SEAT_POS[table.buttonSeat];
        if (!pos) return null;
        const b = towardCenter(pos, 0.28);
        return (
          <div className="dealer-btn" style={{ top: b.top, left: b.left }}>
            D
          </div>
        );
      })()}
    </div>
  );
}
