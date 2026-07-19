// Um assento na mesa: nome, estilo, stack, cartas, última ação.
import { CardView, CardBack } from "./Card";
import { profileById } from "../bots/profiles";
import { toBB } from "../app/format";
import type { PlayerState } from "../game/state";

interface SeatProps {
  player: PlayerState;
  acting: boolean;
  reveal: boolean; // mostrar as cartas (showdown)
  lastAction?: string;
  bigBlind: number;
  style: React.CSSProperties;
}

export function Seat({ player, acting, reveal, lastAction, bigBlind, style }: SeatProps) {
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

  const archetype = player.profileId ? profileById(player.profileId).archetype : "VOCÊ";
  const folded = player.status === "folded";
  const showCards = player.isHero || reveal;
  const badgeClass = lastAction
    ? /Raise|Aposta|All-in/.test(lastAction)
      ? "badge aggro"
      : /Fold/.test(lastAction)
        ? "badge fold"
        : "badge"
    : "badge";

  return (
    <div
      className={`seat ${acting ? "acting" : ""} ${folded ? "folded" : ""} ${player.isHero ? "hero" : ""}`}
      style={style}
    >
      <div className="pod">
        <div className="name">{player.name}</div>
        <div className="arch">{archetype}</div>
        <div className="stack">{toBB(player.stack, bigBlind)}</div>
        <div className="hole">
          {player.holeCards.length === 0 || folded ? null : showCards ? (
            player.holeCards.map((c, i) => <CardView key={i} card={c} small />)
          ) : (
            <>
              <CardBack small />
              <CardBack small />
            </>
          )}
        </div>
        <div className={badgeClass}>{lastAction ?? " "}</div>
      </div>
    </div>
  );
}
