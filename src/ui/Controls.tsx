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
  // Porcentagem digitável do pote (campo livre ao lado dos atalhos).
  const [customPct, setCustomPct] = useState("50");

  // Reajusta o slider sempre que o spot muda.
  useEffect(() => {
    setRaiseTo(legal.minRaiseTo);
  }, [legal.minRaiseTo, legal.maxRaiseTo]);

  const canRaise = active && legal.canRaise && legal.maxRaiseTo > legal.minRaiseTo;
  const potBet = (frac: number) => {
    const target = Math.round((legal.callAmount + pot) * frac) + legal.callAmount;
    setRaiseTo(Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, target)));
  };
  // Aplica a % digitada (aceita valores fora de 0–100, o clamp cuida dos limites).
  const applyCustomPct = () => {
    const n = Number(customPct.replace(",", "."));
    if (Number.isFinite(n) && n > 0) potBet(n / 100);
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
        <button className="btn size" disabled={!canRaise} onClick={() => potBet(0.3)} title="30% do pote">
          30%
        </button>
        <button className="btn size" disabled={!canRaise} onClick={() => potBet(0.4)} title="40% do pote">
          40%
        </button>
        <button className="btn size" disabled={!canRaise} onClick={() => potBet(0.6)} title="60% do pote">
          60%
        </button>
        <button className="btn size" disabled={!canRaise} onClick={() => potBet(1)} title="Pote inteiro">
          Pote
        </button>
        <span className="pct-input" title="Digite a % do pote e aplique">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            step={5}
            value={customPct}
            disabled={!canRaise}
            onChange={(e) => setCustomPct(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyCustomPct();
            }}
          />
          <button className="btn size" disabled={!canRaise} onClick={applyCustomPct}>
            % OK
          </button>
        </span>
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
