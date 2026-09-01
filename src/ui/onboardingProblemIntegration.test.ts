import { describe, expect, it } from "vitest";
import onboardingSource from "./Onboarding.tsx?raw";
import appSource from "../app/App.tsx?raw";
import {
  ONBOARDING_GOALS,
  loadOnboardingGoal,
  saveOnboardingGoal,
  type OnboardingGoalId,
} from "../app/onboardingGoal";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key: string) {
      return data.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
  };
}

describe("Onboarding pelo principal problema do recreativo", () => {
  it("oferece as cinco escolhas aprovadas", () => {
    expect(ONBOARDING_GOALS.map((g) => g.id)).toEqual([
      "call_allin",
      "push_allin",
      "bubble",
      "late_stage",
      "all",
    ]);
    expect(ONBOARDING_GOALS.map((g) => g.label)).toEqual([
      "Não sei quando pagar all-in",
      "Não sei quando empurrar all-in",
      "Me perco perto da bolha",
      "Chego na reta final e travo",
      "Quero melhorar tudo",
    ]);
  });

  it("salva e recupera apenas uma escolha válida", () => {
    const storage = fakeStorage();
    saveOnboardingGoal("bubble", storage);
    expect(loadOnboardingGoal(storage)).toBe("bubble");

    const invalid = fakeStorage({ "cof-onboarding-goal-v1": "qualquer-coisa" });
    expect(loadOnboardingGoal(invalid)).toBeNull();
  });

  it("mantém o contrato tipado dos ids", () => {
    const goal: OnboardingGoalId = "late_stage";
    expect(goal).toBe("late_stage");
  });

  it("a UI pergunta o problema, exige seleção e persiste antes de concluir", () => {
    expect(onboardingSource).toContain("Qual situação mais te faz perder fichas?");
    expect(onboardingSource).toContain("ONBOARDING_GOALS");
    expect(onboardingSource).toContain("saveOnboardingGoal");
    expect(onboardingSource).toContain("selectedGoal");
    expect(onboardingSource).toContain("disabled={!selectedGoal}");
    expect(onboardingSource).toContain('aria-pressed={selectedGoal === goal.id}');
  });

  it("o funil registra a escolha junto da conclusão do onboarding", () => {
    expect(appSource).toContain("onboarding_completed");
    expect(appSource).toContain("goal");
  });
});
