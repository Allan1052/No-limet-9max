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
import "./tableFullscreenRound2.css";
import "./coachV2Hint.css";

// Mesa em tela cheia é ALTA: os assentos ficam em 4 fileiras + herói embaixo,
// e a faixa do meio (≈43%-56%) fica VAZIA de propósito — é onde entram o pote e
// as cartas comunitárias. Antes havia assento em top:50%, exatamente na altura
// do board, e as 5 cartas cobriam os pods da esquerda e da direita.
const SEAT_POS: Array<{ top: string; left: string }> = [
  { top: "89%", left: "50%" },
  { top: "72%", left: "24%" },
  { top: "59%", left: "14%" },
  { top: "31%", left: "14%" },
  { top: "17%", left: "31%" },
  { top: "17%", left: "69%" },
  { top: "31%", left: "86%" },
  { top: "59%", left: "86%" },
  { top: "72%", left: "76%" },
];

// Mesas com MENOS de 9 jogadores (o caso do Review de torneio importado):
// usar só os N primeiros pontos do anel de 9 jogava todo mundo pra esquerda.
// Cada contagem tem o seu anel, sempre com o herói embaixo no centro e o resto
// distribuído de forma simétrica.
const SEAT_RINGS: Record<number, Array<{ top: string; left: string }>> = {
  2: [{ top: "89%", left: "50%" }, { top: "17%", left: "50%" }],
  3: [{ top: "89%", left: "50%" }, { top: "34%", left: "16%" }, { top: "34%", left: "84%" }],
  4: [{ top: "89%", left: "50%" }, { top: "60%", left: "14%" }, { top: "17%", left: "50%" }, { top: "60%", left: "86%" }],
  5: [{ top: "89%", left: "50%" }, { top: "68%", left: "16%" }, { top: "26%", left: "22%" }, { top: "26%", left: "78%" }, { top: "68%", left: "84%" }],
  6: [{ top: "89%", left: "50%" }, { top: "72%", left: "20%" }, { top: "34%", left: "14%" }, { top: "17%", left: "50%" }, { top: "34%", left: "86%" }, { top: "72%", left: "80%" }],
  7: [{ top: "89%", left: "50%" }, { top: "74%", left: "20%" }, { top: "45%", left: "12%" }, { top: "20%", left: "28%" }, { top: "20%", left: "72%" }, { top: "45%", left: "88%" }, { top: "74%", left: "80%" }],
  8: [{ top: "89%", left: "50%" }, { top: "76%", left: "22%" }, { top: "55%", left: "13%" }, { top: "26%", left: "16%" }, { top: "15%", left: "50%" }, { top: "26%", left: "84%" }, { top: "55%", left: "87%" }, { top: "76%", left: "78%" }],
};

function seatRing(count: number): Array<{ top: string; left: string }> {
  return SEAT_RINGS[count] ?? SEAT_POS;
}

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

/** P7 da auditoria: no fim da mão o pote ANDA até quem ganhou, em vez de
 *  simplesmente sumir. É o fecho visual da mão (e o que rende no vídeo). */
function PayoutChip({ to, amount, bigBlind }: { to: { top: string; left: string }; amount: number; bigBlind: number }) {
  const [go, setGo] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGo(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const pos = go ? to : POT_CENTER;
  return (
    <div className="chip-sweep chip-payout" style={{ top: pos.top, left: pos.left }}>
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
  // Anel de assentos do tamanho da mesa (9-max no jogo, N no review importado).
  const ring = seatRing(table.players.length);

  const [sweeps, setSweeps] = useState<Array<{ id: string; from: { top: string; left: string }; amount: number }>>([]);
  // Chave que muda a cada mão encerrada: força o pote a "andar" de novo em vez
  // de reaproveitar o elemento já animado da mão anterior.
  const [payoutKey, setPayoutKey] = useState(0);
  const wasOver = useRef(false);
  useEffect(() => {
    if (table.handOver && !wasOver.current) setPayoutKey((k) => k + 1);
    wasOver.current = table.handOver;
  }, [table.handOver]);
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
          const pos = seatRing(table.players.length)[p.seat];
          if (pos) born.push({ id: `${p.seat}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, from: towardCenter(pos, 0.36), amount: before });
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
  const leaveTable = () => window.dispatchEvent(new CustomEvent("nav-to", { detail: "treino" }));
  // "Ver dicas" fica num canto FIXO do feltro (CSS) — antes ele seguia o
  // jogador da vez e acabava cobrindo os pods.

  return (
    <div className={`table-wrap table-modern ${celebrate ? "celebrate" : ""}`}>
      {!readOnly ? (
        <button className="play-exit-btn" type="button" aria-label="Sair da mesa" title="Sair da mesa" onClick={leaveTable}>×</button>
      ) : null}

      <div className="felt">
        <div className="table-surface-glow" />
        <div className="table-brand-mark">
          <img src={`${getBasePath()}brand-logo-splash.png`} alt="" aria-hidden="true" />
          <span className="brand-word" aria-hidden="true">Call ou Fold</span>
        </div>
      </div>

      <div className="tbl-center-col">
        {hint ? <div className="tbl-hint">💡 {hint}</div> : null}
        <Board
          board={table.board}
          pot={table.players.reduce((s, p) => s + p.totalCommitted, 0)}
          chipPot={table.handOver ? table.players.reduce((s, p) => s + p.totalCommitted, 0) : table.players.reduce((s, p) => s + p.totalCommitted - p.committed, 0)}
          bigBlind={table.bigBlind}
          inline
          buyIn={buyIn}
        />
      </div>

      {onShowTips ? (
        <button
          className={`tbl-tips-btn${showTips ? " has-feedback" : ""}`}
          onClick={onShowTips}
        >
          💡 {t("tips.button")}
        </button>
      ) : null}

      {updateReady ? (
        <button className="tbl-update-btn" onClick={onUpdate}>
          ✨ {t("update.button")}
        </button>
      ) : null}

      {table.players.map((p) => {
        const pos = ring[p.seat] ?? { top: "50%", left: "50%" };
        const isOmaha = table.variant === "omaha";
        const SeatComponent = isOmaha ? OmahaSeat : Seat;
        const acting = replayActorSeat != null ? replayActorSeat === p.seat : table.toAct === p.seat && !table.handOver;
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
            winner={(table.result?.winningsBySeat?.[p.seat] ?? 0) > 0}
            onSelect={readOnly ? undefined : onSelectSeat}
            style={{ top: pos.top, left: pos.left }}
            isOmaha={isOmaha}
          />
        );
      })}

      {table.players.map((p) => {
        if (table.handOver) return null;
        if (!p.committed || p.committed <= 0 || p.status === "out") return null;
        const pos = ring[p.seat];
        if (!pos) return null;
        // A ficha do HERÓI sai um pouco mais pro centro: o pod dele é o mais
        // alto (cartas grandes) e a ficha caía em cima das cartas no review.
        const b = towardCenter(pos, p.isHero ? 0.45 : 0.36);
        return <div key={`bet-${p.seat}`} className={`seat-bet${p.isHero ? " seat-bet-hero" : ""}`} style={{ top: b.top, left: b.left }}><ChipStack amount={p.committed} bigBlind={table.bigBlind} /></div>;
      })}

      {table.handOver ? null : sweeps.map((s) => <SweepChip key={s.id} from={s.from} amount={s.amount} bigBlind={table.bigBlind} />)}

      {/* Pote -> vencedor (só quando a mão acaba e alguém levou fichas). */}
      {table.handOver && table.result
        ? Object.entries(table.result.winningsBySeat).flatMap(([seat, amount]) => {
            const n = Number(seat);
            const pos = ring[n];
            if (!pos || !(amount > 0)) return [];
            return [
              <PayoutChip
                key={`payout-${payoutKey}-${n}`}
                to={towardCenter(pos, 0.30)}
                amount={amount}
                bigBlind={table.bigBlind}
              />,
            ];
          })
        : null}

      {(() => {
        const pos = ring[table.buttonSeat];
        if (!pos) return null;
        const b = towardCenter(pos, 0.28);
        return <div className="dealer-btn" style={{ top: b.top, left: b.left }}>D</div>;
      })()}
    </div>
  );
}
