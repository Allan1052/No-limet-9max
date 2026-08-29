import type { ParsedAction } from "./handHistory";
import type { Family } from "../feedback/analyzer";

const VOLUNTARY = new Set(["fold", "check", "call", "bet", "raise"]);

export function actionFamily(action: string): Family {
  const t = action.toLowerCase();
  if (t.includes("fold") || t.includes("larg")) return "fold";
  if (t.includes("check") || t.includes("mesa")) return "check";
  if (t.includes("call") || t.includes("pag")) return "call";
  return "aggro";
}

export function isHeroDecision(action: ParsedAction, heroName?: string): boolean {
  return !!heroName && action.player === heroName && VOLUNTARY.has(action.type);
}

export interface SecondChanceComparison {
  original: Family;
  now: Family;
  reference: Family | null;
  changed: boolean;
  matchesReference: boolean | null;
}

export function compareSecondChance(original: string, now: string, reference?: string): SecondChanceComparison {
  const originalFam = actionFamily(original);
  const nowFam = actionFamily(now);
  const referenceFam = reference ? actionFamily(reference) : null;
  return {
    original: originalFam,
    now: nowFam,
    reference: referenceFam,
    changed: originalFam !== nowFam,
    matchesReference: referenceFam === null ? null : nowFam === referenceFam,
  };
}
