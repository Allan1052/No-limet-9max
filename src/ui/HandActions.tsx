// ---------------------------------------------------------------------------
// Ações da mão: "Compartilhar mão" (card PNG) + "Desafiar amigo" (link do spot).
// Extraído do Replayer para ficar VISÍVEL já na primeira tela (fim da mão),
// em vez de escondido no último passo da revisão.
// ---------------------------------------------------------------------------
import { useCallback } from "react";
import { CaptionPanel, HandShareButton } from "./HandShareButton";
import type { ActionLogEntry, HandShareData } from "../app/handShareCard";
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

    // Linha do tempo: uma entrada por RUA jogada (a última decisão de cada rua),
    // na ordem em que aconteceram — conta a mão inteira, não só o último lance.
    const byStreet = new Map<string, FeedbackItem>();
    for (const it of feedback) byStreet.set(it.street, it);
    const decisions = [...byStreet.values()].map((it) => ({
      street: it.street,
      action: it.heroAction,
      correct: it.rating === "boa" || it.rating === "ok",
    }));

    // HISTÓRICO COMPLETO da mão (para o card "histórico" do carrossel): todas as
    // ações de todos os jogadores, rua por rua, com os valores apostados. A
    // correção (✓/✗) aplica-se só às ações do herói, usando a avaliação do
    // feedback daquela rua.
    const streetCorrect = new Map<string, boolean>();
    for (const it of feedback) streetCorrect.set(it.street, it.rating === "boa" || it.rating === "ok");
    const actionLog: ActionLogEntry[] = hand.events.map((ev) => ({
      who: ev.isHero ? "Você" : ev.name,
      action: ev.actionLabel,
      street: ev.street,
      isHero: ev.isHero,
      correct: ev.isHero ? streetCorrect.get(ev.street) : undefined,
    }));

    // ── POTE POR RUA (em big blinds): o maior pote registrado na rua, somado às
    // ações da rua via actionLabel. Simplificação fiel ao replay: usamos o maior
    // `pot` da rua + as apostas explícitas extraídas dos labels (Raise/Call/All-in).
    const potByStreet: Record<string, number> = {};
    const streetPotBefore = new Map<string, number>();
    for (const ev of hand.events) {
      streetPotBefore.set(ev.street, Math.max(streetPotBefore.get(ev.street) ?? 0, ev.pot));
    }
    const addStreetValue = (street: string, amount: number) => {
      potByStreet[street] = (potByStreet[street] ?? 0) + amount;
    };
    for (const ev of hand.events) {
      const m = ev.actionLabel.match(/(?:Raise|Call|All-in|Bet)\s+([\d.]+)/i);
      if (m && ev.actionType !== "fold" && ev.actionType !== "check") {
        addStreetValue(ev.street, parseFloat(m[1]));
      }
    }
    for (const [street, base] of streetPotBefore) {
      potByStreet[street] = Math.round((base + (potByStreet[street] ?? 0)) * 10) / 10;
    }
    // Pote total da mão (se houve showdown ou vitória registrada).
    let finalPotBB: number | undefined;
    if (hand.result) {
      const total = hand.result.pots.reduce((s, p) => s + p.amount, 0);
      if (total > 0) finalPotBB = Math.round((total / hand.bigBlind) * 10) / 10;
    }

    // ── SHOWDOWN — mãos reveladas de todos os jogadores que mostraram cartas,
    // quem levou o pote e o tamanho final. Sem showdown, nada é exibido (a mão
    // termina com o pote final da caixa acima).
    let showdown: HandShareData["showdown"];
    if (hand.result?.showdown && hand.result.winningsBySeat) {
      // SÓ os jogadores que CHEGARAM ao showdown entram no card. Em modo estudo
      // `holeCards` tem as cartas de TODOS (inclusive quem foldou), então sem
      // este filtro o card mostrava um jogador que FOLDOU como se fosse o vilão
      // (ex.: você venceu/perdeu pra um JJ, mas o card mostrava um 74 que largou).
      // `handValueBySeat` só contém os assentos avaliados no showdown.
      const shown = hand.result.handValueBySeat;
      const reachedShowdown = (seat: number) =>
        !shown || Object.keys(shown).length === 0 || shown[seat] !== undefined;
      showdown = Object.entries(hand.holeCards)
        .filter(([seatStr]) => reachedShowdown(Number(seatStr)))
        .map(([seatStr, cards]) => {
          const seat = Number(seatStr);
          const won = (hand.result?.winningsBySeat[seat] ?? 0) > 0;
          return {
            name: hand.names[seat] ?? (seat === hand.heroSeat ? "Você" : "Vilão"),
            cards,
            isHero: seat === hand.heroSeat,
            won,
          };
        })
        .filter((p) => p.cards.length > 0);
    }

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
      decisions,
      actionLog,
      potByStreet,
      finalPotBB,
      showdown,
      bigBlind: hand.bigBlind,
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
