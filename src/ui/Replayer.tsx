// Replayer: percorre uma mão gravada passo a passo, com a decisão ótima.
import { useEffect, useState } from "react";
import { isXpUnlocked, loadXpState, saveXpState, processXpEvent } from "../app/achievements";
import { handHistoryToReplay } from "../import/replayTable";
import { actionLabel } from "../feedback/analyzer";
import type { HandHistory } from "../app/replay";
import type { FeedbackItem } from "../feedback/analyzer";
import { HandActions } from "./HandActions";
import { PokerTable } from "./Table";

function optimalMatches(actionType: string, adviceAction: string): boolean {
  const fam = (a: string) =>
    a === "fold" ? "fold" : a === "check" ? "check" : a === "call" ? "call" : "aggro";
  const ht = actionType === "allin" ? "raise" : actionType;
  return fam(ht) === fam(adviceAction);
}

export function Replayer({
  hand,
  onClose,
  feedback = [],
}: {
  hand: HandHistory;
  onClose: () => void;
  feedback?: FeedbackItem[];
}) {
  const frames = handHistoryToReplay(hand);
  const total = frames.length;
  const [step, setStep] = useState(0);
  const frame = frames[Math.min(step, Math.max(0, total - 1))];

  // XP: achievement "Revisão" — dispara quando abre o replay pela primeira vez
  useEffect(() => {
    if (isXpUnlocked()) {
      const xpState = loadXpState();
      const xpResult = processXpEvent(xpState, { type: "replayOpen" });
      saveXpState(xpResult.state);
    }
  }, []);

  const actionOrdinal = frames
    .slice(0, step + 1)
    .filter((candidate) => candidate.actorSeat >= 0).length - 1;
  const ev = frame?.actorSeat >= 0 && actionOrdinal >= 0 ? hand.events[actionOrdinal] : undefined;
  const atResult = frame?.label === "Resultado";

  return (
    <div className="overlay" onClick={onClose}>
      <div className="replay" onClick={(e) => e.stopPropagation()}>
        <div className="replay-head">
          <h3>Replay da mão</h3>
          <button className="btn tiny" onClick={onClose}>
            fechar ✕
          </button>
        </div>

        {frame ? (
          <PokerTable
            table={frame.state}
            readOnly
            replayActorSeat={frame.actorSeat}
            lastActionLabel={frame.actorSeat >= 0 ? { [frame.actorSeat]: frame.label } : {}}
          />
        ) : null}

        <div className="replay-step">
          <div className="rs-line">
            <span className="rs-street">{frame?.label ?? "Replay"}</span>
          </div>

          {ev ? (
            <>
              <div className="rs-action">
                Jogou: <b>{ev.actionLabel}</b>
                {ev.advice ? (
                  optimalMatches(ev.actionType, ev.advice.action) ? (
                    <span className="ok-tag"> ✓ alinhado com o ótimo</span>
                  ) : (
                    <span className="bad-tag"> ✗ ótimo era {ev.advice.nBet ?? actionLabel(ev.advice.action)}</span>
                  )
                ) : null}
              </div>
              {ev.advice ? (
                <div className="rs-advice">
                  <b>Decisão ótima:</b> {ev.advice.nBet ?? actionLabel(ev.advice.action)} — {ev.advice.reason}
                  {ev.advice.equity !== undefined
                    ? ` (equity ${Math.round(ev.advice.equity * 100)}%${
                        ev.advice.potOdds !== undefined
                          ? `, preço ${Math.round(ev.advice.potOdds * 100)}%`
                          : ""
                      })`
                    : ""}
                </div>
              ) : null}
            </>
          ) : atResult ? (
            <div className="rs-advice">{describeResult(hand)}</div>
          ) : null}
        </div>

        <div className="replay-nav">
          <button className="btn" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
            ◀ Anterior
          </button>
          <span className="rs-counter">
            {atResult ? "Fim" : `Passo ${step + 1} / ${total}`}
          </span>
          <button
            className="btn"
            disabled={step >= total - 1}
            onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
          >
            Próximo ▶
          </button>
        </div>

        <div
          className="replay-actions"
          style={{ marginTop: 14, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}
        >
          <HandActions hand={hand} feedback={feedback} />
        </div>
      </div>
    </div>
  );
}

function describeResult(hand: HandHistory): string {
  const r = hand.result;
  if (!r) return "Mão encerrada.";
  const winners = Object.entries(r.winningsBySeat)
    .filter(([, v]) => v > 0)
    .map(([seat, v]) => `${hand.names[Number(seat)]} (+${v / hand.bigBlind}bb)`);
  const kind = r.showdown ? "no showdown" : "sem showdown (todos desistiram)";
  return winners.length
    ? `Vencedor ${kind}: ${winners.join(", ")}.`
    : `Mão encerrada ${kind}.`;
}
