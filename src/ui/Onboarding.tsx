// Primeira escolha do recreativo: uma pergunta curta para o app entender
// onde ele sente mais dificuldade. A escolha fica local e prepara a
// personalização futura sem alterar o motor nesta etapa.
import { useState } from "react";
import { useT } from "../i18n";
import {
  ONBOARDING_GOALS,
  saveOnboardingGoal,
  type OnboardingGoalId,
} from "../app/onboardingGoal";
import { trackEvent } from "../app/analytics";
import "./onboarding.css";

export function Onboarding({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const [selectedGoal, setSelectedGoal] = useState<OnboardingGoalId | null>(null);

  const finish = () => {
    if (!selectedGoal) return;
    saveOnboardingGoal(selectedGoal);
    trackEvent("onboarding_goal_selected", { goal: selectedGoal });
    onClose();
  };

  return (
    <div className="overlay">
      <div className="replay onboard onboard-goal" onClick={(e) => e.stopPropagation()}>
        <div className="onboard-goal-kicker">UMA MÃO POR VEZ</div>
        <h3>{t("onboard.title")}</h3>
        <p className="onboard-goal-question">Qual situação mais te faz perder fichas?</p>
        <p className="onboard-goal-help">Escolha uma. Vamos começar pelo que mais incomoda hoje.</p>

        <div className="onboard-goal-list" role="group" aria-label="Principal dificuldade no poker">
          {ONBOARDING_GOALS.map((goal) => (
            <button
              type="button"
              key={goal.id}
              className={`onboard-goal-option${selectedGoal === goal.id ? " selected" : ""}`}
              onClick={() => setSelectedGoal(goal.id)}
              aria-pressed={selectedGoal === goal.id}
            >
              <span>{goal.label}</span>
              <span className="onboard-goal-check" aria-hidden="true">
                {selectedGoal === goal.id ? "✓" : ""}
              </span>
            </button>
          ))}
        </div>

        <button className="btn primary onboard-goal-cta" disabled={!selectedGoal} onClick={finish}>
          Começar por aqui
        </button>
        <p className="onboard-goal-foot">Só estudo · Sem dinheiro real</p>
      </div>
    </div>
  );
}
