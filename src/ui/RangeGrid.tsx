// ---------------------------------------------------------------------------
// Visualizador de ranges em grade 13×13 (estilo GTO Wizard).
//
// Mostra, por posição, perfil e profundidade de stack, quais mãos abrir (RFI),
// coloridas pela FREQUÊNCIA de abertura. Convenção padrão da grade:
//   - diagonal      = pares (AA, KK, ...)
//   - triângulo sup. = suited  (a carta mais alta manda)
//   - triângulo inf. = offsuit
//
// Cor: escala sequencial de UMA cor (dourado) — quanto mais opaco, maior a
// frequência. Fora do range = cinza-escuro. Texto sempre com contraste.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { rfiRange } from "../ranges/charts/rfi";
import { rangePercent, type Position, type Range } from "../ranges/types";
import { stackDepthAdjust } from "../ranges/stackDepth";
import { PROFILES, BASELINE_PROFILE, profileById } from "../bots/profiles";

const RANKS = "AKQJT98765432".split(""); // alto → baixo
const OPEN_POSITIONS: Position[] = ["UTG", "UTG1", "MP", "LJ", "HJ", "CO", "BTN", "SB"];
const DEPTHS = [100, 40, 20, 12];

/** Tipo de mão canônico para a célula (linha i, coluna j) da grade. */
function cellHand(i: number, j: number): string {
  if (i === j) return RANKS[i] + RANKS[i];
  if (i < j) return RANKS[i] + RANKS[j] + "s"; // suited (triângulo superior)
  return RANKS[j] + RANKS[i] + "o"; // offsuit (triângulo inferior)
}

function cellStyle(freq: number): React.CSSProperties {
  if (freq <= 0) return { background: "#191c13", color: "#5f6350" };
  const alpha = 0.28 + 0.72 * Math.min(1, freq); // sequencial: mais freq = mais dourado
  return { background: `rgba(212,175,55,${alpha})`, color: "#15170e" };
}

export function RangeGrid() {
  const [position, setPosition] = useState<Position>("BTN");
  const [profileId, setProfileId] = useState<string>("baseline");
  const [depth, setDepth] = useState(100);
  const [hover, setHover] = useState<{ hand: string; freq: number } | null>(null);

  const profile = profileId === "baseline" ? BASELINE_PROFILE : profileById(profileId);
  const sd = stackDepthAdjust(depth, profile.adaptability);
  const range: Range = rfiRange(position, {
    widthFactor: profile.rfiWidth,
    stackFactor: sd.factor,
  });
  const pctOpen = Math.round(rangePercent(range) * 100);

  return (
    <div className="rangeview">
      <div className="panel">
        <h3>Ranges de abertura (RFI) — grade 13×13</h3>

        <div className="rg-controls">
          <div className="t-field" style={{ margin: 0 }}>
            <label>Posição</label>
            <div className="t-btns">
              {OPEN_POSITIONS.map((p) => (
                <button
                  key={p}
                  className={`tab ${position === p ? "active" : ""}`}
                  onClick={() => setPosition(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="t-field" style={{ margin: 0 }}>
            <label>Profundidade</label>
            <div className="t-btns">
              {DEPTHS.map((d) => (
                <button
                  key={d}
                  className={`tab ${depth === d ? "active" : ""}`}
                  onClick={() => setDepth(d)}
                >
                  {d}bb
                </button>
              ))}
            </div>
          </div>

          <div className="t-field" style={{ margin: 0 }}>
            <label>Perfil</label>
            <select value={profileId} onChange={(e) => setProfileId(e.target.value)}>
              <option value="baseline">Base (quase-GTO)</option>
              {PROFILES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rg-status">
          <b>{pctOpen}%</b> das mãos abertas em {position} ({profile.archetype}, {depth}bb)
          {sd.pushFold ? " · zona de push/fold (abrir = all-in)" : ""}
          {hover ? (
            <span className="rg-hover">
              {" · "}
              <b>{hover.hand}</b>: {Math.round(hover.freq * 100)}%
            </span>
          ) : null}
        </div>

        <div className="rg-grid" onMouseLeave={() => setHover(null)}>
          {Array.from({ length: 13 }, (_, i) =>
            Array.from({ length: 13 }, (_, j) => {
              const hand = cellHand(i, j);
              const freq = range[hand] ?? 0;
              return (
                <div
                  key={`${i}-${j}`}
                  className={`rg-cell ${i === j ? "pair" : ""}`}
                  style={cellStyle(freq)}
                  onMouseEnter={() => setHover({ hand, freq })}
                >
                  {hand.replace("o", "").replace("s", "")}
                  <span className="rg-suit">{hand.endsWith("s") ? "s" : hand.endsWith("o") ? "o" : ""}</span>
                </div>
              );
            }),
          )}
        </div>

        <div className="rg-legend">
          <span className="rg-swatch" style={{ background: "#191c13" }} /> foldar
          <span className="rg-swatch" style={{ background: "rgba(212,175,55,0.4)" }} /> mistura
          <span className="rg-swatch" style={{ background: "rgba(212,175,55,1)" }} /> abrir sempre
          <span className="rg-note">
            Suited no triângulo de cima, offsuit embaixo, pares na diagonal. Troque o
            perfil para ver o LAG abrir mais largo e o TAG mais fechado.
          </span>
        </div>
      </div>
    </div>
  );
}
