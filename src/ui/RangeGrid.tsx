// ---------------------------------------------------------------------------
// Visualizador de ranges em grade 13×13 (estilo GTO Wizard).
//
// Mostra, por posição, perfil e profundidade de stack, a AÇÃO recomendada
// para cada mão, colorida por categoria (padrão universal dos solvers):
//   - diagonal      = pares (AA, KK, ...)
//   - triângulo sup. = suited  (a carta mais alta manda)
//   - triângulo inf. = offsuit
//
// Categorias de ação (rodamos o próprio motor, spotRangeGrid — o que aparece
// na grade é EXATAMENTE o que o app recomenda no jogo):
//   dourado  = abrir (raise)        azul     = pagar/limp
//   vermelho = 3-bet/4-bet          cinza    = foldar
//   fatiada  = mão mista (mais de uma ação com frequência)
// ---------------------------------------------------------------------------

import { useMemo, useState } from "react";
import { spotRangeGrid, type SpotCategory } from "../ranges/spotGrid";
import { allHandTypes } from "../ranges/types";
import { stackDepthAdjust } from "../ranges/stackDepth";
import { PROFILES, BASELINE_PROFILE, profileById } from "../bots/profiles";

const RANKS = "AKQJT98765432".split(""); // alto → baixo
const OPEN_POSITIONS = ["UTG", "UTG1", "MP", "LJ", "HJ", "CO", "BTN", "SB"] as const;
const DEPTHS = [100, 40, 20, 12];

/** Tipo de mão canônico para a célula (linha i, coluna j) da grade. */
function cellHand(i: number, j: number): string {
  if (i === j) return RANKS[i] + RANKS[i];
  if (i < j) return RANKS[i] + RANKS[j] + "s"; // suited (triângulo superior)
  return RANKS[j] + RANKS[i] + "o"; // offsuit (triângulo inferior)
}

// ---------------------------------------------------------------------------
// Paleta de ações — padrão dos solvers + identidade da marca:
//   fold cinza · call azul · open laranja-dourado · 3bet/4bet vermelho
//   dourado = destaque da marca (all-in/abertura forte)
// ---------------------------------------------------------------------------
const CAT_COLORS: Record<SpotCategory, { base: string; text: string; label: string; border?: string }> = {
  open: { base: "rgba(230,196,84,{a})", text: "#15170e", label: "Abrir" },
  "3bet": { base: "rgba(239,68,68,{a})", text: "#ffffff", label: "3-bet" },
  "4bet": { base: "rgba(220,38,38,{a})", text: "#ffffff", label: "4-bet/all-in" },
  call: { base: "rgba(59,130,246,{a})", text: "#ffffff", label: "Pagar" },
  limp: { base: "rgba(59,130,246,{a})", text: "#e7eaf4", label: "Limp" },
  fold: { base: "#1f2416", text: "#6d7263", border: "#2d321f", label: "Foldar" },
};

interface CellInfo {
  hand: string;
  category: SpotCategory;
  freq: number; // 0..1 — frequência da categoria dominante (intensidade da cor)
  mix: { cat: SpotCategory; freq: number }[] | null; // ações alternativas, se mista
}

/** Estilo da célula: cor da categoria + intensidade da frequência. */
function cellStyle(info: CellInfo): React.CSSProperties {
  const { base, text } = CAT_COLORS[info.category];
  if (info.category === "fold")
    return { background: base, color: text, border: `1px solid ${CAT_COLORS.fold.border}` };
  const a = 0.55 + 0.45 * Math.min(1, info.freq); // dominante mais forte
  return { background: base.replace("{a}", String(a.toFixed(2))), color: text };
}

export function RangeGrid() {
  const [position, setPosition] = useState<(typeof OPEN_POSITIONS)[number]>("BTN");
  const [profileId, setProfileId] = useState<string>("baseline");
  const [depth, setDepth] = useState(100);
  const [selected, setSelected] = useState<CellInfo | null>(null);

  const profile = profileId === "baseline" ? BASELINE_PROFILE : profileById(profileId);
  const sd = stackDepthAdjust(depth, profile.adaptability);

  const grid = useMemo(
    () => spotRangeGrid({ heroPosition: position, effectiveBB: depth, profile }),
    [position, depth, profile],
  );

  const pctOpen = useMemo(() => {
    let n = 0;
    for (const cell of Object.values(grid)) if (cell.category !== "fold") n++;
    return Math.round((n / allHandTypes().length) * 100);
  }, [grid]);

  return (
    <div className="rangeview">
      <div className="panel">
        <h3>Ranges de abertura — grade 13×13</h3>

        <div className="rg-controls">
          <div className="t-field" style={{ margin: 0 }}>
            <label>Posição</label>
            <div className="t-btns">
              {OPEN_POSITIONS.map((p) => (
                <button
                  key={p}
                  className={`tab ${position === p ? "active" : ""}`}
                  onClick={() => {
                    setPosition(p);
                    setSelected(null);
                  }}
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
                  onClick={() => {
                    setDepth(d);
                    setSelected(null);
                  }}
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
          <b>{pctOpen}%</b> das mãos entram no pote em {position} ({profile.archetype}, {depth}bb)
          {sd.pushFold ? " · zona de push/fold (abrir = all-in)" : ""}
          {selected ? (
            <span className="rg-hover">
              {" · "}
              <b>{selected.hand}</b>
              {selected.mix && selected.mix.length > 1
                ? ` · ${selected.mix.map((m) => `${CAT_COLORS[m.cat].label} ${Math.round(m.freq * 100)}%`).join(" / ")}`
                : ` · ${CAT_COLORS[selected.category].label} ${Math.round(selected.freq * 100)}%`}
            </span>
          ) : (
            <span className="rg-note-soft">Toque numa célula para ver o detalhe da mão</span>
          )}
        </div>

        <div className="rg-grid">
          {Array.from({ length: 13 }, (_, i) =>
            Array.from({ length: 13 }, (_, j) => {
              const hand = cellHand(i, j);
              const cell = grid[hand];
              if (!cell) return null;
              const info: CellInfo = {
                hand,
                category: cell.category,
                freq: cell.freq,
                mix: null,
              };
              const isSelected = selected?.hand === hand;
              return (
                <div
                  key={`${i}-${j}`}
                  className={`rg-cell ${i === j ? "pair" : ""}${isSelected ? " selected" : ""}`}
                  style={cellStyle(info)}
                  onClick={() => setSelected(isSelected ? null : info)}
                >
                  {hand.replace("o", "").replace("s", "")}
                  <span className="rg-suit">{hand.endsWith("s") ? "s" : hand.endsWith("o") ? "o" : ""}</span>
                </div>
              );
            }),
          )}
        </div>

        <div className="rg-legend">
          <span className="rg-swatch" style={{ background: "rgba(230,196,84,0.9)", color: "#15170e" }} /> abrir
          <span className="rg-swatch" style={{ background: "rgba(239,68,68,0.85)", color: "#fff" }} /> 3-bet/4-bet
          <span className="rg-swatch" style={{ background: "rgba(59,130,246,0.85)", color: "#fff" }} /> pagar
          <span className="rg-swatch" style={{ background: "linear-gradient(90deg,rgba(230,196,84,1) 50%,rgba(59,130,246,1) 50%)", color: "#fff" }} /> mista
          <span className="rg-swatch" style={{ background: "#191c13", color: "#8b9084", border: "1px solid #2a2e1e" }} /> foldar
          <span className="rg-note">
            Suited no triângulo de cima (s), offsuit embaixo (o), pares na diagonal. Cada
            célula é pintada pela ação que o motor recomenda. Toque para ver a mão e as
            frequências — igual aos solvers profissionais.
          </span>
        </div>
      </div>
    </div>
  );
}
