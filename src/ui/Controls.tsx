// Controles do herói: Fold, Check/Call, Raise, BB. All-in foi removido por
// pedido do Allan (08/08): botão grande perto do slider causava toques
// acidentais. All-in continua possível: slider no máximo vira all-in.
import { useEffect, useState } from "react";
import { fmtAmount } from "../app/format";
import { useSettings } from "../app/settings";
import { useT } from "../i18n";
import type { LegalActions } from "../game/betting";
import type { Action } from "../game/engine";
import "./controlsHierarchy.css";

function haptic() {
  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);
}

interface ControlsProps {
  legal: LegalActions;
  active: boolean;
  pot: number;
  bigBlind: number;
  onAction: (a: Action) => void;
  isOmaha?: boolean;
  defaultRaiseTo?: number;
  coachBetSize?: number;
  /** Muda quando o Allan toca na dica do coach: preenche o valor sugerido. */
  applyCoachNonce?: number;
}

export function Controls({ legal, active, pot, bigBlind, onAction, defaultRaiseTo, coachBetSize, applyCoachNonce }: ControlsProps) {
  const { t } = useT();
  const { unit, setUnit } = useSettings();
  const startTo = defaultRaiseTo ?? legal.minRaiseTo;
  const [raiseTo, setRaiseTo] = useState(startTo);

  useEffect(() => {
    const start = defaultRaiseTo ?? legal.minRaiseTo;
    setRaiseTo(Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, start)));
  }, [legal.minRaiseTo, legal.maxRaiseTo, defaultRaiseTo]);

  useEffect(() => {
    if (!applyCoachNonce || !coachBetSize || coachBetSize <= 0) return;
    const to = Math.round(coachBetSize * bigBlind);
    setRaiseTo(Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, to)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyCoachNonce]);

  const canRaise = active && legal.canRaise && legal.maxRaiseTo > legal.minRaiseTo;
  const clampRaise = (to: number) => Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, Math.round(to)));
  const presetTo = (bb: number) => clampRaise(bb * bigBlind);
  const potTo = clampRaise(pot + legal.callAmount);
  const submitRaise = () => {
    haptic();
    onAction(raiseTo >= legal.maxRaiseTo ? { type: "allin" } : { type: "raise", to: raiseTo });
  };

  return (
    <div className="controls controls-v2">
      <div className="action-panel">
        <div className="action-row action-row-primary">
          <button className="btn danger action-choice action-choice-fold" disabled={!active || !legal.canFold} onClick={() => { haptic(); onAction({ type: "fold" }); }}>
            <span className="action-choice-label">{t("ctrl.fold")}</span>
          </button>

          {legal.canCheck ? (
            <button className="btn action-choice action-choice-call" disabled={!active} onClick={() => { haptic(); onAction({ type: "check" }); }}>
              <span className="action-choice-label">{t("ctrl.check")}</span>
            </button>
          ) : (
            <button className="btn action-choice action-choice-call" disabled={!active || !legal.canCall} onClick={() => { haptic(); onAction({ type: "call" }); }}>
              <span className="action-choice-label">{t("ctrl.call")}</span>
              <span className="action-choice-value">{fmtAmount(legal.callAmount, bigBlind, unit)}</span>
            </button>
          )}
        </div>
      </div>

      <div className="raise-control-panel">
        <div className="raise-preset-stack" aria-label="Atalhos de aumento">
          <button className="btn raise-preset" type="button" disabled={!canRaise} onClick={() => setRaiseTo(potTo)}>Pote</button>
          <button className="btn raise-preset" type="button" disabled={!canRaise} onClick={() => setRaiseTo(presetTo(4))}>4BB</button>
          <button className="btn raise-preset" type="button" disabled={!canRaise} onClick={() => setRaiseTo(presetTo(3))}>3BB</button>
          <button className="btn raise-preset" type="button" disabled={!canRaise} onClick={() => setRaiseTo(presetTo(2))}>2BB</button>
          <button className="btn primary raise-submit" disabled={!canRaise} onClick={submitRaise}>
            <span>{legal.callAmount > 0 ? t("ctrl.raise") : t("ctrl.bet")}</span>
            <strong>{fmtAmount(raiseTo, bigBlind, unit)}</strong>
          </button>
        </div>
      </div>

      <div className="raise-slider-compact">
        <div className="raise-control-heading">
          <span className="control-section-label">AJUSTE FINO</span>
          <div className="raise-heading-actions">
            <span className="raise-amount">{fmtAmount(raiseTo, bigBlind, unit)}</span>
            <button className="btn unit-toggle unit-toggle-secondary" type="button" onClick={() => setUnit(unit === "bb" ? "chips" : "bb")} title={t("unit.toggle")}>
              {unit === "bb" ? "bb" : "fichas"}
            </button>
          </div>
        </div>
        <div className="slider-row slider-row-v2">
          <input type="range" min={legal.minRaiseTo} max={legal.maxRaiseTo} value={Math.min(raiseTo, legal.maxRaiseTo)} disabled={!canRaise} onChange={(e) => setRaiseTo(Number(e.target.value))} />
        </div>
      </div>

      {active && coachBetSize && coachBetSize > 0 ? (
        <div className="coach-size-hint">
          <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#0b0f0d", background: "linear-gradient(180deg,#ecd07a,#c9a227)" }} title="Tamanho sugerido pelo coach para esta rua">
            💰 coach: ~{Math.round(coachBetSize)}bb
          </span>
        </div>
      ) : null}
    </div>
  );
}
