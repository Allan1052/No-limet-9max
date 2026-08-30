import type { GameController } from "./gameController";
import { totalPot } from "../game/engine";
import { buildCoachV2Decision, type CoachV2Decision } from "../feedback/coachV2Decision";

/**
 * Traduz a recomendação atual do Motor V2 para a camada de apresentação.
 * Não recalcula nem altera a estratégia: apenas acrescenta o contexto visível
 * daquele exato instante da decisão do herói.
 */
export function computeHeroCoachDecision(controller: GameController): CoachV2Decision | null {
  if (!controller.isHeroTurn()) return null;

  const advice = controller.computeHeroAdvice();
  if (!advice) return null;

  const bb = controller.table.bigBlind || 1;
  const legal = controller.legal();
  const potBB = totalPot(controller.table) / bb;
  const toCallBB = legal.callAmount / bb;
  const spr =
    controller.table.street !== "preflop" &&
    advice.effectiveBB !== undefined &&
    potBB > 0
      ? Math.round((advice.effectiveBB / potBB) * 10) / 10
      : undefined;

  return buildCoachV2Decision(advice, {
    street: controller.table.street,
    potBB,
    toCallBB,
    spr,
  });
}
