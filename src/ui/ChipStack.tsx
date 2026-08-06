// Pilha de fichas de pôquer em SVG puro (sem imagem, sem lib). Representa uma
// APOSTA na mesa (ou o pote) — a quantidade de fichas cresce com o tamanho
// relativo (em bb) e a cor segue a "denominação". O valor exato vai no rótulo.
import { useSettings } from "../app/settings";
import { fmtAmount } from "../app/format";

// branco · vermelho · verde · preto · roxo · ouro (do menor pro maior)
const CHIP_FILL = ["#e7ebee", "#d63b40", "#2ba25f", "#20242a", "#8b52c6", "#d4af37"];
const CHIP_RING = ["#aeb9c2", "#ff9a90", "#7fe0a6", "#5b636e", "#c9a6ea", "#f2dd85"];

function tierFor(bb: number): number {
  if (bb < 1) return 0;
  if (bb < 3) return 1;
  if (bb < 8) return 2;
  if (bb < 20) return 3;
  if (bb < 60) return 4;
  return 5;
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
  const ring = CHIP_RING[tier];

  const rx = 11;
  const ry = 4.2;
  const step = 5.2; // deslocamento vertical entre fichas empilhadas
  const cx = rx + 2;
  const w = cx + rx + 2;
  const h = ry * 2 + step * (count - 1) + 4;

  const chips = [];
  for (let i = 0; i < count; i++) {
    const cy = h - ry - 2 - i * step;
    chips.push(
      <g key={i}>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} stroke="rgba(0,0,0,.4)" strokeWidth="0.6" />
        <ellipse
          cx={cx}
          cy={cy - 0.5}
          rx={rx * 0.6}
          ry={ry * 0.6}
          fill="none"
          stroke={ring}
          strokeWidth="0.9"
          strokeDasharray="2 2"
          opacity="0.85"
        />
      </g>,
    );
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
