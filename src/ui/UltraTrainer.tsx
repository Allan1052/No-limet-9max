// ---------------------------------------------------------------------------
// Ultra · Treino 1×1 personalizado.
//
// Você escolhe: sua posição, se abre ou enfrenta a abertura de um vilão (e de
// qual posição), e a média de fichas (stack em bb). O app sorteia uma mão,
// você decide, e recebe a nota + a GRADE de range daquele spot com a sua mão
// destacada. Reaproveita o mesmo motor do jogo — nada de regra nova.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from "react";
import { CardView, CardBack } from "./Card";
import { SpotRangeGrid } from "./SpotRangeGrid";
import { useT } from "../i18n";
import type { TransKey } from "../i18n/translations";
import { spotRangeGrid } from "../ranges/spotGrid";
import type { HandLabSpec } from "../train/stage";
import { BASELINE_PROFILE } from "../bots/profiles";
import { POSITIONS, comboToHandType, type Position } from "../ranges/types";
import {
  buildScenarioFromSpec,
  evaluateChoice,
  isCorrect,
  type Scenario,
  type ScenarioSpec,
} from "../train/scenarios";
import { markActiveToday } from "../train/streak";
import { recordDecision } from "../train/decisionStats";
import { drawSpotImage } from "../app/handImage";
import { shareSpot } from "../app/share";
import type { FeedbackItem } from "../feedback/analyzer";

const STACK_PRESETS = [10, 20, 40, 60, 100];

// O "carrasco": o vilão que faz suas fichas sangrarem. Um é sorteado por sessão
// e vira o seu terror pessoal do heads-up. Só flavor — não muda a matemática.
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

type Villain = (typeof VILLAINS)[number];
const pickVillain = (): Villain => VILLAINS[Math.floor(Math.random() * VILLAINS.length)];

// Rosto encapuzado de óculos escuros — o "hustler" anônimo (usado por O Ceifador).
function HoodedFace({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden focusable="false">
      <defs>
        <linearGradient id="hoodGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#232830" />
          <stop offset="1" stopColor="#0b0d11" />
        </linearGradient>
      </defs>
      {/* silhueta do capuz */}
      <path
        d="M50 5C29 5 18 24 18 51c0 28 14 45 32 45s32-17 32-45C82 24 71 5 50 5Z"
        fill="url(#hoodGrad)"
        stroke="#3c414b"
        strokeWidth="1.5"
      />
      {/* abertura do rosto (em sombra) */}
      <ellipse cx="50" cy="55" rx="22" ry="28" fill="#2b3038" />
      {/* sombra do capuz sobre a testa */}
      <path d="M28 50C28 30 37 18 50 18s22 12 22 32Z" fill="#0c0e12" opacity="0.9" />
      {/* óculos escuros */}
      <g fill="#0a0b0d">
        <rect x="29" y="47" width="17" height="12" rx="5" />
        <rect x="54" y="47" width="17" height="12" rx="5" />
        <rect x="45" y="50" width="10" height="3.5" rx="1.6" />
      </g>
      {/* brilho nas lentes */}
      <rect x="32" y="49" width="6" height="3" rx="1.5" fill="#7cc0ff" opacity="0.5" />
      <rect x="57" y="49" width="6" height="3" rx="1.5" fill="#7cc0ff" opacity="0.5" />
    </svg>
  );
}

export function UltraTrainer() {
  const { t } = useT();
  const [prefill, setPrefill] = useState<ScenarioSpec | null>(null);

  // "Treinar esse spot" da Sua Mão: o HandLab grava o spec do spot
  // (cof-sua-mao-spec) e dispara cof-open-ultra — aqui ele é capturado
  // e a sessão 1×1 começa já configurada no spot analisado.
  useEffect(() => {
    // O spec da Sua Mão é um HandLabSpec (da análise) — converte pra um
    // ScenarioSpec do Treino 1×1 (mesmos campos de posição/stack/abertura).
    const readSpec = (): ScenarioSpec | null => {
      const raw = localStorage.getItem("cof-sua-mao-spec");
      if (!raw) return null;
      try {
        const s = JSON.parse(raw) as HandLabSpec;
        return {
          heroPosition: s.heroPosition,
          effectiveBB: s.stackBB,
          raiserPosition: s.situation === "open" ? undefined : s.villainPosition,
          openSizeBB: s.situation === "vsopen" ? 2.3 : s.situation === "vs3bet" ? 6 : undefined,
        } as ScenarioSpec;
      } catch {
        return null;
      }
    };
    // Se já veio de fora (link/navegação), aplica logo no mount.
    const existing = readSpec();
    if (existing) {
      localStorage.removeItem("cof-sua-mao-spec");
      setPrefill(existing);
    }
    const onOpenUltra = () => {
      const spec = readSpec();
      localStorage.removeItem("cof-sua-mao-spec");
      if (spec) setPrefill(spec);
    };
    window.addEventListener("cof-open-ultra", onOpenUltra);
    return () => window.removeEventListener("cof-open-ultra", onOpenUltra);
  }, []);

  useEffect(() => {
    if (!prefill) return;
    // A mão pré-configurada vira uma sessão 1×1 determinística (mesmo spot).
    setHeroPos(prefill.heroPosition);
    // Se há aberta, a posição do vilão vem do spec; senão mantém a atual (CO).
    setVillainPos((cur) => (prefill.raiserPosition != null ? prefill.raiserPosition! : cur));
    setFacing(prefill.raiserPosition != null);
    setEffBB(prefill.effectiveBB);
    setVillain(pickVillain());
    setScenario(buildScenarioFromSpec(prefill, Math.random));
    setPrefill(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  const [heroPos, setHeroPos] = useState<Position>("BTN");
  const [facing, setFacing] = useState(true); // true = vilão abre; false = você abre
  const [villainPos, setVillainPos] = useState<Position>("CO");
  const [effBB, setEffBB] = useState(40);

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [result, setResult] = useState<FeedbackItem | null>(null);
  const [session, setSession] = useState({ correct: 0, total: 0 });
  const [villain, setVillain] = useState<Villain>(VILLAINS[0]);

  const specFrom = (): ScenarioSpec => ({
    heroPosition: heroPos,
    effectiveBB: effBB,
    raiserPosition: facing ? villainPos : undefined,
    openSizeBB: facing ? 2.3 : undefined,
  });

  const start = () => {
    setResult(null);
    setSession({ correct: 0, total: 0 });
    setVillain(pickVillain()); // novo carrasco a cada sessão de treino
    setScenario(buildScenarioFromSpec(specFrom(), Math.random));
  };
  const next = () => {
    setResult(null);
    setScenario(buildScenarioFromSpec(specFrom(), Math.random));
  };
  const back = () => {
    setScenario(null);
    setResult(null);
  };
  const appUrl =
    typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
  const onShareHit = async () => {
    if (!scenario) return;
    const sp = scenario.spec;
    const img = await drawSpotImage({
      hand: scenario.hand,
      title: t("share.hitTitle"),
      context: `${sp.heroPosition} · ${sp.effectiveBB}bb`,
      question: t("share.hitQuestion"),
      footer: t("share.hitFooter"),
    });
    await shareSpot(img, appUrl, t("share.hitText"), t("disclaimer"));
  };
  const choose = (key: "fold" | "call" | "raise" | "allin") => {
    if (!scenario || result) return;
    const item = evaluateChoice(scenario, key);
    const ok = isCorrect(item);
    setResult(item);
    markActiveToday();
    recordDecision(key);
    setSession((s) => ({ correct: s.correct + (ok ? 1 : 0), total: s.total + 1 }));
    // Errou = o carrasco leva o pote. Um tranco háptico pra doer de verdade.
    if (!isCorrect(item)) {
      try {
        navigator.vibrate?.([45, 35, 110]);
      } catch {
        /* sem vibração — segue só o visual */
      }
    }
  };

  // Fichas voando pro carrasco quando ele leva o pote (você errou).
  // Geradas por resultado: espalhamento, atraso e giro aleatórios, estáveis no render.
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

  // Grade do spot (só depois de responder, pra não entregar a resposta antes).
  const cells = useMemo(() => {
    if (!scenario) return null;
    const s = scenario.spec;
    return spotRangeGrid({
      heroPosition: s.heroPosition,
      effectiveBB: s.effectiveBB,
      profile: BASELINE_PROFILE,
      raiserPosition: s.raiserPosition,
      openSizeBB: s.openSizeBB,
    });
  }, [scenario]);

  // ---------- Configuração ----------
  if (!scenario) {
    return (
      <div className="train-view">
        <div className="panel ultra-panel">
          <div className="ultra-badge">✨ {t("ultra.badge")}</div>
          <h3>{t("ultra.title")}</h3>
          <p className="ultra-sub">{t("ultra.subtitle")}</p>

          <label className="ultra-field">
            <span>{t("ultra.heroPos")}</span>
            <select value={heroPos} onChange={(e) => setHeroPos(e.target.value as Position)}>
              {POSITIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>

          <label className="ultra-field">
            <span>{t("ultra.situation")}</span>
            <select value={facing ? "vs" : "rfi"} onChange={(e) => setFacing(e.target.value === "vs")}>
              <option value="vs">{t("ultra.vs")}</option>
              <option value="rfi">{t("ultra.rfi")}</option>
            </select>
          </label>

          {facing ? (
            <label className="ultra-field">
              <span>{t("ultra.villainPos")}</span>
              <select value={villainPos} onChange={(e) => setVillainPos(e.target.value as Position)}>
                {POSITIONS.filter((p) => p !== "BB").map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="ultra-field">
            <span>{t("ultra.stack", { bb: effBB })}</span>
            <div className="ultra-stacks">
              {STACK_PRESETS.map((s) => (
                <button
                  key={s}
                  className={`btn size ${effBB === s ? "primary" : ""}`}
                  onClick={() => setEffBB(s)}
                >
                  {s}bb
                </button>
              ))}
            </div>
          </div>

          <button className="btn primary ultra-start" onClick={start}>
            {t("ultra.start")}
          </button>
        </div>
      </div>
    );
  }

  // ---------- Spot em andamento ----------
  const s = scenario.spec;
  const handType = comboToHandType(scenario.hand[0], scenario.hand[1]);
  const openSize = s.openSizeBB ?? 2.3;
  // Pote na hora da decisão: blinds (SB 0.5 + BB 1) + a aberta do vilão, se houve.
  // Ninguém pagou ainda: no treino 1×1 a decisão do herói acontece logo após
  // a ação do vilão, sem callers — por isso o pote é só blinds + aberta.
  const potBB = Math.round((1.5 + (s.raiserPosition ? openSize : 0)) * 10) / 10;
  // Nota de contexto do pote: mostra o que compõe o valor exibido,
  // evitando a dúvida "cadê o call que faltou?".
  const potNote = s.raiserPosition
    ? t("ultra.potNote.raised", { size: openSize })
    : t("ultra.potNote.waiting");
  return (
    <div className="train-view">
      <div className="panel">
        <div className="ss-head">
          <button className="btn tiny" onClick={back}>{t("ultra.change")}</button>
          <span className="train-session">
            {t("train.session", { c: session.correct, t: session.total })}
          </span>
        </div>

        {/* Arena 1×1 — heads-up de Main Event contra o seu carrasco pessoal. */}
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
              <div className="villain-av">
                {"art" in villain ? (
                  <HoodedFace />
                ) : (
                  <span className="villain-emoji">{villain.emoji}</span>
                )}
                {s.raiserPosition ? <span className="duel-pos vil">{s.raiserPosition}</span> : null}
              </div>
              <div className="villain-name">{t(villain.nameKey)}</div>
              <div className="villain-taunt">
                {result
                  ? isCorrect(result)
                    ? t("ultra.survive")
                    : t("ultra.gloat")
                  : `“${t(villain.tauntKey)}”`}
              </div>
              <div className="duel-cards">
                <CardBack small />
                <CardBack small />
              </div>
              <div className={`duel-badge ${s.raiserPosition ? "aggro" : "wait"}`}>
                {s.raiserPosition ? t("ultra.opened", { size: openSize }) : t("ultra.waiting")}
              </div>
            </div>

            <div className="duel-center">
              <div className="duel-chip" aria-hidden />
              <div className="duel-pot">{t("ultra.pot", { bb: potBB })}</div>
              <div className="duel-pot-note">{potNote}</div>
              <div className="duel-vs">VS</div>
            </div>

            <div className="duel-seat hero">
              <div className="duel-badge turn">{t("ultra.yourTurn")}</div>
              <div className="duel-cards big">
                {scenario.hand.map((c, i) => (
                  <CardView key={i} card={c} />
                ))}
              </div>
              <div className="duel-name">
                <span className="duel-pos hero">{s.heroPosition}</span>
                {t("ultra.you")} · {s.effectiveBB}bb
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

        {!result ? (
          <div className="train-actions">
            {scenario.actions.map((a) => (
              <button key={a.key} className="btn primary" onClick={() => choose(a.key)}>
                {t(a.labelKey as TransKey)}
              </button>
            ))}
          </div>
        ) : (
          <div className="train-result">
            <div className={`train-verdict ${isCorrect(result) ? "ok" : "bad"}`}>
              {isCorrect(result) ? t("train.correct") : t("train.wrong")}
            </div>
            <div className={`fb-item ${result.rating}`}>
              <div className="fb-text">{result.text}</div>
            </div>
            {isCorrect(result) ? (
              <button className="btn hit-share-btn" onClick={onShareHit}>
                📣 {t("share.hitBtn")}
              </button>
            ) : null}
            {cells ? (
              <>
                <div className="ultra-grid-title">{t("ultra.rangeTitle")}</div>
                <SpotRangeGrid cells={cells} highlight={handType} />
              </>
            ) : null}
            <button className="btn primary train-next" onClick={next}>
              {t("ultra.newHand")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
