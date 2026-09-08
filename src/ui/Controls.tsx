// Controles do herói: Fold, Check/Call, Raise, BB. All-in segue via slider no máximo.
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

type QuickRaise = { kind: "pot" } | { kind: "bb"; bb: number };
export const DEFAULT_QUICK_RAISES: QuickRaise[] = [
  { kind: "pot" },
  { kind: "bb", bb: 4 },
  { kind: "bb", bb: 3 },
];
const QUICK_RAISE_KEY = "calloufold.quickRaiseConfig.v1";

function loadQuickRaises(): QuickRaise[] {
  if (typeof window === "undefined") return DEFAULT_QUICK_RAISES;
  try {
    const raw = localStorage.getItem(QUICK_RAISE_KEY);
    if (!raw) return DEFAULT_QUICK_RAISES;
    const parsed = JSON.parse(raw) as QuickRaise[];
    if (!Array.isArray(parsed) || parsed.length !== 3) return DEFAULT_QUICK_RAISES;
    return parsed.map((item, index) => {
      if (item?.kind === "pot") return item;
      const bb = Number((item as { bb?: number })?.bb);
      return Number.isFinite(bb) && bb >= 2 && bb <= 100 ? { kind: "bb", bb } : DEFAULT_QUICK_RAISES[index];
    });
  } catch {
    return DEFAULT_QUICK_RAISES;
  }
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
  applyCoachNonce?: number;
}

export function Controls({ legal, active, pot, bigBlind, onAction, defaultRaiseTo, coachBetSize, applyCoachNonce }: ControlsProps) {
  const { t } = useT();
  const { unit, setUnit } = useSettings();
  const startTo = defaultRaiseTo ?? legal.minRaiseTo;
  const [raiseTo, setRaiseTo] = useState(startTo);
  const [fineTuneOpen, setFineTuneOpen] = useState(false);
  const [quickRaiseConfig, setQuickRaiseConfig] = useState<QuickRaise[]>(loadQuickRaises);

  useEffect(() => {
    const start = defaultRaiseTo ?? legal.minRaiseTo;
    setRaiseTo(Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, start)));
    setFineTuneOpen(false);
  }, [legal.minRaiseTo, legal.maxRaiseTo, defaultRaiseTo]);

  useEffect(() => {
    if (!applyCoachNonce || !coachBetSize || coachBetSize <= 0) return;
    const to = Math.round(coachBetSize * bigBlind);
    setRaiseTo(Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, to)));
    setFineTuneOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyCoachNonce]);

  const canRaise = active && legal.canRaise && legal.maxRaiseTo > legal.minRaiseTo;
  const clampRaise = (to: number) => Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, Math.round(to)));
  const presetTo = (bb: number) => clampRaise(bb * bigBlind);
  const potTo = clampRaise(pot + legal.callAmount);
  const quickTo = (item: QuickRaise) => item.kind === "pot" ? potTo : presetTo(item.bb);
  const quickLabel = (item: QuickRaise) => item.kind === "pot" ? "Pote" : `${item.bb:g}BB`.replace(":g", "");
  const choosePreset = (to: number) => setRaiseTo(to);

  const editQuickRaise = (index: number) => {
    const current = quickRaiseConfig[index];
    const initial = current.kind === "pot" ? "POTE" : String(current.bb);
    const value = window.prompt("Editar atalho: digite a quantidade de BB (ex.: 3.5). Para usar o pote, digite POTE.", initial);
    if (value == null) return;
    const normalized = value.trim().toUpperCase();
    let nextItem: QuickRaise;
    if (normalized === "POTE" || normalized === "POT") {
      nextItem = { kind: "pot" };
    } else {
      const bb = Number(value.replace(",", "."));
      if (!Number.isFinite(bb) || bb < 2 || bb > 100) {
        window.alert("Escolha um valor entre 2 e 100 BB.");
        return;
      }
      nextItem = { kind: "bb", bb: Math.round(bb * 10) / 10 };
    }
    const next = quickRaiseConfig.map((item, i) => i === index ? nextItem : item);
    setQuickRaiseConfig(next);
    try { localStorage.setItem(QUICK_RAISE_KEY, JSON.stringify(next)); } catch { /* storage indisponível */ }
  };

  const submitRaise = () => {
    haptic();
    setFineTuneOpen(false);
    onAction(raiseTo >= legal.maxRaiseTo ? { type: "allin" } : { type: "raise", to: raiseTo });
  };

  const actionLabel = legal.callAmount > 0 ? t("ctrl.raise") : t("ctrl.bet");

  return (
    <div className={`controls controls-v2${fineTuneOpen ? " fine-tune-open" : ""}`}>
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

        <button className="btn primary action-choice raise-submit" disabled={!canRaise} onClick={submitRaise}>
          <span className="action-choice-label">{actionLabel}</span>
          <span className="action-choice-value">{fmtAmount(raiseTo, bigBlind, unit)}</span>
        </button>
      </div>

      <div className="raise-side-tools">
        <div className="raise-size-stack" aria-label="Tamanhos rápidos de aumento">
          {quickRaiseConfig.map((item, index) => {
            const to = quickTo(item);
            return (
              <div className="raise-size-item" key={`${index}-${quickLabel(item)}`}>
                <button className="btn raise-size-option" type="button" disabled={!canRaise} onClick={() => choosePreset(to)}>
                  <span>{quickLabel(item)}</span><strong>{fmtAmount(to, bigBlind, unit)}</strong>
                </button>
                <button className="raise-size-edit" type="button" aria-label={`Editar atalho ${index + 1}`} title="Editar atalho" onClick={() => editQuickRaise(index)}>✎</button>
              </div>
            );
          })}
        </div>

        <button
          className="btn fine-tune-toggle"
          type="button"
          disabled={!canRaise}
          aria-expanded={fineTuneOpen}
          aria-label={fineTuneOpen ? "Fechar ajuste fino" : "Abrir ajuste fino"}
          onClick={() => setFineTuneOpen((open) => !open)}
        >
          <span aria-hidden="true">⌃</span>
        </button>
      </div>

      <div className="raise-slider-popover" aria-hidden={!fineTuneOpen}>
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
