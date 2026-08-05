// ---------------------------------------------------------------------------
// Arena 1×1 — o "duelo" heads-up com o rival fotorrealista, pote e VS.
// Componente visual compartilhado (Missão e, no futuro, outros modos), pra dar
// a cara da marca aos treinos. Só apresentação — a matemática vem de fora.
// Agora com avatares fotorrealistas tanto do rival quanto do herói.
// ---------------------------------------------------------------------------
import { useMemo } from "react";
import { CardView, CardBack } from "./Card";
import { useT } from "../i18n";
import type { TransKey } from "../i18n/translations";
import { isCorrect } from "../train/scenarios";
import type { ScenarioSpec } from "../train/scenarios";
import type { FeedbackItem } from "../feedback/analyzer";
import type { Card } from "../engine/cards";

// Vilões (só flavor). Um é sorteado por estágio e vira o "carrasco" da vez.
const VILLAINS = [
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

export type DuelVillain = (typeof VILLAINS)[number];
export const pickDuelVillain = (): DuelVillain =>
  VILLAINS[Math.floor(Math.random() * VILLAINS.length)];
// O encapuzado anônimo — a cara da marca (usado como desafiante da Missão).
export const HOODED_VILLAIN: DuelVillain = VILLAINS[1];

export function HoodedFace({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden focusable="false">
      <defs>
        <linearGradient id="duelHoodGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#232830" />
          <stop offset="1" stopColor="#0b0d11" />
        </linearGradient>
      </defs>
      <path
        d="M50 5C29 5 18 24 18 51c0 28 14 45 32 45s32-17 32-45C82 24 71 5 50 5Z"
        fill="url(#duelHoodGrad)"
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

// Rival avatar data — passed in from CampaignView for photorealistic rivals
export interface RivalAvatar {
  image: string;
  color: string;
  name: string;
  taunt: string;
}

export function DuelArena({
  spec,
  hand,
  result,
  villain,
  rivalAvatar,
  heroAvatar,
}: {
  spec: ScenarioSpec;
  hand: Card[];
  result: FeedbackItem | null;
  villain: DuelVillain;
  rivalAvatar?: RivalAvatar;
  heroAvatar?: { image: string; color: string };
}) {
  const { t } = useT();
  const openSize = spec.openSizeBB ?? 2.3;
  const potBB = Math.round((1.5 + (spec.raiserPosition ? openSize : 0)) * 10) / 10;

  // Fichas voando pro carrasco quando ele leva o pote (você errou).
  const potChips = useMemo(() => {
    if (!result || isCorrect(result)) return [];
    const colors = ["red", "blue", "green", "black", "gold"];
    return Array.from({ length: 18 }, (_, i) => ({
      dx: Math.round((Math.random() - 0.5) * 140),
      delay: Math.round(Math.random() * 420),
      dur: 820 + Math.round(Math.random() * 560),
      rot: Math.round((Math.random() - 0.5) * 340),
      color: colors[i % colors.length],
    }));
  }, [result]);

  return (
    <div className={`arena ${result ? (isCorrect(result) ? "won" : "lost") : ""}`}>
      <div className="arena-top">
        <span className="arena-title">🏆 {t("ultra.mainEvent")}</span>
        <span className="arena-badges">
          <span className="arena-ring">{t("ultra.fullring")}</span>
          <span className="arena-headsup">{t("ultra.headsup")}</span>
        </span>
      </div>

      <div className="duel spotlight">
        <div className="duel-seat villain terror">
          <div className="villain-av" style={rivalAvatar ? {
            borderColor: rivalAvatar.color,
            boxShadow: `0 0 16px ${rivalAvatar.color}66`,
            animation: "none",
          } : undefined}>
            {rivalAvatar ? (
              <img src={rivalAvatar.image} alt="" className="villain-av-img" />
            ) : (
              <>
                {"art" in villain ? <HoodedFace /> : <span className="villain-emoji">{villain.emoji}</span>}
              </>
            )}
            {spec.raiserPosition ? <span className="duel-pos vil">{spec.raiserPosition}</span> : null}
          </div>
          <div className="villain-name" style={rivalAvatar ? { color: rivalAvatar.color } : undefined}>
            {rivalAvatar ? rivalAvatar.name : t(villain.nameKey)}
          </div>
          <div className="duel-substack">{spec.effectiveBB}bb</div>
          <div className="villain-taunt">
            {result
              ? isCorrect(result)
                ? t("ultra.survive")
                : t("ultra.gloat")
              : rivalAvatar
                ? `"${rivalAvatar.taunt}"`
                : `“${t(villain.tauntKey)}”`}
          </div>
          <div className="duel-cards">
            <CardBack small />
            <CardBack small />
          </div>
          <div className={`duel-badge ${spec.raiserPosition ? "aggro" : "wait"}`}>
            {spec.raiserPosition ? t("ultra.opened", { size: openSize }) : t("ultra.waiting")}
          </div>
        </div>

        <div className="duel-center">
          <div className="duel-chip" aria-hidden />
          <div className="duel-pot">{t("ultra.pot", { bb: potBB })}</div>
          <div className="duel-vs">VS</div>
        </div>

        <div className="duel-seat hero">
          {/* Avatar do herói na mesa */}
          {heroAvatar ? (
            <div className="duel-hero-av" style={{ borderColor: heroAvatar.color }}>
              <img src={heroAvatar.image} alt="" className="hero-av-img" />
            </div>
          ) : null}
          <div className="duel-badge turn">{t("ultra.yourTurn")}</div>
          <div className="duel-cards big">
            {hand.map((c, i) => (
              <CardView key={i} card={c} />
            ))}
          </div>
          <div className="duel-name">
            <span className="duel-pos hero">{spec.heroPosition}</span>
            {t("ultra.you")} · {spec.effectiveBB}bb
          </div>
        </div>

        {potChips.length > 0 ? (
          <div className="chips-fly" aria-hidden>
            {potChips.map((c, i) => (
              <span
                key={i}
                className={`chip ${c.color}`}
                style={
                  {
                    "--dx": `${c.dx}px`,
                    "--rot": `${c.rot}deg`,
                    animationDelay: `${c.delay}ms`,
                    animationDuration: `${c.dur}ms`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
