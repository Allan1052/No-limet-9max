// ---------------------------------------------------------------------------
// MISSÃO 1×1 — a campanha de posições (UI).
// Mapa de estágios → joga um estágio (rodadas) → conquista + marcar amigos.
// Reaproveita o motor de cenários e a grade de range do Ultra 1×1.
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import { DuelArena, HOODED_VILLAIN } from "./DuelArena";
import { SpotRangeGrid } from "./SpotRangeGrid";
import { useT } from "../i18n";
import type { TransKey } from "../i18n/translations";
import { spotRangeGrid } from "../ranges/spotGrid";
import { BASELINE_PROFILE } from "../bots/profiles";
import { comboToHandType } from "../ranges/types";
import {
  buildScenarioFromSpec,
  evaluateChoice,
  isCorrect,
  type Scenario,
  type ScenarioSpec,
} from "../train/scenarios";
import {
  STAGES,
  loadCampaign,
  saveCampaign,
  isStageUnlocked,
  recordStage,
  campaignStats,
  type Stage,
  type CampaignProgress,
} from "../train/campaign";
import { shareSpot } from "../app/share";
import type { FeedbackItem } from "../feedback/analyzer";

function roundSpec(stage: Stage): ScenarioSpec {
  const pool = stage.villainPool;
  const villain = pool.length ? pool[Math.floor(Math.random() * pool.length)] : undefined;
  const stack = stage.stacks[Math.floor(Math.random() * stage.stacks.length)];
  return {
    heroPosition: stage.heroPosition,
    effectiveBB: stack,
    raiserPosition: villain,
    openSizeBB: villain ? 2.3 : undefined,
  };
}

export function CampaignView() {
  const { t } = useT();
  const [progress, setProgress] = useState<CampaignProgress>(loadCampaign);
  const [stageIdx, setStageIdx] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [result, setResult] = useState<FeedbackItem | null>(null);
  const [done, setDone] = useState<{ passed: boolean; correct: number } | null>(null);

  const appUrl =
    typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";

  const startStage = (i: number) => {
    setStageIdx(i);
    setRound(0);
    setCorrect(0);
    setResult(null);
    setDone(null);
    setScenario(buildScenarioFromSpec(roundSpec(STAGES[i]), Math.random));
  };
  const backToMap = () => {
    setStageIdx(null);
    setScenario(null);
    setResult(null);
    setDone(null);
  };
  const choose = (key: "fold" | "call" | "raise" | "allin") => {
    if (!scenario || result) return;
    const item = evaluateChoice(scenario, key);
    setResult(item);
    if (isCorrect(item)) setCorrect((c) => c + 1);
  };
  const next = () => {
    if (stageIdx == null) return;
    const stage = STAGES[stageIdx];
    if (round + 1 >= stage.rounds) {
      const { passed, progress: np } = recordStage(progress, stage.id, correct);
      saveCampaign(np);
      setProgress(np);
      setDone({ passed, correct });
    } else {
      setRound((r) => r + 1);
      setResult(null);
      setScenario(buildScenarioFromSpec(roundSpec(stage), Math.random));
    }
  };

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

  // ---------- Conquista (fim do estágio) ----------
  if (done && stageIdx != null) {
    const stage = STAGES[stageIdx];
    const shareText = t("mission.shareText", { n: stageIdx + 1, pos: stage.heroPosition });
    const onShare = () => void shareSpot(null, appUrl, shareText);
    const onWhats = () =>
      window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${appUrl}`)}`, "_blank");
    const hasNext = stageIdx + 1 < STAGES.length;
    return (
      <div className="train-view">
        <div className={`panel mission-done ${done.passed ? "won" : "lost"}`}>
          <div className="mission-medal">{done.passed ? "🏅" : "🎯"}</div>
          <h3>{done.passed ? t("mission.passed") : t("mission.almost")}</h3>
          <div className="mission-score">
            {done.correct}/{stage.rounds} · {t("mission.needed", { n: stage.passNeeded })}
          </div>
          {done.passed ? (
            <>
              <p className="mission-share-cta">{t("mission.shareCta")}</p>
              <div className="mission-share-row">
                <button className="btn primary" onClick={onWhats}>💬 {t("mission.whatsapp")}</button>
                <button className="btn" onClick={onShare}>📣 {t("mission.share")}</button>
              </div>
              <div className="mission-nav">
                {hasNext ? (
                  <button className="btn primary" onClick={() => startStage(stageIdx + 1)}>
                    {t("mission.next")} ▶
                  </button>
                ) : (
                  <div className="mission-champion">🏆 {t("mission.champion")}</div>
                )}
                <button className="btn tiny" onClick={backToMap}>{t("mission.map")}</button>
              </div>
            </>
          ) : (
            <div className="mission-nav">
              <button className="btn primary" onClick={() => startStage(stageIdx)}>{t("mission.retry")}</button>
              <button className="btn tiny" onClick={backToMap}>{t("mission.map")}</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------- Jogando um estágio ----------
  if (stageIdx != null && scenario) {
    const stage = STAGES[stageIdx];
    const s = scenario.spec;
    const handType = comboToHandType(scenario.hand[0], scenario.hand[1]);
    return (
      <div className="train-view">
        <div className="panel">
          <div className="ss-head">
            <button className="btn tiny" onClick={backToMap}>{t("mission.map")}</button>
            <span className="train-session">
              {t("mission.round", { r: round + 1, t: stage.rounds })} · ✅ {correct}
            </span>
          </div>

          <DuelArena spec={s} hand={scenario.hand} result={result} villain={HOODED_VILLAIN} />

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
              <button className="btn primary train-next" onClick={next}>{t("train.next")}</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------- Mapa de estágios ----------
  const stats = campaignStats(progress);
  return (
    <div className="train-view">
      <div className="panel mission-panel">
        <div className="ultra-badge">🎯 {t("mission.badge")}</div>
        <h3>{t("mission.title")}</h3>
        <p className="ultra-sub">{t("mission.subtitle")}</p>
        <div className="mission-progressbar">
          <div className="mp-fill" style={{ width: `${(stats.done / stats.total) * 100}%` }} />
          <span className="mp-label">{t("mission.progress", { done: stats.done, total: stats.total })}</span>
        </div>
        <div className="mission-stages">
          {STAGES.map((stage, i) => {
            const unlocked = isStageUnlocked(progress, i);
            const cleared = progress.cleared.includes(stage.id);
            return (
              <button
                key={stage.id}
                className={`mission-stage ${cleared ? "cleared" : unlocked ? "unlocked" : "locked"}`}
                disabled={!unlocked}
                onClick={() => unlocked && startStage(i)}
              >
                <span className="ms-icon">{cleared ? "🏅" : unlocked ? "▶" : "🔒"}</span>
                <span className="ms-body">
                  <span className="ms-title">
                    {t("mission.stage", { n: i + 1 })} · {stage.heroPosition}
                  </span>
                  <span className="ms-sub">
                    {stage.villainPool.length
                      ? t("mission.faceField", { r: stage.rounds })
                      : t("mission.rfiField", { r: stage.rounds })}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
