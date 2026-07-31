// Mesa 9-max: assentos ao redor do oval, board, botão do dealer e uma camada
// de informação SOBRE a mesa (posição no torneio, blinds, dica e atalhos) —
// tudo concentrado aqui para caber na tela sem rolagem.
import { Seat } from "./Seat";
import { Board } from "./Board";
import { useT } from "../i18n";
import { tablePositions } from "../ranges/positions";
import type { TableState } from "../game/state";
import type { FieldStatus } from "../tournament/field";

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

function usd(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

export function PokerTable({
  table,
  lastActionLabel = {},
  field,
  hint,
  onSelectSeat,
  onShowTips,
  showTips = false,
  celebrate = false,
  updateReady = false,
  onUpdate,
  rangeSeats = [],
}: {
  table: TableState;
  lastActionLabel?: Record<number, string>;
  field?: FieldStatus | null;
  hint?: string;
  onSelectSeat?: (seat: number) => void;
  onShowTips?: () => void;
  showTips?: boolean;
  celebrate?: boolean;
  updateReady?: boolean;
  onUpdate?: () => void;
  /** Assentos que têm range pra ver ao final da mão (ficam marcados). */
  rangeSeats?: number[];
}) {
  const { t } = useT();
  const reveal = table.handOver;
  const ante = table.ante ?? 0;

  // Posições (UTG..BTN/SB/BB) dos jogadores ainda na mesa, a partir do botão.
  const seatsInPlay = table.players.filter((p) => p.status !== "out").map((p) => p.seat);
  const positions = tablePositions(seatsInPlay, table.buttonSeat);

  return (
    <div className={`table-wrap ${celebrate ? "celebrate" : ""}`}>
      <div className="felt" />

      {/* Coluna central única (dica + classificação + blinds + pote + board),
          empilhada e centralizada — assim nada se sobrepõe, independente do
          tamanho da dica. */}
      <div className="tbl-center-col">
        {hint ? <div className="tbl-hint">💡 {hint}</div> : null}
        {field ? (
          <div className="tbl-rankline">
            <span className="tbl-rank">
              {field.heroRank}º<span className="tbl-of"> / {field.entrants.toLocaleString("en-US")}</span>
            </span>
            <span className={`tbl-money ${field.inMoney ? "itm" : ""}`}>
              {field.inMoney
                ? `ITM ${usd(field.currentCash)} 💰`
                : `${t("hud.paid")}: ${field.paidPlaces.toLocaleString("en-US")}`}
            </span>
          </div>
        ) : null}
        <div className="tbl-blinds">
          {t("hud.blinds")} {table.smallBlind}/{table.bigBlind}
          {ante > 0 ? ` (ante ${ante})` : ""}
          {field ? ` · ${field.remaining.toLocaleString("en-US")} ${t("hud.alive")}` : ""}
        </div>
        <Board
          board={table.board}
          pot={table.players.reduce((s, p) => s + p.totalCommitted, 0)}
          bigBlind={table.bigBlind}
          inline
        />
      </div>

      {/* Botão central: ver as dicas completas da mão (após o river/showdown) */}
      {showTips ? (
        <button className="tbl-tips-btn" onClick={onShowTips}>
          💡 {t("tips.button")}
        </button>
      ) : null}

      {/* Aviso de nova versão, bem no centro da mesa */}
      {updateReady ? (
        <button className="tbl-update-btn" onClick={onUpdate}>
          ✨ {t("update.button")}
        </button>
      ) : null}

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
            position={positions[p.seat]}
            rangeMarked={rangeSeats.includes(p.seat)}
            onSelect={onSelectSeat}
            style={{ top: pos.top, left: pos.left }}
          />
        );
      })}

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
