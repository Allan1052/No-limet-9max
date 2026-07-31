// Controles do herói: Fold, Check/Call e Raise com slider.
import { useEffect, useState } from "react";
import { fmtAmount } from "../app/format";
import { useSettings } from "../app/settings";
import { useT } from "../i18n";
import type { LegalActions } from "../game/betting";
import type { Action } from "../game/engine";

interface ControlsProps {
  legal: LegalActions;
  active: boolean; // é a vez do herói?
  pot: number;
  bigBlind: number;
  onAction: (a: Action) => void;
  isOmaha?: boolean; // Indica se é Omaha (PLO)
}

export function Controls({ legal, active, pot, bigBlind, onAction, isOmaha = false }: ControlsProps) {
  const { t } = useT();
  const { unit, setUnit } = useSettings();
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
        {t("ctrl.fold")}
      </button>

      {legal.canCheck ? (
        <button className="btn" disabled={!active} onClick={() => onAction({ type: "check" })}>
          {t("ctrl.check")}
        </button>
      ) : (
        <button
          className="btn"
          disabled={!active || !legal.canCall}
          onClick={() => onAction({ type: "call" })}
        >
          {t("ctrl.call")} {fmtAmount(legal.callAmount, bigBlind, unit)}
        </button>
      )}

      <button
        className="btn unit-toggle"
        type="button"
        onClick={() => setUnit(unit === "bb" ? "chips" : "bb")}
        title={t("unit.toggle")}
      >
        {unit === "bb" ? "bb" : "fichas"}
      </button>

      <div className="slider-wrap">
        {isOmaha && (
          <button
            className="btn size pot-btn"
            disabled={!canRaise}
            onClick={() => potBet(1.0)}
            title="Pot Limit"
          >
            POT
          </button>
        )}
        <button className="btn size" disabled={!canRaise} onClick={() => potBet(0.35)} title={t("ctrl.pctOf", { p: 35 })}>
          35%
        </button>
        <button className="btn size" disabled={!canRaise} onClick={() => potBet(0.6)} title={t("ctrl.pctOf", { p: 60 })}>
          60%
        </button>
        <button className="btn size" disabled={!canRaise} onClick={() => potBet(0.75)} title={t("ctrl.pctOf", { p: 75 })}>
          75%
        </button>
        <button className="btn size" disabled={!canRaise} onClick={() => potBet(1.2)} title={t("ctrl.pctOf", { p: 120 })}>
          120%
        </button>
        <span className="pct-input" title={t("ctrl.pctHint")}>
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
            {t("ctrl.pctApply")}
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
        <span className="raise-amount">{fmtAmount(raiseTo, bigBlind, unit)}</span>
      </div>

      <div className="raise-row">
        <button
          className="btn primary raise-btn"
          disabled={!canRaise}
          onClick={() =>
            onAction(
              raiseTo >= legal.maxRaiseTo ? { type: "allin" } : { type: "raise", to: raiseTo },
            )
          }
        >
          {legal.callAmount > 0 ? t("ctrl.raise") : t("ctrl.bet")}
        </button>
        <button
          className="btn allin-btn"
          disabled={!active || !legal.canRaise}
          onClick={() => onAction({ type: "allin" })}
        >
          {t("ctrl.allin")}
        </button>
      </div>
    </div>
  );
}
