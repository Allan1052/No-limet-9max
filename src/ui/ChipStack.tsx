// Pilha de fichas de pôquer em SVG puro (sem imagem, sem lib). Representa uma
// APOSTA na mesa (ou o pote). A quantidade de fichas cresce com o tamanho
// relativo (em bb); a cor segue a "denominação". O valor exato vai no rótulo.
//
// Cada ficha tem cara de ficha de verdade: corpo, marcações na borda (as
// "casinhas" claras do aro) e um anel interno. As fichas empilham com um leve
// desencontro horizontal, pra parecer pilha feita na mão.
import { useSettings } from "../app/settings";
import { fmtAmount } from "../app/format";

// branco · vermelho · verde · preto · roxo · ouro (do menor pro maior)
const CHIP_FILL = ["#eef1f4", "#c62f34", "#1f9552", "#23262c", "#7d46b8", "#d4af37"];
const CHIP_EDGE = ["#c9d2da", "#f0a6a6", "#8ce0ac", "#565a63", "#c6a3ea", "#f2dd85"];

function tierFor(bb: number): number {
  if (bb < 1) return 0;
  if (bb < 3) return 1;
  if (bb < 8) return 2;
  if (bb < 20) return 3;
  if (bb < 60) return 4;
  return 5;
}

/** Uma ficha isolada (vista em leve perspectiva). */
function Chip({ cx, cy, rx, ry, fill, edge }: { cx: number; cy: number; rx: number; ry: number; fill: string; edge: string }) {
  return (
    <g>
      {/* espessura (aro embaixo) */}
      <ellipse cx={cx} cy={cy + ry * 0.34} rx={rx} ry={ry} fill="rgba(0,0,0,.45)" />
      {/* corpo */}
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} stroke="rgba(0,0,0,.55)" strokeWidth="0.5" />
      {/* casinhas do aro (borda tracejada clara) */}
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx * 0.92}
        ry={ry * 0.92}
        fill="none"
        stroke={edge}
        strokeWidth={ry * 0.5}
        strokeDasharray={`${rx * 0.34} ${rx * 0.34}`}
        opacity="0.9"
      />
      {/* anel interno */}
      <ellipse cx={cx} cy={cy} rx={rx * 0.52} ry={ry * 0.52} fill="none" stroke={edge} strokeWidth="0.5" opacity="0.75" />
      {/* brilho */}
      <ellipse cx={cx - rx * 0.3} cy={cy - ry * 0.32} rx={rx * 0.28} ry={ry * 0.28} fill="rgba(255,255,255,.25)" />
    </g>
  );
}

export function ChipStack({
  amount,
  bigBlind,
  showLabel = true,
  className = "",
}: {
  amount: number;
  bigBlind: number;
  showLabel?: boolean;
  className?: string;
}) {
  const { unit } = useSettings();
  if (!amount || amount <= 0) return null;

  const bb = amount / (bigBlind || 1);
  const tier = tierFor(bb);
  const count = Math.min(5, tier + 1); // 1..5 fichas visíveis
  const fill = CHIP_FILL[tier];
  const edge = CHIP_EDGE[tier];

  // Menor que a v1: fichas mais compactas.
  const rx = 8;
  const ry = 3;
  const step = 3.6; // deslocamento vertical entre fichas
  const jitter = [0, 0.7, -0.5, 0.4, -0.6]; // desencontro horizontal (pilha "na mão")
  const cx = rx + 2.5;
  const w = cx + rx + 3;
  const h = ry * 2 + step * (count - 1) + 5;

  const chips = [];
  for (let i = 0; i < count; i++) {
    const cy = h - ry - 2 - i * step;
    chips.push(<Chip key={i} cx={cx + (jitter[i] ?? 0)} cy={cy} rx={rx} ry={ry} fill={fill} edge={edge} />);
  }

  return (
    <div className={`chipstack ${className}`}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        {chips}
      </svg>
      {showLabel ? <span className="chipstack-amt">{fmtAmount(amount, bigBlind, unit)}</span> : null}
    </div>
  );
}
