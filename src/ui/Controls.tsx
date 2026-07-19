// Controles do herói: Fold, Check/Call e Raise com slider.
import { useEffect, useState } from "react";
import { toBB } from "../app/format";
import type { LegalActions } from "../game/betting";
import type { Action } from "../game/engine";

interface ControlsProps {
  legal: LegalActions;
  active: boolean; // é a vez do herói?
  pot: number;
  bigBlind: number;
  onAction: (a: Action) => void;
  hint?: string;
}

export function Controls({ legal, active, pot, bigBlind, onAction, hint }: ControlsProps) {
  const [raiseTo, setRaiseTo] = useState(legal.minRaiseTo);

  // Reajusta o slider sempre que o spot muda.
  useEffect(() => {
    setRaiseTo(legal.minRaiseTo);
  }, [legal.minRaiseTo, legal.maxRaiseTo]);

  const canRaise = active && legal.canRaise && legal.maxRaiseTo > legal.minRaiseTo;
  const potBet = (frac: number) => {
    const target = Math.round((legal.callAmount + pot) * frac) + legal.callAmount;
    setRaiseTo(Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, target)));
  };

  return (
    <div className="controls">
      <button
        className="btn danger"
        disabled={!active || !legal.canFold}
        onClick={() => onAction({ type: "fold" })}
      >
        Fold
      </button>

      {legal.canCheck ? (
        <button className="btn" disabled={!active} onClick={() => onAction({ type: "check" })}>
          Check
        </button>
      ) : (
        <button
          className="btn"
          disabled={!active || !legal.canCall}
          onClick={() => onAction({ type: "call" })}
        >
          Call {toBB(legal.callAmount, bigBlind)}
        </button>
      )}

      <div className="slider-wrap">
        <button className="btn" disabled={!canRaise} onClick={() => potBet(0.5)} title="Meio pote">
          ½
        </button>
        <button className="btn" disabled={!canRaise} onClick={() => potBet(1)} title="Pote">
          Pote
        </button>
        <input
          type="range"
          min={legal.minRaiseTo}
          max={legal.maxRaiseTo}
          value={Math.min(raiseTo, legal.maxRaiseTo)}
          disabled={!canRaise}
          onChange={(e) => setRaiseTo(Number(e.target.value))}
        />
        <span className="raise-amount">{toBB(raiseTo, bigBlind)}</span>
      </div>

      <button
        className="btn primary"
        disabled={!canRaise}
        onClick={() =>
          onAction(
            raiseTo >= legal.maxRaiseTo ? { type: "allin" } : { type: "raise", to: raiseTo },
          )
        }
      >
        {legal.callAmount > 0 ? "Raise" : "Apostar"}
      </button>

      {hint ? <div className="hint">💡 {hint}</div> : null}
    </div>
  );
}
