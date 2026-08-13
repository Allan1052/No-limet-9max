// ---------------------------------------------------------------------------
// Ações da mão: "Compartilhar mão" (card PNG) + "Desafiar amigo" (link do spot).
// Extraído do Replayer para ficar VISÍVEL já na primeira tela (fim da mão),
// em vez de escondido no último passo da revisão.
// ---------------------------------------------------------------------------
import { useCallback } from "react";
import { HandShareButton } from "./HandShareButton";
import type { HandShareData } from "../app/handShareCard";
import type { HandHistory } from "../app/replay";
import type { FeedbackItem } from "../feedback/analyzer";
import { MODULES, buildScenario } from "../train/scenarios";
import { encodeChallenge, challengeUrl } from "../app/challenge";
import { shareSpot } from "../app/share";

export function HandActions({
  hand,
  feedback,
}: {
  hand: HandHistory;
  feedback: FeedbackItem[];
}) {
  // Card da mão — usa a última decisão do herói avaliada.
  const shareData: HandShareData | null = (() => {
    if (feedback.length === 0) return null;
    const lastItem = feedback[feedback.length - 1];
    const heroCards = hand.holeCards[hand.heroSeat] ?? [];

    const contextParts: string[] = [];
    if (lastItem.equity !== undefined) contextParts.push(`Equity: ${Math.round(lastItem.equity * 100)}%`);
    if (lastItem.potOdds !== undefined) contextParts.push(`Preço: ${Math.round(lastItem.potOdds * 100)}%`);
    if (lastItem.evBB !== undefined) contextParts.push(`EV call: ${lastItem.evBB.toFixed(1)}bb`);
    const effectiveBB = hand.startingStacks?.[hand.heroSeat]
      ? Math.round(hand.startingStacks[hand.heroSeat] / hand.bigBlind)
      : undefined;
    if (effectiveBB !== undefined) contextParts.push(`Stack: ${effectiveBB}bb`);

    return {
      heroCards,
      board: hand.finalBoard,
      heroAction: lastItem.heroAction.toUpperCase(),
      coachAction: lastItem.advice.toUpperCase(),
      rating: lastItem.rating,
      coachTip: lastItem.text,
      street: lastItem.street,
      tournamentInfo: "Call ou Fold · Simulador grátis",
      context: contextParts.length > 0 ? contextParts.join(" · ") : "",
      position: hand.heroPosition ?? "MP",
      stackBB: effectiveBB !== undefined ? `${effectiveBB}bb` : "100bb",
      stage: hand.tournamentStage,
      equity: lastItem.equity,
      potOdds: lastItem.potOdds,
      evBB: lastItem.evBB,
    };
  })();

  // Desafiar amigo — gera um spot de pré-flop com a mesma mão.
  const onChallenge = useCallback(async () => {
    const heroCards = hand.holeCards[hand.heroSeat] ?? [];
    if (heroCards.length < 2) return;
    const mod = MODULES.filter((m) => m.id !== "final_icm")[0] ?? MODULES[0];
    const effectiveBB = hand.startingStacks?.[hand.heroSeat]
      ? Math.round(hand.startingStacks[hand.heroSeat] / hand.bigBlind)
      : 50;
    const scenario = buildScenario(mod, Math.random);
    const spec = { ...scenario.spec, effectiveBB, heroPosition: scenario.spec.heroPosition };
    const code = encodeChallenge(spec, heroCards);
    await shareSpot(null, challengeUrl(code), "Desafio Call ou Fold — jogue a mesma mão que eu!", "");
  }, [hand]);

  return (
    <>
      {shareData ? (
        <HandShareButton data={shareData} label="📤 Compartilhar mão" className="btn primary" />
      ) : null}
      <button className="btn" onClick={onChallenge}>
        🤝 Desafiar amigo
      </button>
    </>
  );
}
