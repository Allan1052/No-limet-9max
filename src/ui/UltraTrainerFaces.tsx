// ---------------------------------------------------------------------------
// Vilões do Treino 1×1 e do Street Trainer (compartilhado).
// O "carrasco": um vilão sorteado por sessão. Só flavor — não muda a matemática.
// ---------------------------------------------------------------------------
import type { TransKey } from "../i18n/translations";

export const VILLAINS = [
  { id: "shark", emoji: "🦈", nameKey: "ultra.v.shark.name", tauntKey: "ultra.v.shark.taunt" },
  { id: "reaper", emoji: "", art: "hood", nameKey: "ultra.v.reaper.name", tauntKey: "ultra.v.reaper.taunt" },
  { id: "ice", emoji: "🧊", nameKey: "ultra.v.ice.name", tauntKey: "ultra.v.ice.taunt" },
  { id: "seer", emoji: "👁️", nameKey: "ultra.v.seer.name", tauntKey: "ultra.v.seer.taunt" },
  { id: "hurricane", emoji: "🌪️", nameKey: "ultra.v.hurricane.name", tauntKey: "ultra.v.hurricane.taunt" },
  { id: "ghost", emoji: "🎭", nameKey: "ultra.v.ghost.name", tauntKey: "ultra.v.ghost.taunt" },
] as const satisfies ReadonlyArray<{
  id: string;
  emoji: string;
  art?: string;
  nameKey: TransKey;
  tauntKey: TransKey;
}>;

export type Villain = (typeof VILLAINS)[number];
export const pickVillain = (): Villain => VILLAINS[Math.floor(Math.random() * VILLAINS.length)];

// Rosto encapuzado de óculos escuros — o "hustler" anônimo (usado por O Ceifador).
export function HoodedFace({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden focusable="false">
      <defs>
        <linearGradient id="hoodGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#232830" />
          <stop offset="1" stopColor="#0b0d11" />
        </linearGradient>
      </defs>
      <path
        d="M50 5C29 5 18 24 18 51c0 28 14 45 32 45s32-17 32-45C82 24 71 5 50 5Z"
        fill="url(#hoodGrad)"
        stroke="#3c414b"
        strokeWidth="1.5"
      />
      <ellipse cx="50" cy="55" rx="22" ry="28" fill="#2b3038" />
      <path d="M28 50C28 30 37 18 50 18s22 12 22 32Z" fill="#0c0e12" opacity="0.9" />
      <g fill="#0a0b0d">
        <rect x="29" y="47" width="17" height="12" rx="5" />
        <rect x="54" y="47" width="17" height="12" rx="5" />
        <rect x="45" y="50" width="10" height="3.5" rx="1.6" />
      </g>
      <rect x="32" y="49" width="6" height="3" rx="1.5" fill="#7cc0ff" opacity="0.5" />
      <rect x="57" y="49" width="6" height="3" rx="1.5" fill="#7cc0ff" opacity="0.5" />
    </svg>
  );
}
