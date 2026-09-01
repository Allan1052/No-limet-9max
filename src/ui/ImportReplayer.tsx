// ---------------------------------------------------------------------------
// IMPORT REPLAYER: revisa as mãos importadas (PokerStars/GGPoker) na mesma
// PokerTable usada pelo jogo. Os estados vêm prontos de parsedHandToReplay;
// este componente cuida apenas da navegação e das camadas visuais de revisão.
// ---------------------------------------------------------------------------

import { useMemo, useState } from "react";
import { useT } from "../i18n";
import { CardView } from "./Card";
import { PokerTable } from "./Table";
import type { ParsedHand, ParsedAction, Street } from "../import/handHistory";
import { parsedHandToReplay } from "../import/replayTable";
import type { FeedbackItem } from "../feedback/analyzer";
import type { SessionReport } from "../import/analyzeSession";
import { analyzePostflopStreets } from "../import/analyzePostflop";
import { SessionDiagnosis } from "./SessionDiagnosis";
import { drawHandShareCard, shareDataFromHand } from "../app/handShareCard";
import { trackEvent } from "../app/analytics";

function streetFbToFeedback(
  streetFb: Record<string, FeedbackItem>,
  preflop?: FeedbackItem,
): FeedbackItem[] {
  const out: FeedbackItem[] = [];
  if (preflop) out.push(preflop);
  for (const street of ["flop", "turn", "river"] as const) {
    const it = streetFb[street];
    if (it) out.push(it);
  }
  return out;
}

const STREET_PT: Record<Street, string> = {
  preflop: "Pré-Flop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
};

const ACTION_PT: Record<string, string> = {
  fold: "Fold",
  check: "Check",
  call: "Call",
  bet: "Aposta",
  raise: "Raise",
  sb: "Small Blind",
  bb: "Big Blind",
  ante: "Ante",
  uncalled: "Devolvido",
  collected: "Levou o pote",
};

function fmtBB(chips: number, bb: number): string {
  const v = bb > 0 ? chips / bb : chips;
  return v < 10 ? `${(Math.round(v * 2) / 2).toString().replace(/\.0$/, "")}bb` : `${Math.round(v)}bb`;
}

function famOf(label: string): "fold" | "check" | "call" | "aggro" {
  const t = label.toLowerCase();
  if (t.includes("fold") || t.includes("larg")) return "fold";
  if (t.includes("check") || t.includes("mesa")) return "check";
  if (t.includes("call") || t.includes("pag")) return "call";
  return "aggro";
}

export function ImportReplayer({
  hands,
  reports,
  session,
  startIndex = 0,
  onBack,
  onNewSession,
  _previewStep,
}: {
  hands: ParsedHand[];
  reports: { handId: string; feedback?: FeedbackItem; heroCardsText: string; effectiveBB: number; situation: string; skipped?: string }[];
  session?: SessionReport;
  startIndex?: number;
  onBack?: () => void;
  onNewSession?: () => void;
  _previewStep?: number;
}) {
  const { t } = useT();
  const [handIdx, setHandIdx] = useState(startIndex);
  const [showDiag, setShowDiag] = useState(false);
  const hand = hands[handIdx];
  const report = reports[handIdx];
  const frames = useMemo(() => parsedHandToReplay(hand), [hand]);
  const [stepIdx, setStepIdx] = useState(_previewStep ?? 0);
  const frame = frames[Math.min(stepIdx, Math.max(0, frames.length - 1))];
  const atEnd = stepIdx >= frames.length - 1;
  const isLastHand = handIdx === hands.length - 1;

  const streetFb = useMemo(() => analyzePostflopStreets(hand, "free"), [hand]);
  const fb = report?.feedback;
  const curStreet: Street = frame?.street ?? "preflop";
  const revealing = !!frame?.state.handOver;
  const coachFb =
    curStreet === "flop" || curStreet === "turn" || curStreet === "river"
      ? streetFb[curStreet]
      : fb;

  const mistakeFixBB = useMemo(() => {
    const isBad = (it: FeedbackItem) => {
      const good = it.rating === "boa" || it.rating === "ok";
      const matched = !!it.heroAction && famOf(it.heroAction) === famOf(it.advice);
      return !good && !matched;
    };
    const worst: { bb: number } = { bb: 0 };
    for (const street of ["flop", "turn", "river"] as const) {
      const it = streetFb[street];
      if (it && isBad(it) && (it.betSizeBB ?? 0) > worst.bb) {
        worst.bb = it.betSizeBB ?? 0;
      }
    }
    if (coachFb && isBad(coachFb) && (coachFb.betSizeBB ?? 0) > worst.bb) {
      worst.bb = coachFb.betSizeBB ?? 0;
    }
    return worst.bb > 0 ? worst.bb : undefined;
  }, [streetFb, coachFb]);

  const toHistory = useMemo(() => {
    const heroSeat = hand.seats.find((s) => s.isHero)?.seat ?? 0;
    const names: Record<number, string> = {};
    const startingStacks: Record<number, number> = {};
    const holeCards: Record<number, import("../engine/cards").Card[]> = {};
    for (const s of hand.seats) {
      names[s.seat] = s.name;
      startingStacks[s.seat] = s.stack;
    }
    if (hand.heroCards.length >= 2) holeCards[heroSeat] = hand.heroCards;
    for (const [nm, cards] of Object.entries(hand.shownCards ?? {})) {
      const seat = hand.seats.find((s) => s.name === nm)?.seat;
      if (seat !== undefined && cards.length > 0) holeCards[seat] = cards;
    }
    const bbChips = hand.bb || 1;
    const events = hand.actions.map((a: ParsedAction) => {
      const seat = hand.seats.find((s) => s.name === a.player)?.seat ?? 0;
      const isHero = a.player === (hand.heroName ?? "Você");
      const type = String(a.type);
      let label = ACTION_PT[type] ?? type;
      if (a.amount > 0 && (type === "bet" || type === "raise" || type === "allin" || type === "call")) {
        label = `${label} ${fmtBB(a.amount, bbChips)}`;
      }
      if (a.allIn && type !== "allin") label = `${label} (all-in)`;
      return {
        street: a.street,
        seat,
        name: a.player,
        isHero,
        actionLabel: label,
        actionType: type === "allin" ? "allin" : type === "bet" ? "bet" : type,
        board: hand.board,
        pot: a.amount,
      };
    });

    let potChips = 0;
    let comm: Record<string, number> = {};
    let curSt: string | null = null;
    for (const a of hand.actions) {
      if (a.street !== curSt) { comm = {}; curSt = a.street; }
      if (a.type === "sb" || a.type === "bb" || a.type === "ante" || a.type === "call" || a.type === "bet") {
        potChips += a.amount;
        comm[a.player] = (comm[a.player] ?? 0) + a.amount;
      } else if (a.type === "raise") {
        const delta = Math.max(0, a.amount - (comm[a.player] ?? 0));
        potChips += delta;
        comm[a.player] = a.amount;
      } else if (a.type === "uncalled") {
        potChips = Math.max(0, potChips - a.amount);
      }
    }
    const showdown: any =
      Object.keys(hand.shownCards ?? {}).length > 0 || (hand.winners ?? []).length > 0
        ? {
            showdown: true,
            pots: [{ amount: potChips }],
            winningsBySeat: (hand.winners ?? []).reduce<Record<string, number>>((o, nm) => {
              const seat = hand.seats.find((s) => s.name === nm)?.seat;
              if (seat !== undefined) o[String(seat)] = 1;
              return o;
            }, {}),
            handValueBySeat: hand.shownCards ?? {},
          }
        : undefined;
    return {
      events,
      holeCards,
      names,
      heroSeat,
      finalBoard: hand.board,
      buttonSeat: hand.buttonSeat,
      bigBlind: hand.bb,
      startingStacks,
      result: showdown,
      heroPosition: hand.seats.find((s) => s.isHero)?.position,
    };
  }, [hand]);

  if (showDiag && session) {
    return (
      <div className="import-replayer">
        <div className="ir-head">
          <button className="btn tiny" onClick={() => setShowDiag(false)}>
            ◀ Voltar ao replay
          </button>
          <span className="ir-counter">🏁 Diagnóstico</span>
          <span />
        </div>
        <SessionDiagnosis
          report={session}
          onReview={() => {
            setShowDiag(false);
            setHandIdx(0);
            setStepIdx(0);
          }}
          onTrain={onBack}
        />
      </div>
    );
  }

  const handleShareCard = async () => {
    trackEvent("share_started", { source: "import_replayer" });
    try {
      const ruaFb: FeedbackItem[] = coachFb ? [coachFb] : [];
      const data = shareDataFromHand(
        toHistory,
        ruaFb.length > 0 ? ruaFb : streetFbToFeedback(streetFb, fb),
        mistakeFixBB !== undefined ? { mistakeFixBB } : undefined,
      );
      if (!data) {
        trackEvent("share_failed", { source: "import_replayer", reason: "share_data" });
        return;
      }
      const blob = await drawHandShareCard(data, "simples", "decisao");
      if (!blob) {
        trackEvent("share_failed", { source: "import_replayer", reason: "card_generation" });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `calloufold-mao-${handIdx + 1}.png`;
      a.click();
      window.open(url, "_blank", "noopener");
      trackEvent("share_succeeded", { source: "import_replayer", method: "download" });
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      trackEvent("share_failed", { source: "import_replayer", reason: "exception" });
      console.error("[ImportReplayer] falha ao gerar card", e);
    }
  };

  if (!frame) return null;

  return (
    <div className="import-replayer ir-fullscreen">
      <div className="ir-head">
        <button className="btn tiny ir-exit" onClick={onBack}>✕</button>
        <span className="ir-brand">
          CALL <i>ou</i> FOLD
          <span className="ir-counter">{t("import.handN", { n: handIdx + 1, total: hands.length })}</span>
        </span>
        <span className="ir-nav">
          <button
            className="btn tiny"
            disabled={handIdx === 0}
            onClick={() => { setHandIdx((i) => i - 1); setStepIdx(0); }}
          >◀◀</button>
          <button
            className="btn tiny"
            disabled={handIdx === hands.length - 1}
            onClick={() => { setHandIdx((i) => i + 1); setStepIdx(0); }}
          >▶▶</button>
          {session ? (
            <button className="btn tiny" onClick={() => setShowDiag(true)} title="Diagnóstico da sessão">🏁</button>
          ) : null}
        </span>
      </div>

      <div className="ir-table">
        <PokerTable
          table={frame.state}
          readOnly
          replayActorSeat={frame.actorSeat}
          lastActionLabel={frame.actorSeat >= 0 ? { [frame.actorSeat]: frame.label } : {}}
        />
      </div>

      {coachFb ? (() => {
        const good = coachFb.rating === "boa" || coachFb.rating === "ok";
        const matched = !!coachFb.heroAction && famOf(coachFb.heroAction) === famOf(coachFb.advice);
        const alt = good && !matched;
        const cls = alt
          ? "c-alt"
          : coachFb.rating === "boa" ? "c-boa" : coachFb.rating === "ok" ? "c-ok" : coachFb.rating === "imprecisa" ? "c-imp" : "c-ruim";
        const icon = alt ? "≈" : good ? "✓" : "✗";
        return (
          <div className={`ir-coach ${cls}`}>
            <span className="ir-coach-badge">{icon}</span>
            <span className="ir-coach-txt">
              <b className="ir-coach-street">{STREET_PT[curStreet]}</b>
              {alt ? (
                <>{" · "}<b>{coachFb.heroAction.toUpperCase()}</b> é alternativa ok — padrão: <b>{coachFb.advice.toUpperCase()}</b></>
              ) : (
                <>
                  {" · "}Coach recomendava <b>{coachFb.advice.toUpperCase()}</b>
                  {coachFb.heroAction ? <>{" · "}você fez <b>{coachFb.heroAction.toUpperCase()}</b></> : null}
                </>
              )}
              {coachFb.betSizeBB && coachFb.betSizeBB > 0 ? (
                <span
                  className="ir-coach-size"
                  style={{
                    display: "inline-block",
                    marginLeft: 8,
                    padding: "1px 8px",
                    borderRadius: 8,
                    fontSize: "0.82em",
                    fontWeight: 700,
                    color: "#0b0f0d",
                    background: "linear-gradient(180deg,#ecd07a,#c9a227)",
                  }}
                >
                  💰 aposte ~{Math.round((coachFb.betSizePct ?? 0) * 100)}% do pote · ≈ {coachFb.betSizeBB}bb
                </span>
              ) : null}
              {curStreet !== "preflop" ? <span className="ir-coach-est">estimativa</span> : null}
            </span>
          </div>
        );
      })() : (curStreet === "preflop" && report?.skipped ? (
        <div className="ir-coach c-note">
          <span className="ir-coach-badge">ℹ️</span>
          <span className="ir-coach-txt">
            <b className="ir-coach-street">{STREET_PT.preflop}</b>{" · "}{report.skipped}
          </span>
        </div>
      ) : null)}

      {!revealing ? (
        <div className="ir-step">
          <span className="ir-street">{STREET_PT[curStreet]}</span>
          <span className="ir-action">{frame.label}</span>
        </div>
      ) : (
        <div className="ir-result">
          <div className="ir-result-title">{t("import.result")}</div>
          <div className="ir-result-body">
            {(() => {
              const shown = hand.shownCards ?? {};
              const shownNames = Object.keys(shown);
              const winners = hand.winners ?? [];
              return (
                <>
                  {shownNames.length > 0 ? (
                    <div className="ir-showdown">
                      {shownNames.map((nm) => {
                        const won = winners.includes(nm);
                        const isHero = nm === hand.heroName;
                        return (
                          <div key={nm} className={`ir-sd-row${won ? " win" : ""}${isHero ? " me" : ""}`}>
                            <div className="ir-sd-cards">
                              {shown[nm].map((c, i) => <CardView key={i} card={c} small />)}
                            </div>
                            <div className="ir-sd-info">
                              <div className="ir-sd-name">
                                {isHero ? `${nm} (você)` : nm} {won ? <span className="ir-sd-win">🏆 levou</span> : null}
                              </div>
                              {hand.handDesc?.[nm] ? <div className="ir-sd-desc">{hand.handDesc[nm]}</div> : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="ir-noshow">
                      <b>{winners.length ? `${winners.join(", ")} levou o pote` : "pote resolvido"}</b>
                      <span className="ir-muted"> · sem showdown (ninguém precisou mostrar)</span>
                    </div>
                  )}
                  {fb ? (
                    <div className={`ir-fb ${fb.rating === "boa" ? "fb-boa" : fb.rating === "imprecisa" ? "fb-imp" : fb.rating === "ruim" ? "fb-ruim" : "fb-ok"}`}>
                      <b>Coach:</b> {fb.text}
                    </div>
                  ) : null}
                  {report?.situation ? <div className="ir-situ">{report.situation}</div> : null}
                  <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    <button
                      className="btn primary"
                      style={{ flex: 1, background: "linear-gradient(180deg, #c9a227, #b08d1f)", color: "#000" }}
                      onClick={handleShareCard}
                    >🃏 Gerar card da mão</button>
                    {session ? (
                      <button className="btn primary" style={{ flex: 1 }} onClick={() => setShowDiag(true)}>
                        {isLastHand ? "🏁 Diagnóstico" : "🏁 Ver diagnóstico"}
                      </button>
                    ) : null}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      <div className="ir-nav">
        <button className="btn" disabled={stepIdx === 0} onClick={() => setStepIdx((s) => Math.max(0, s - 1))}>
          ◀ {t("import.prevAction")}
        </button>
        <span className="ir-counter">{atEnd ? t("import.end") : `${stepIdx + 1}/${frames.length}`}</span>
        <button className="btn" disabled={atEnd} onClick={() => setStepIdx((s) => Math.min(frames.length - 1, s + 1))}>
          {t("import.nextAction")} ▶
        </button>
      </div>

      <details className="ir-timeline">
        <summary>{t("import.timeline")}</summary>
        <div className="ir-tl-list">
          {frames.map((item, i) => (
            <span
              key={`${i}-${item.label}`}
              className={`ir-tl-item${i === stepIdx ? " ir-tl-now" : ""}`}
              onClick={() => setStepIdx(i)}
            >
              {item.label}
            </span>
          ))}
        </div>
      </details>

      {onNewSession ? (
        <button className="ir-newsession" onClick={onNewSession}>➕ Importar outra sessão</button>
      ) : null}
    </div>
  );
}
