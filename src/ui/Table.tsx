// Mesa 9-max: assentos ao redor do oval, board, botão do dealer e uma camada
// de informação SOBRE a mesa (posição no torneio, blinds, dica e atalhos) —
// tudo concentrado aqui para caber na tela sem rolagem.
import { useEffect, useRef, useState } from "react";
import { Seat } from "./Seat";
import { OmahaSeat } from "./OmahaSeat";
import { Board } from "./Board";
import { ChipStack } from "./ChipStack";
import { useT } from "../i18n";
import { tablePositions } from "../ranges/positions";
import type { TableState } from "../game/state";
import "./tableModern.css";
import "./coachV2Hint.css";

// Posições (%) dos 9 assentos. Mantemos todos um pouco mais para dentro do
// oval para que, no celular, nenhum pod invada a faixa de classificação acima
// nem empurre os controles para fora da tela.
const SEAT_POS: Array<{ top: string; left: string }> = [
  { top: "86%", left: "50%" },
  { top: "76%", left: "20%" },
  { top: "50%", left: "10%" },
  { top: "25%", left: "15%" },
  { top: "13%", left: "37%" },
  { top: "13%", left: "63%" },
  { top: "25%", left: "85%" },
  { top: "50%", left: "90%" },
  { top: "76%", left: "80%" },
];

function towardCenter(pos: { top: string; left: string }, f: number) {
  const t = parseFloat(pos.top);
  const l = parseFloat(pos.left);
  return { top: `${t + (50 - t) * f}%`, left: `${l + (50 - l) * f}%` };
}

const POT_CENTER = { top: "45%", left: "50%" };

function SweepChip({ from, amount, bigBlind }: { from: { top: string; left: string }; amount: number; bigBlind: number }) {
  const [go, setGo] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGo(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const pos = go ? POT_CENTER : from;
  return (
    <div className="chip-sweep" style={{ top: pos.top, left: pos.left }}>
      <ChipStack amount={amount} bigBlind={bigBlind} showLabel={false} />
    </div>
  );
}

export function PokerTable({
  table,
  lastActionLabel = {},
  hint,
  onSelectSeat,
  onShowTips,
  showTips = false,
  celebrate = false,
  updateReady = false,
  onUpdate,
  rangeSeats = [],
  buyIn,
  readOnly = false,
  replayActorSeat,
}: {
  table: TableState;
  lastActionLabel?: Record<number, string>;
  hint?: string;
  onSelectSeat?: (seat: number) => void;
  onShowTips?: () => void;
  showTips?: boolean;
  celebrate?: boolean;
  updateReady?: boolean;
  onUpdate?: () => void;
  rangeSeats?: number[];
  buyIn?: number;
  readOnly?: boolean;
  replayActorSeat?: number;
}) {
  const { t } = useT();

  function getBasePath(): string {
    const base = document.querySelector('script[type="module"]')?.getAttribute('src') || '';
    if (base.startsWith('/assets/')) return '/';
    const match = base.match(/^(\/[^/]+\/)/);
    return match ? match[1] : '/';
  }
  const reveal = table.handOver;

  const [sweeps, setSweeps] = useState<Array<{ id: string; from: { top: string; left: string }; amount: number }>>([]);
  const prevCommitted = useRef<Record<number, number>>({});
  const prevBoardLen = useRef(0);
  const commitSig = table.players.map((p) => `${p.seat}:${p.committed}`).join(",") + `|${table.street}|${table.handOver}`;
  useEffect(() => {
    const prev = prevCommitted.current;
    const newHand = table.board.length < prevBoardLen.current;
    const born: Array<{ id: string; from: { top: string; left: string }; amount: number }> = [];
    if (!newHand) {
      for (const p of table.players) {
        const before = prev[p.seat] ?? 0;
        if (before > 0 && (p.committed ?? 0) === 0 && p.status !== "out") {
          const pos = SEAT_POS[p.seat];
          if (pos) {
            born.push({ id: `${p.seat}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, from: towardCenter(pos, 0.36), amount: before });
          }
        }
      }
    }
    const cur: Record<number, number> = {};
    for (const p of table.players) cur[p.seat] = p.committed;
    prevCommitted.current = cur;
    prevBoardLen.current = table.board.length;
    if (born.length) {
      setSweeps((s) => [...s, ...born]);
      const ids = new Set(born.map((b) => b.id));
      const timer = setTimeout(() => setSweeps((s) => s.filter((x) => !ids.has(x.id))), 520);
      return () => clearTimeout(timer);
    }
  }, [commitSig]); // eslint-disable-line react-hooks/exhaustive-deps

  const seatsInPlay = table.players.filter((p) => p.status !== "out").map((p) => p.seat);
  const positions = tablePositions(seatsInPlay, table.buttonSeat);

  return (
    <div className={`table-wrap table-modern ${celebrate ? "celebrate" : ""}`}>
      <div className="felt">
        <div className="table-surface-glow" />
        <div className="table-brand-mark">
          <img src={`${getBasePath()}brand-logo-splash.png`} alt="Call ou Fold" />
          <span>aqui é possível</span>
        </div>
      </div>

      <div className="tbl-center-col">
        {hint ? <div className="tbl-hint">💡 {hint}</div> : null}
        <Board
          board={table.board}
          pot={table.players.reduce((s, p) => s + p.totalCommitted, 0)}
          chipPot={
            table.handOver
              ? table.players.reduce((s, p) => s + p.totalCommitted, 0)
              : table.players.reduce((s, p) => s + p.totalCommitted - p.committed, 0)
          }
          bigBlind={table.bigBlind}
          inline
          buyIn={buyIn}
        />
      </div>

      {showTips ? (
        <button className="tbl-tips-btn" onClick={onShowTips}>
          💡 {t("tips.button")}
        </button>
      ) : null}

      {updateReady ? (
        <button className="tbl-update-btn" onClick={onUpdate}>
          ✨ {t("update.button")}
        </button>
      ) : null}

      {table.players.map((p) => {
        const pos = SEAT_POS[p.seat] ?? { top: "50%", left: "50%" };
        const isOmaha = table.variant === "omaha";
        const SeatComponent = isOmaha ? OmahaSeat : Seat;
        const acting = replayActorSeat != null
          ? replayActorSeat === p.seat
          : table.toAct === p.seat && !table.handOver;
        return (
          <SeatComponent
            key={p.seat}
            player={p}
            acting={acting}
            reveal={reveal}
            lastAction={lastActionLabel[p.seat]}
            bigBlind={table.bigBlind}
            position={positions[p.seat]}
            rangeMarked={rangeSeats.includes(p.seat)}
            onSelect={readOnly ? undefined : onSelectSeat}
            style={{ top: pos.top, left: pos.left }}
            isOmaha={isOmaha}
          />
        );
      })}

      {table.players.map((p) => {
        if (table.handOver) return null;
        if (!p.committed || p.committed <= 0 || p.status === "out") return null;
        const pos = SEAT_POS[p.seat];
        if (!pos) return null;
        const b = towardCenter(pos, 0.36);
        return (
          <div key={`bet-${p.seat}`} className="seat-bet" style={{ top: b.top, left: b.left }}>
            <ChipStack amount={p.committed} bigBlind={table.bigBlind} />
          </div>
        );
      })}

      {table.handOver ? null : sweeps.map((s) => (
        <SweepChip key={s.id} from={s.from} amount={s.amount} bigBlind={table.bigBlind} />
      ))}

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
