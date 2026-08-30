// ---------------------------------------------------------------------------
// Ações da mão: "Compartilhar mão" (card PNG) + "Desafiar amigo" (link do spot).
// O compartilhamento usa o builder Coach V2 para preservar cada decisão do herói,
// inclusive quando a ação volta na mesma street.
// ---------------------------------------------------------------------------
import { useCallback } from "react";
import { CaptionPanel, HandShareButton } from "./HandShareButton";
import type { HandHistory } from "../app/replay";
import type { FeedbackItem } from "../feedback/analyzer";
import { buildCoachV2ShareData } from "../app/coachV2Share";
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
  const shareData = buildCoachV2ShareData(hand, feedback);

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
        <>
          <HandShareButton data={shareData} label="📤 Compartilhar mão" className="btn primary" />
          <CaptionPanel data={shareData} />
        </>
      ) : null}
      <button className="btn" onClick={onChallenge}>
        🤝 Desafiar amigo
      </button>
    </>
  );
}
