// Controles do herói: Fold, Check/Call, Raise, BB. All-in foi removido por
// pedido do Allan (08/08): botão grande perto do slider causava toques
// acidentais. All-in continua possível: slider no máximo vira all-in.
import { useEffect, useState } from "react";
import { fmtAmount } from "../app/format";
import { useSettings } from "../app/settings";
import { useT } from "../i18n";
import type { LegalActions } from "../game/betting";
import type { Action } from "../game/engine";

// Haptics — vibração sutil ao tocar nos botões de ação (mobile)
function haptic() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(15); // vibração curta e leve
  }
}

interface ControlsProps {
  legal: LegalActions;
  active: boolean; // é a vez do herói?
  pot: number;
  bigBlind: number;
  onAction: (a: Action) => void;
  isOmaha?: boolean; // Indica se é Omaha (PLO)
  /** Valor sugerido para o slider começar (pré-flop: abertura padrão + limpers). */
  defaultRaiseTo?: number;
  /** Tamanho de aposta recomendado pelo coach neste spot (em bb), quando a linha
   * certa é agressiva. Renderiza o chip dourado "💰 ~Xbb" ao vivo na mesa. */
  coachBetSize?: number;
}

export function Controls({ legal, active, pot, bigBlind, onAction, isOmaha = false, defaultRaiseTo, coachBetSize }: ControlsProps) {
  const { t } = useT();
  const { unit, setUnit } = useSettings();
  const startTo = defaultRaiseTo ?? legal.minRaiseTo;
  const [raiseTo, setRaiseTo] = useState(startTo);

  // Reajusta o slider sempre que o spot muda: começa na abertura sugerida
  // (2.3bb + limpers no pré-flop), limitada ao intervalo legal.
  useEffect(() => {
    const start = defaultRaiseTo ?? legal.minRaiseTo;
    setRaiseTo(Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, start)));
  }, [legal.minRaiseTo, legal.maxRaiseTo, defaultRaiseTo]);

  const canRaise = active && legal.canRaise && legal.maxRaiseTo > legal.minRaiseTo;
  const potBet = (frac: number) => {
    const target = Math.round((legal.callAmount + pot) * frac) + legal.callAmount;
    setRaiseTo(Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, target)));
  };


  return (
    <div className="controls">
      {/* Linha 1: Fold / Call / Raise / BB — lado a lado */}
      <div className="action-row">
        <button
          className="btn danger"
          disabled={!active || !legal.canFold}
          onClick={() => { haptic(); onAction({ type: "fold" }); }}
        >
          {t("ctrl.fold")}
        </button>

        {legal.canCheck ? (
          <button className="btn" disabled={!active} onClick={() => { haptic(); onAction({ type: "check" }); }}>
            {t("ctrl.check")}
          </button>
        ) : (
          <button
            className="btn"
            disabled={!active || !legal.canCall}
            onClick={() => { haptic(); onAction({ type: "call" }); }}
          >
            {t("ctrl.call")} {fmtAmount(legal.callAmount, bigBlind, unit)}
          </button>
        )}

        <button
          className="btn primary"
          disabled={!canRaise}
          onClick={() => {
            haptic();
            onAction(
              raiseTo >= legal.maxRaiseTo ? { type: "allin" } : { type: "raise", to: raiseTo },
            );
          }}
        >
          {legal.callAmount > 0 ? t("ctrl.raise") : t("ctrl.bet")}
        </button>

        <button
          className="btn unit-toggle"
          type="button"
          onClick={() => setUnit(unit === "bb" ? "chips" : "bb")}
          title={t("unit.toggle")}
        >
          {unit === "bb" ? "bb" : "fichas"}
        </button>
      </div>

      {/* Linha 2: Percentuais + All-in */}
      <div className="pct-row">
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
      </div>

      {/* Linha 3: Slider + valor */}
      <div className="slider-row">
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
      {active && coachBetSize && coachBetSize > 0 ? (
        <div className="coach-size-hint">
          <span
            style={{
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              color: "#0b0f0d",
              background: "linear-gradient(180deg,#ecd07a,#c9a227)",
            }}
            title="Tamanho sugerido pelo coach para esta rua"
          >
            💰 coach: ~{Math.round(coachBetSize)}bb
          </span>
        </div>
      ) : null}
    </div>
  );
}
