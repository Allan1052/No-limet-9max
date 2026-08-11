// Controles do herói: Fold, Check/Call, Raise, BB. All-in foi removido por
// pedido do Allan (08/08): botão grande perto do slider causava toques
// acidentais. All-in continua possível: slider no máximo vira all-in.
import { useEffect, useState } from "react";
import { fmtAmount } from "../app/format";
import { useSettings } from "../app/settings";
import { useT } from "../i18n";
import type { LegalActions } from "../game/betting";
import type { Action } from "../game/engine";
import { useVoiceCommands, type VoiceParse } from "./useVoiceCommands";

interface ControlsProps {
  legal: LegalActions;
  active: boolean; // é a vez do herói?
  pot: number;
  bigBlind: number;
  onAction: (a: Action) => void;
  isOmaha?: boolean; // Indica se é Omaha (PLO)
  /** Valor sugerido para o slider começar (pré-flop: abertura padrão + limpers). */
  defaultRaiseTo?: number;
}

export function Controls({ legal, active, pot, bigBlind, onAction, isOmaha = false, defaultRaiseTo }: ControlsProps) {
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

  // Comando de voz: ações + valor exato + % do pote, nos MESMOS handlers.
  const clampTo = (v: number) =>
    Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, Math.round(v)));
  const execRaise = (to: number, forceAllin = false) => {
    if (forceAllin || to >= legal.maxRaiseTo) onAction({ type: "allin" });
    else if (canRaise) onAction({ type: "raise", to });
  };
  const runVoice = (p: VoiceParse) => {
    if (!active) return;
    const { cmd, amount, percent } = p;

    // "aposta 60 por cento" / "75%": calcula sobre o pote e ajusta o slider.
    if (percent !== undefined && canRaise) {
      const target = clampTo(Math.round((legal.callAmount + pot) * (percent / 100)) + legal.callAmount);
      setRaiseTo(target);
      if (cmd === "raise" || cmd === "allin") execRaise(target, cmd === "allin");
      return;
    }

    // "raise 20" / "aumenta pra 15" / só "vinte": valor absoluto (na unidade da
    // tela). Com comando de raise/all-in, já aposta; só o número, ajusta o slider.
    if (amount !== undefined) {
      const chips = clampTo(unit === "bb" ? amount * bigBlind : amount);
      setRaiseTo(chips);
      if (cmd === "raise" || cmd === "allin") execRaise(chips, cmd === "allin");
      return;
    }

    // Comandos simples.
    if (cmd === "fold" && legal.canFold) onAction({ type: "fold" });
    else if (cmd === "check" && legal.canCheck) onAction({ type: "check" });
    else if (cmd === "call") {
      if (legal.canCall) onAction({ type: "call" });
      else if (legal.canCheck) onAction({ type: "check" });
    } else if (cmd === "raise" && canRaise) execRaise(raiseTo);
    else if (cmd === "allin" && legal.canRaise) onAction({ type: "allin" });
  };
  const voice = useVoiceCommands(runVoice);

  return (
    <div className="controls">
      {/* Linha 1: Fold / Call / Raise / BB — lado a lado */}
      <div className="action-row">
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
          className="btn primary"
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

      {/* Linha 3: Slider + valor (+ microfone de voz, quando suportado) */}
      <div className="slider-row">
        {voice.supported ? (
          <button
            type="button"
            className={`btn voice-btn${voice.listening ? " on" : ""}`}
            onClick={voice.toggle}
            title={voice.listening ? "Voz ligada — diga: fold, call, raise" : "Comando de voz"}
            aria-pressed={voice.listening}
          >
            {voice.listening ? "🎙️" : "🎤"}
          </button>
        ) : null}
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

      {voice.listening ? (
        <div className="voice-hint">
          🎙️ ouvindo — <b>fold</b>, <b>call</b>, <b>raise</b>, <b>all-in</b> · ou o valor: <b>"raise 20"</b> / <b>"60%"</b>
        </div>
      ) : null}
      {voice.error ? <div className="voice-hint err">{voice.error}</div> : null}
    </div>
  );
}
