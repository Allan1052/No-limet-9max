// Mesa 9-max: assentos ao redor do oval, board, botão do dealer e uma camada
// de informação SOBRE a mesa (posição no torneio, blinds, dica e atalhos) —
// tudo concentrado aqui para caber na tela sem rolagem.
import { Seat } from "./Seat";
import { OmahaSeat } from "./OmahaSeat";
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

  // Get the base URL from the manifest or default to '/'
  function getBasePath(): string {
    const base = document.querySelector('script[type="module"]')?.getAttribute('src') || '';
    // Extract base path from script src (e.g., "/No-limet-9max/assets/index-xxx.js")
    const match = base.match(/^(\/[^/]+\/)/);
    return match ? match[1] : '/';
  }
  const reveal = table.handOver;
  const ante = table.ante ?? 0;

  // Posições (UTG..BTN/SB/BB) dos jogadores ainda na mesa, a partir do botão.
  const seatsInPlay = table.players.filter((p) => p.status !== "out").map((p) => p.seat);
  const positions = tablePositions(seatsInPlay, table.buttonSeat);

  return (
    <div className={`table-wrap ${celebrate ? "celebrate" : ""}`}>
      <div className="felt">
        <svg 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '140px',
            height: '140px',
            pointerEvents: 'none',
            opacity: '0.2'
          }}
          viewBox="0 0 140 140"
        >
          <defs>
            <path id="moonArc" d="M 25,70 A 45,45 0 0,1 115,70" fill="none" />
          </defs>
          <image href={`${getBasePath()}brand-logo-splash.png`} x="45" y="45" width="50" height="50" />
          <text fontSize="9" fill="#d4af37" fontFamily="Georgia, serif" fontWeight="700" letterSpacing="1">
            <textPath href="#moonArc" startOffset="50%" textAnchor="middle">aqui é possível</textPath>
          </text>
        </svg>
      </div>

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
        const isOmaha = table.variant === "omaha";
        const SeatComponent = isOmaha ? OmahaSeat : Seat;
        return (
          <SeatComponent
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
            isOmaha={isOmaha}
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
