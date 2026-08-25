// Módulos de Maestria: treino guiado de decisões pré-flop, com feedback
// imediato (nota por frequência) e progresso por módulo até "dominar".
import { useState } from "react";
import { CardView } from "./Card";
import { useT } from "../i18n";
import type { TransKey } from "../i18n/translations";
import {
  MODULES,
  moduleById,
  buildScenario,
  evaluateChoice,
  isCorrect,
  type Scenario,
  type TrainModule,
} from "../train/scenarios";
import {
  loadMastery,
  saveMastery,
  recordResult,
  moduleView,
  resetModule,
  type MasteryState,
} from "../train/mastery";
import { makeRandomChallenge } from "../app/challenge";
import { drawSpotImage } from "../app/handImage";
import { shareSpot } from "../app/share";
import { markActiveToday } from "../train/streak";
import { recordDecision } from "../train/decisionStats";
import { DailyHand } from "./DailyHand";
import { StreakBanner } from "./StreakBanner";
import type { FeedbackItem } from "../feedback/analyzer";
import { trackEvent } from "../app/analytics";

export function TrainView() {
  const { t } = useT();
  const [mastery, setMasteryState] = useState<MasteryState>(() => loadMastery());
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [challengeMsg, setChallengeMsg] = useState<string | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);

  // Gera um desafio aleatório e compartilha (imagem + link) — cada convite
  // é uma porta de entrada para novos usuários.
  const onChallenge = async () => {
    trackEvent("challenge_share_started");
    setChallengeMsg(null);
    const { scenario: sc, url } = makeRandomChallenge();
    const s = sc.spec;
    const img = await drawSpotImage({
      hand: sc.hand,
      title: t("challenge.imgTitle"),
      context: `${s.heroPosition} · ${s.effectiveBB}bb`,
      question: t("challenge.imgQuestion"),
      footer: t("challenge.imgFooter"),
    });
    const res = await shareSpot(img, url, t("challenge.shareText"), t("disclaimer"));
    trackEvent("challenge_shared", { result: res });
    if (res === "copied") setChallengeMsg(t("challenge.copied"));
    else if (res === "failed") setChallengeMsg(t("challenge.failed"));
  };
  const [result, setResult] = useState<FeedbackItem | null>(null);
  const [session, setSession] = useState({ correct: 0, total: 0 });

  const persist = (next: MasteryState) => {
    saveMastery(next);
    setMasteryState({ ...next });
  };

  const start = (m: TrainModule) => {
    trackEvent("training_module_started", { module: m.id });
    setModuleId(m.id);
    setSession({ correct: 0, total: 0 });
    setResult(null);
    setScenario(buildScenario(m, Math.random));
  };

  const next = () => {
    if (!moduleId) return;
    setResult(null);
    setScenario(buildScenario(moduleById(moduleId), Math.random));
  };

  // Compartilhar um acerto — cada print é uma porta de entrada nova.
  const appUrl =
    typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
  const onShareHit = async () => {
    if (!scenario) return;
    const s = scenario.spec;
    const img = await drawSpotImage({
      hand: scenario.hand,
      title: t("share.hitTitle"),
      context: `${s.heroPosition} · ${s.effectiveBB}bb`,
      question: t("share.hitQuestion"),
      footer: t("share.hitFooter"),
    });
    trackEvent("training_hit_share_clicked", { module: moduleId });
    const result = await shareSpot(img, appUrl, t("share.hitText"), t("disclaimer"));
    trackEvent("training_hit_shared", { module: moduleId, result });
  };

  const choose = (key: "fold" | "call" | "raise" | "allin") => {
    if (!scenario || result || !moduleId) return;
    const item = evaluateChoice(scenario, key);
    const ok = isCorrect(item);
    trackEvent("training_choice_submitted", { module: moduleId, action: key, correct: ok });
    setResult(item);
    markActiveToday();
    recordDecision(key);
    setSession((s) => ({ correct: s.correct + (ok ? 1 : 0), total: s.total + 1 }));
    persist(recordResult(mastery, moduleId, ok));
  };

  // ---------- Lista de módulos ----------
  if (!moduleId) {
    return (
      <div className="train-view">
        <StreakBanner />
        <DailyHand />
        <div className="panel challenge-cta-panel" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(/banner.webp)', backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid var(--gold-dim)' }}>
          <div className="chal-cta-text">
            <b>🎯 {t("challenge.button")}</b>
            <span>{t("challenge.subtitle")}</span>
          </div>
          <button className="btn primary" onClick={onChallenge}>
            {t("challenge.send")}
          </button>
          {challengeMsg ? <div className="chal-msg">{challengeMsg}</div> : null}
        </div>
        <div className="panel">
          <h3>{t("train.title")}</h3>
          <div className="missions-list">
            {MODULES.map((m) => {
              const v = moduleView(mastery, m.id);
              return (
                <button key={m.id} className={`mission-card train-card ${v.mastered ? "done" : ""}`} onClick={() => start(m)}>
                  <div className="mission-icon">{v.mastered ? "✅" : m.icon}</div>
                  <div className="mission-body">
                    <div className="mission-top">
                      <span className="mission-title">{t(m.titleKey as TransKey)}</span>
                      {v.mastered ? (
                        <span className="mission-cat">{t("train.mastered")}</span>
                      ) : v.recentCount > 0 ? (
                        <span className="mission-cat">{t("train.recent", { r: v.recentRate })}</span>
                      ) : null}
                    </div>
                    <div className="mission-desc">{t(m.descKey as TransKey)}</div>
                    {v.attempts > 0 ? (
                      <div className="mission-count">{t("train.attempts", { n: v.attempts })}</div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ---------- Cenário de um módulo ----------
  const spec = scenario!.spec;
  const posLabel = spec.heroPosition;
  return (
    <div className="train-view">
      <div className="panel">
        <div className="ss-head">
          <button className="btn tiny" onClick={() => { trackEvent("training_module_finished", { module: moduleId, correct: session.correct, total: session.total }); setModuleId(null); }}>
            {t("train.back")}
          </button>
          <span className="train-session">{t("train.session", { c: session.correct, t: session.total })}</span>
        </div>

        <div className="train-spot">
          <div className="train-prompt">{t("train.spot", { pos: posLabel, stack: spec.effectiveBB })}</div>
          <div className="train-prompt strong">
            {spec.raiserPosition
              ? t("train.facing", { pos: spec.raiserPosition, size: spec.openSizeBB ?? 2.3 })
              : t("train.rfi")}
          </div>
          {spec.icmSpot ? <div className="train-icm">{t("train.icmNote")}</div> : null}
        </div>

        <div className="train-hand">
          {scenario!.hand.map((c, i) => (
            <CardView key={i} card={c} />
          ))}
        </div>

        {!result ? (
          <div className="train-actions">
            {scenario!.actions.map((a) => (
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
            <button className="btn primary train-next" onClick={next}>
              {t("train.next")}
            </button>
          </div>
        )}

        <button
          className="btn tiny train-reset"
          onClick={() => persist(resetModule(mastery, moduleId))}
        >
          {t("train.reset")}
        </button>
      </div>
    </div>
  );
}
