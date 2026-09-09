// Um assento na mesa: nome, posição, stack, cartas, última ação.
import { CardView, CardBack } from "./Card";
import { fmtAmount } from "../app/format";
import { useSettings } from "../app/settings";
import type { PlayerState } from "../game/state";
import "./tableHierarchy.css";

interface SeatProps {
  player: PlayerState;
  acting: boolean;
  reveal: boolean; // mostrar as cartas (showdown)
  lastAction?: string;
  bigBlind: number;
  style: React.CSSProperties;
  /** Posição na mesa (UTG, CO, BTN, SB, BB…). */
  position?: string;
  /** Ao final da mão, este jogador tem range pra ver (destaca o assento). */
  rangeMarked?: boolean;
  /** Levou (parte d)o pote nesta mão — destaca o assento vencedor. */
  winner?: boolean;
  /** Toque no assento → estatísticas (ou range, ao final da mão). */
  onSelect?: (seat: number) => void;
}

export function Seat({
  player,
  acting,
  reveal,
  lastAction,
  bigBlind,
  style,
  position,
  rangeMarked = false,
  winner = false,
  onSelect,
}: SeatProps) {
  const { unit } = useSettings();
  if (player.status === "out") {
    return (
      <div className="seat" style={style}>
        <div className="pod" style={{ opacity: 0.35 }}>
          <div className="name">{player.name}</div>
          <div className="stack">— sem fichas —</div>
        </div>
      </div>
    );
  }

  const folded = player.status === "folded";
  const showCards = player.isHero || reveal;
  const stackLabel = fmtAmount(player.stack, bigBlind, unit);
  // Avatar-monograma: inicial do nome + cor derivada do nome (determinística).
  // Não é foto/identidade real — é um selo gerado, só pra dar cara ao assento.
  const initial = (player.name.match(/[A-Za-z0-9]/)?.[0] ?? "?").toUpperCase();
  const avaHue = Array.from(player.name).reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  const avaStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, hsl(${avaHue} 32% 34%), hsl(${avaHue} 30% 20%))`,
  };
  const badgeClass = lastAction
    ? /Raise|Aposta|All-in/.test(lastAction)
      ? "badge aggro"
      : /Fold/.test(lastAction)
        ? "badge fold"
        : "badge"
    : "badge";

  return (
    <div
      className={`seat ${acting ? "acting" : ""} ${folded ? "folded" : ""} ${player.isHero ? "hero" : ""} ${rangeMarked ? "range-open" : ""} ${winner ? "winner" : ""}`}
      style={style}
    >
      <button
        type="button"
        className="pod pod-btn"
        onClick={() => onSelect?.(player.seat)}
        title={rangeMarked ? "Ver o range desta mão" : "Ver estatísticas"}
        aria-label={`${player.isHero ? "Você, " : ""}${position ? `${position}, ` : ""}${player.name}, stack ${stackLabel}`}
      >
        {player.isHero ? <div className="hero-kicker">VOCÊ</div> : null}
        {position ? <div className="pos-tag">{position}</div> : null}
        {rangeMarked ? <div className="range-flag">👁 range</div> : null}
        {/* Cartas no TOPO, "atrás" do avatar (estilo GG): o avatar sobe por cima. */}
        <div className="hole">
          {player.holeCards.length === 0 || folded ? null : showCards ? (
            // Herói: carta grande (índice no canto). Vilão revelado: carta pequena limpa.
            player.holeCards.map((c, i) => <CardView key={i} card={c} small={!player.isHero} />)
          ) : (
            <>
              <CardBack small />
              <CardBack small />
            </>
          )}
        </div>
        <div className="ava" style={avaStyle} aria-hidden="true">{initial}</div>
        <div className="name">{player.name}</div>
        <div className="stack">{stackLabel}</div>
        <div className={badgeClass}>{lastAction ?? " "}</div>
      </button>
    </div>
  );
}
