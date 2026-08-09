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

// Onde o pote fica (centro): as fichas recolhidas deslizam pra cá.
const POT_CENTER = { top: "45%", left: "50%" };

/** Ficha voando da frente do jogador pro pote (o "dealer recolhe"). */
function SweepChip({
  from,
  amount,
  bigBlind,
}: {
  from: { top: string; left: string };
  amount: number;
  bigBlind: number;
}) {
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
    // Detect if we're at root (script src = "/assets/...")
    if (base.startsWith('/assets/')) return '/';
    // Old format: /ProjectName/assets/...
    const match = base.match(/^(\/[^/]+\/)/);
    return match ? match[1] : '/';
  }
  const reveal = table.handOver;
  const ante = table.ante ?? 0;

  // Varrida do dealer: quando uma aposta da frente é RECOLHIDA (committed vai a
  // 0 ao fechar a rua), dispara uma ficha voando daquele assento pro pote.
  const [sweeps, setSweeps] = useState<Array<{ id: string; from: { top: string; left: string }; amount: number }>>([]);
  const prevCommitted = useRef<Record<number, number>>({});
  const prevBoardLen = useRef(0);
  const commitSig =
    table.players.map((p) => `${p.seat}:${p.committed}`).join(",") + `|${table.street}|${table.handOver}`;
  useEffect(() => {
    const prev = prevCommitted.current;
    // Virada de mão nova (board zerou): não é recolhimento — não varre.
    const newHand = table.board.length < prevBoardLen.current;
    const born: Array<{ id: string; from: { top: string; left: string }; amount: number }> = [];
    if (!newHand) {
      for (const p of table.players) {
        const before = prev[p.seat] ?? 0;
        if (before > 0 && (p.committed ?? 0) === 0 && p.status !== "out") {
          const pos = SEAT_POS[p.seat];
          if (pos) {
            born.push({
              id: `${p.seat}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              from: towardCenter(pos, 0.36),
              amount: before,
            });
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

  // Posições (UTG..BTN/SB/BB) dos jogadores ainda na mesa, a partir do botão.
  const seatsInPlay = table.players.filter((p) => p.status !== "out").map((p) => p.seat);
  const positions = tablePositions(seatsInPlay, table.buttonSeat);

  return (
    <div className={`table-wrap ${celebrate ? "celebrate" : ""}`}>
      <div className="felt">
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            pointerEvents: 'none',
            opacity: '0.2'
          }}
        >
          <img
            src={`${getBasePath()}brand-logo-splash.png`}
            alt="Call ou Fold"
            style={{ width: '50px', height: '50px' }}
          />
          <span
            style={{
              color: '#d4af37',
              fontFamily: 'Georgia, serif',
              fontWeight: 700,
              fontSize: '9px',
              letterSpacing: '1.5px',
              textTransform: 'uppercase'
            }}
          >
            aqui é possível
          </span>
        </div>
      </div>

      {/* Coluna central única (dica + classificação + blinds + pote + board),
          empilhada e centralizada — assim nada se sobrepõe, independente do
          tamanho da dica. */}
      <div className="tbl-center-col">
        {hint ? <div className="tbl-hint">💡 {hint}</div> : null}
        {field ? (
          <div className="tbl-rankline">
            <span className="tbl-rank">
              {field.heroRank}º
              <span className="tbl-of">
                {" "}de {field.remaining.toLocaleString("en-US")} {t("hud.alive")}
              </span>
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
          {field ? ` · ${t("hud.field")} ${field.entrants.toLocaleString("en-US")}` : ""}
        </div>
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

      {/* Fichas apostadas na frente de cada jogador (a aposta "na mesa" da rua).
          Na mão encerrada (showdown) as apostas já pertencem ao pote — não
          pintamos pilhas na frente dos assentos pra não sobrepor nada. */}
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

      {/* Dealer recolhendo: fichas deslizando pro pote. Na mão encerrada o
          dinheiro já está centralizado no pote — sem fichas voando por cima. */}
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
