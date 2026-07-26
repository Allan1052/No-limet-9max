// Grade 13×13 de um spot, colorida por categoria (abrir / 3-bet / call / fold)
// e com a mão real do jogador em destaque. Reaproveita o CSS .rg-grid/.rg-cell.

import type { SpotCell, SpotCategory } from "../ranges/spotGrid";

const RANKS = "AKQJT98765432".split(""); // alto → baixo

/** Tipo de mão da célula (i linha, j coluna), convenção padrão da grade. */
function cellHand(i: number, j: number): string {
  if (i === j) return RANKS[i] + RANKS[i];
  if (i < j) return RANKS[i] + RANKS[j] + "s";
  return RANKS[j] + RANKS[i] + "o";
}

const CAT_RGB: Record<Exclude<SpotCategory, "fold">, [number, number, number]> = {
  open: [212, 175, 55], // dourado
  "3bet": [201, 84, 74], // vermelho
  call: [76, 175, 125], // verde
  limp: [150, 128, 70], // dourado fraco
};

function cellStyle(cell: SpotCell): React.CSSProperties {
  if (cell.category === "fold") return { background: "#191c13", color: "#5f6350" };
  const [r, g, b] = CAT_RGB[cell.category];
  const alpha = 0.34 + 0.62 * Math.min(1, cell.freq);
  return { background: `rgba(${r},${g},${b},${alpha})`, color: "#12140c" };
}

export function SpotRangeGrid({
  cells,
  highlight,
}: {
  cells: Record<string, SpotCell>;
  highlight?: string;
}) {
  return (
    <div className="rg-grid spot-grid">
      {Array.from({ length: 13 }, (_, i) =>
        Array.from({ length: 13 }, (_, j) => {
          const hand = cellHand(i, j);
          const cell = cells[hand] ?? { hand, category: "fold" as const, freq: 0 };
          const isHl = highlight === hand;
          return (
            <div
              key={`${i}-${j}`}
              className={`rg-cell ${i === j ? "pair" : ""} ${isHl ? "hl" : ""}`}
              style={cellStyle(cell)}
              title={hand}
            >
              {hand.replace("o", "").replace("s", "")}
              <span className="rg-suit">{hand.endsWith("s") ? "s" : hand.endsWith("o") ? "o" : ""}</span>
            </div>
          );
        }),
      )}
    </div>
  );
}
