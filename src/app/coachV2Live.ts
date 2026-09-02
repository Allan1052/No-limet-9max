import type { GameController } from "./gameController";
import { totalPot } from "../game/engine";
import { buildCoachV2Decision, type CoachV2Decision } from "../feedback/coachV2Decision";
import { comboToHandType, isPair } from "../ranges/types";
import { handRank } from "../ranges/handStrength";

// A explicação "tá barato, mas..." (fold com preço barato) só faz sentido em mãos
// que REALMENTE tentam o jogador — broadways, ases, pares, mãos do topo. Pra lixo
// óbvio (82o, 43o, 42o...) ninguém se tenta e a nota vira barulho (pedido do
// Allan). Regra: mão no ~topo metade do ranking OU par de bolso.
const TEMPTING_RANK_MAX = 84; // 0 = mais forte; ~metade das 169 mãos
function heroHandTempts(controller: GameController): boolean {
  try {
    const hero = controller.table.players[controller.heroSeat];
    const cards = hero?.holeCards;
    if (!cards || cards.length < 2) return false;
    const handType = comboToHandType(cards[0], cards[1]);
    return isPair(handType) || handRank(handType) <= TEMPTING_RANK_MAX;
  } catch {
    return false; // na dúvida, não mostra a nota
  }
}

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
    heroHandTempting: controller.table.street === "preflop" ? heroHandTempts(controller) : false,
  });
}
