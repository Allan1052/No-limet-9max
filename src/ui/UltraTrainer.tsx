// ---------------------------------------------------------------------------
// Ultra · Treino 1×1 personalizado.
//
// Você escolhe: sua posição, se abre ou enfrenta a abertura de um vilão (e de
// qual posição), e a média de fichas (stack em bb). O app sorteia uma mão,
// você decide, e recebe a nota + a GRADE de range daquele spot com a sua mão
// destacada. Reaproveita o mesmo motor do jogo — nada de regra nova.
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import { CardView, CardBack } from "./Card";
import { SpotRangeGrid } from "./SpotRangeGrid";
import { useT } from "../i18n";
import type { TransKey } from "../i18n/translations";
import { spotRangeGrid } from "../ranges/spotGrid";
import { BASELINE_PROFILE } from "../bots/profiles";
import { POSITIONS, comboToHandType, type Position } from "../ranges/types";
import {
  buildScenarioFromSpec,
  evaluateChoice,
  isCorrect,
  type Scenario,
  type ScenarioSpec,
} from "../train/scenarios";
import type { FeedbackItem } from "../feedback/analyzer";

const STACK_PRESETS = [10, 20, 40, 60, 100];

export function UltraTrainer() {
  const { t } = useT();
  const [heroPos, setHeroPos] = useState<Position>("BTN");
  const [facing, setFacing] = useState(true); // true = vilão abre; false = você abre
  const [villainPos, setVillainPos] = useState<Position>("CO");
  const [effBB, setEffBB] = useState(40);

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [result, setResult] = useState<FeedbackItem | null>(null);
  const [session, setSession] = useState({ correct: 0, total: 0 });

  const specFrom = (): ScenarioSpec => ({
    heroPosition: heroPos,
    effectiveBB: effBB,
    raiserPosition: facing ? villainPos : undefined,
    openSizeBB: facing ? 2.3 : undefined,
  });

  const start = () => {
    setResult(null);
    setSession({ correct: 0, total: 0 });
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
  const choose = (key: "fold" | "call" | "raise" | "allin") => {
    if (!scenario || result) return;
    const item = evaluateChoice(scenario, key);
    setResult(item);
    setSession((s) => ({ correct: s.correct + (isCorrect(item) ? 1 : 0), total: s.total + 1 }));
  };

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
  const potBB = Math.round((1.5 + (s.raiserPosition ? openSize : 0)) * 10) / 10;
  return (
    <div className="train-view">
      <div className="panel">
        <div className="ss-head">
          <button className="btn tiny" onClick={back}>{t("ultra.change")}</button>
          <span className="train-session">
            {t("train.session", { c: session.correct, t: session.total })}
          </span>
        </div>

        {/* Mesa de disputa 1×1 — só 2 assentos, estilo mesa final. */}
        <div className="duel">
          <div className="duel-seat villain">
            {s.raiserPosition ? <span className="duel-pos">{s.raiserPosition}</span> : null}
            <div className="duel-cards">
              <CardBack small />
              <CardBack small />
            </div>
            <div className="duel-name">{t("ultra.villain")}</div>
            <div className={`duel-badge ${s.raiserPosition ? "aggro" : "wait"}`}>
              {s.raiserPosition ? t("ultra.opened", { size: openSize }) : t("ultra.waiting")}
            </div>
          </div>

          <div className="duel-center">
            <div className="duel-chip" aria-hidden />
            <div className="duel-pot">{t("ultra.pot", { bb: potBB })}</div>
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
