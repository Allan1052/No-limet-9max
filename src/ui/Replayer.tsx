// Replayer: percorre uma mão gravada passo a passo, com a decisão ótima.
import { useState } from "react";
import { CardView } from "./Card";
import { actionLabel } from "../feedback/analyzer";
import { toBB } from "../app/format";
import type { HandHistory } from "../app/replay";

function optimalMatches(actionType: string, adviceAction: string): boolean {
  const fam = (a: string) =>
    a === "fold" ? "fold" : a === "check" ? "check" : a === "call" ? "call" : "aggro";
  const ht = actionType === "allin" ? "raise" : actionType;
  return fam(ht) === fam(adviceAction);
}

export function Replayer({ hand, onClose }: { hand: HandHistory; onClose: () => void }) {
  const total = hand.events.length;
  const [step, setStep] = useState(0);
  const atResult = step >= total;
  const ev = atResult ? undefined : hand.events[step];
  const board = atResult ? hand.finalBoard : (ev?.board ?? []);

  const pot = atResult
    ? Object.values(hand.result?.winningsBySeat ?? {}).reduce((a, b) => a + b, 0)
    : (ev?.pot ?? 0);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="replay" onClick={(e) => e.stopPropagation()}>
        <div className="replay-head">
          <h3>Replay da mão</h3>
          <button className="btn tiny" onClick={onClose}>
            fechar ✕
          </button>
        </div>

        {/* Board + pote no momento do passo */}
        <div className="replay-board">
          <div className="pot">Pote: {toBB(pot, hand.bigBlind)}</div>
          <div className="board">
            {board.length === 0 ? (
              <span className="muted">(pré-flop, sem cartas na mesa)</span>
            ) : (
              board.map((c, i) => <CardView key={i} card={c} />)
            )}
          </div>
        </div>

        {/* Passo atual */}
        {ev ? (
          <div className="replay-step">
            <div className="rs-line">
              <span className="rs-street">{ev.street}</span>
              <span className="rs-name">
                {ev.name}
                {ev.isHero ? " (você)" : ""}
              </span>
              {hand.holeCards[ev.seat] ? (
                <span className="rs-cards">
                  {hand.holeCards[ev.seat].map((c, i) => (
                    <CardView key={i} card={c} small />
                  ))}
                </span>
              ) : null}
            </div>
            <div className="rs-action">
              Jogou: <b>{ev.actionLabel}</b>
              {ev.advice ? (
                optimalMatches(ev.actionType, ev.advice.action) ? (
                  <span className="ok-tag"> ✓ alinhado com o ótimo</span>
                ) : (
                  <span className="bad-tag"> ✗ ótimo era {actionLabel(ev.advice.action)}</span>
                )
              ) : null}
            </div>
            {ev.advice ? (
              <div className="rs-advice">
                <b>Decisão ótima:</b> {actionLabel(ev.advice.action)} — {ev.advice.reason}
                {ev.advice.equity !== undefined
                  ? ` (equity ${Math.round(ev.advice.equity * 100)}%${
                      ev.advice.potOdds !== undefined
                        ? `, preço ${Math.round(ev.advice.potOdds * 100)}%`
                        : ""
                    })`
                  : ""}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="replay-step">
            <div className="rs-line">
              <span className="rs-street">Resultado</span>
            </div>
            <div className="rs-advice">{describeResult(hand)}</div>
          </div>
        )}

        {/* Navegação */}
        <div className="replay-nav">
          <button className="btn" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            ◀ Anterior
          </button>
          <span className="rs-counter">
            {atResult ? "Fim" : `Passo ${step + 1} / ${total}`}
          </span>
          <button
            className="btn"
            disabled={atResult}
            onClick={() => setStep((s) => Math.min(total, s + 1))}
          >
            Próximo ▶
          </button>
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
    .map(([seat, v]) => `${hand.names[Number(seat)]} (+${toBB(v, hand.bigBlind)})`);
  const kind = r.showdown ? "no showdown" : "sem showdown (todos desistiram)";
  return winners.length
    ? `Vencedor ${kind}: ${winners.join(", ")}.`
    : `Mão encerrada ${kind}.`;
}
