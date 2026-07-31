import { CardView, CardBack } from "./Card";
import { fmtAmount } from "../app/format";
import { useSettings } from "../app/settings";
import type { PlayerState } from "../game/state";

interface OmahaSeatProps {
  player: PlayerState;
  acting: boolean;
  reveal: boolean; // mostrar as cartas (showdown)
  lastAction?: string;
  bigBlind: number;
  style: React.CSSProperties;
  position?: string;
  rangeMarked?: boolean;
  onSelect?: (seat: number) => void;
  isOmaha?: boolean; // Indica se é Omaha (4 cartas)
}

export function OmahaSeat({
  player,
  acting,
  reveal,
  lastAction,
  bigBlind,
  style,
  position,
  rangeMarked = false,
  onSelect,
  isOmaha = false,
}: OmahaSeatProps) {
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
  const badgeClass = lastAction
    ? /Raise|Aposta|All-in/.test(lastAction)
      ? "badge aggro"
      : /Fold/.test(lastAction)
        ? "badge fold"
        : "badge"
    : "badge";

  // Para Omaha, exibir 4 cartas em um grid 2x2
  const renderOmahaCards = () => {
    if (player.holeCards.length === 0 || folded) return null;
    
    if (showCards) {
      return (
        <div className="hole-omaha">
          {player.holeCards.slice(0, 4).map((c, i) => (
            <CardView key={i} card={c} small />
          ))}
        </div>
      );
    } else {
      return (
        <div className="hole-omaha">
          {[0, 1, 2, 3].map((i) => (
            <CardBack key={i} small />
          ))}
        </div>
      );
    }
  };

  // Para Texas Hold'em, exibir 2 cartas
  const renderTexasCards = () => {
    if (player.holeCards.length === 0 || folded) return null;
    
    if (showCards) {
      return player.holeCards.map((c, i) => <CardView key={i} card={c} small />);
    } else {
      return (
        <>
          <CardBack small />
          <CardBack small />
        </>
      );
    }
  };

  return (
    <div
      className={`seat ${acting ? "acting" : ""} ${folded ? "folded" : ""} ${player.isHero ? "hero" : ""} ${rangeMarked ? "range-open" : ""} ${isOmaha ? "omaha" : ""}`}
      style={style}
    >
      <button
        type="button"
        className="pod pod-btn"
        onClick={() => onSelect?.(player.seat)}
        title={rangeMarked ? "Ver o range desta mão" : "Ver estatísticas"}
      >
        {position ? <div className="pos-tag">{position}</div> : null}
        {rangeMarked ? <div className="range-flag">👁 range</div> : null}
        <div className="name">{player.name}</div>
        <div className="stack">{fmtAmount(player.stack, bigBlind, unit)}</div>
        <div className="hole">
          {isOmaha ? renderOmahaCards() : renderTexasCards()}
        </div>
        <div className={badgeClass}>{lastAction ?? " "}</div>
      </button>
    </div>
  );
}
