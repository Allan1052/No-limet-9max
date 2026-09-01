export type OnboardingGoalId =
  | "call_allin"
  | "push_allin"
  | "bubble"
  | "late_stage"
  | "all";

export type OnboardingGoal = {
  id: OnboardingGoalId;
  label: string;
};

export const ONBOARDING_GOALS: readonly OnboardingGoal[] = [
  { id: "call_allin", label: "Não sei quando pagar all-in" },
  { id: "push_allin", label: "Não sei quando empurrar all-in" },
  { id: "bubble", label: "Me perco perto da bolha" },
  { id: "late_stage", label: "Chego na reta final e travo" },
  { id: "all", label: "Quero melhorar tudo" },
];

const STORAGE_KEY = "cof-onboarding-goal-v1";

type GoalStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

function browserStorage(): GoalStorage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

function isGoalId(value: string | null): value is OnboardingGoalId {
  return ONBOARDING_GOALS.some((goal) => goal.id === value);
}

export function saveOnboardingGoal(
  goal: OnboardingGoalId,
  storage: GoalStorage | null = browserStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, goal);
  } catch {
    // Preferência de onboarding nunca pode impedir a entrada no app.
  }
}

export function loadOnboardingGoal(
  storage: Pick<GoalStorage, "getItem"> | null = browserStorage(),
): OnboardingGoalId | null {
  if (!storage) return null;
  try {
    const value = storage.getItem(STORAGE_KEY);
    return isGoalId(value) ? value : null;
  } catch {
    return null;
  }
}
