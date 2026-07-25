// Tela que aparece quando alguém abre um LINK de desafio (?d=...). Serve como
// desafio E como landing: apresenta o app pra quem chegou de fora, deixa a
// pessoa resolver o spot, mostra a resposta e convida a jogar/instalar.
import { useState } from "react";
import { CardView } from "./Card";
import { InstallButton } from "./InstallButton";
import { useT } from "../i18n";
import type { TransKey } from "../i18n/translations";
import { evaluateChoice, isCorrect, type Scenario, type TrainAction } from "../train/scenarios";
import type { FeedbackItem } from "../feedback/analyzer";

export function ChallengeReceived({
  scenario,
  onPlay,
}: {
  scenario: Scenario;
  onPlay: () => void;
}) {
  const { t } = useT();
  const [result, setResult] = useState<FeedbackItem | null>(null);
  const spec = scenario.spec;

  const choose = (a: TrainAction["key"]) => {
    if (result) return;
    setResult(evaluateChoice(scenario, a));
  };

  return (
    <div className="overlay">
      <div className="replay challenge-recv" onClick={(e) => e.stopPropagation()}>
        <div className="chal-banner">🎯 {t("challenge.title")}</div>
        <div className="chal-tagline">{t("challenge.tagline")}</div>

        <div className="train-spot">
          <div className="train-prompt">{t("train.spot", { pos: spec.heroPosition, stack: spec.effectiveBB })}</div>
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
            <button className="btn primary chal-cta" onClick={onPlay}>
              ♠ {t("challenge.cta")}
            </button>
            <div className="chal-install">
              <InstallButton />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
