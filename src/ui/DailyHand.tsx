// Mão do dia — card no topo do Treino. Uma mão igual pra todo mundo, por dia.
// Resolve uma vez; depois trava até amanhã. Ganha áurea, conta streak e dá pra
// compartilhar (cada print é uma porta de entrada).
import { useState, useEffect } from "react";
import { CardView } from "./Card";
import { useT } from "../i18n";
import type { TransKey } from "../i18n/translations";
import { evaluateChoice, isCorrect } from "../train/scenarios";
import { buildDailyScenario, loadDaily, saveDaily } from "../train/daily";
import { awardDecisionAura } from "../train/aura";
import { markActiveToday } from "../train/streak";
import { recordDecision } from "../train/decisionStats";
import { trackEvent } from "../app/analytics";
import { AuraChip } from "./AuraChip";
import { drawSpotImage } from "../app/handImage";
import { shareSpot } from "../app/share";
import type { FeedbackItem } from "../feedback/analyzer";

export function DailyHand() {
  const { t } = useT();
  const [daily] = useState(buildDailyScenario);
  const { day, scenario } = daily;
  const prior = loadDaily();
  const doneBefore = prior?.day === day;
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<FeedbackItem | null>(null);
  const [auraDelta, setAuraDelta] = useState<number | null>(null);

  const spec = scenario.spec;
  const appUrl =
    typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";

  const choose = (key: "fold" | "call" | "raise" | "allin") => {
    if (result) return;
    const item = evaluateChoice(scenario, key);
    const ok = isCorrect(item);
    setResult(item);
    setAuraDelta(awardDecisionAura(ok).delta);
    markActiveToday();
    recordDecision(key);
    saveDaily(day, ok);
    trackEvent("daily_challenge_completed", { day, correct: ok, action: key });
  };

  // Track when user views the daily challenge (once per mount)
  useEffect(() => {
    trackEvent("daily_challenge_viewed", { day });
  }, [day]);

  const onShare = async () => {
    const img = await drawSpotImage({
      hand: scenario.hand,
      title: t("daily.title"),
      context: `${spec.heroPosition} · ${spec.effectiveBB}bb`,
      question: t("daily.shareQuestion"),
      footer: t("daily.shareFooter"),
    });
    await shareSpot(img, appUrl, t("daily.shareText"), t("disclaimer"));
  };

  // Já resolveu hoje (em outra sessão) e não está revendo agora.
  if (doneBefore && !result) {
    return (
      <div className="panel daily-panel done">
        <div className="daily-head">
          <span className="daily-badge">🗓️ {t("daily.title")}</span>
        </div>
        <div className="daily-done-msg">
          {prior?.correct ? "✅ " : ""}
          {t("daily.doneToday")}
        </div>
        <button className="btn tiny daily-share" onClick={onShare}>
          📣 {t("daily.share")}
        </button>
      </div>
    );
  }

  return (
    <div className="panel daily-panel">
      <div className="daily-head">
        <span className="daily-badge">🗓️ {t("daily.title")}</span>
        <span className="daily-sub">{t("daily.subtitle")}</span>
      </div>

      {!open ? (
        <button className="btn primary daily-start" onClick={() => setOpen(true)}>
          {t("daily.solve")}
        </button>
      ) : (
        <>
          <div className="daily-spot">
            <div className="train-prompt">
              {t("train.spot", { pos: spec.heroPosition, stack: spec.effectiveBB })}
            </div>
            <div className="train-prompt strong">
              {spec.raiserPosition
                ? t("train.facing", { pos: spec.raiserPosition, size: spec.openSizeBB ?? 2.3 })
                : t("train.rfi")}
            </div>
          </div>
          <div className="train-hand">
            {scenario.hand.map((c, i) => (
              <CardView key={i} card={c} />
            ))}
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
              {auraDelta != null ? <AuraChip delta={auraDelta} /> : null}
              <button className="btn hit-share-btn" onClick={onShare}>
                📣 {t("daily.share")}
              </button>
              <div className="daily-come-back">{t("daily.comeBack")}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
