// ---------------------------------------------------------------------------
// IMPORT REPLAYER: revisa as mãos importadas (PokerStars/GGPoker) como se
// estivesse jogando o torneio — mesa desenhada, ação por ação, board rua por
// rua e resultado com o feedback do coach ao final. Sem lista de mãos.
// ---------------------------------------------------------------------------

import { useMemo, useState } from "react";
import { useT } from "../i18n";
import { CardView } from "./Card";
import { cardToString } from "../engine/cards";
import type { ParsedHand, ParsedAction, Street } from "../import/handHistory";
import type { FeedbackItem } from "../feedback/analyzer";
import type { SessionReport } from "../import/analyzeSession";
import { SessionDiagnosis } from "./SessionDiagnosis";

const POS_SHORT: Record<string, string> = {
  UTG: "UTG",
  UTG1: "UTG+1",
  MP: "MP",
  LJ: "LJ",
  HJ: "HJ",
  CO: "CO",
  SB: "SB",
  BB: "BB",
  BTN: "BTN",
};

// Anel de posições da mesa (herói embaixo, no centro = slot 0). Mesa em retrato
// (mais alta) e assentos afastados do centro pra não encavalar o board no 9-max.
const SEAT_POS: Array<{ top: string; left: string }> = [
  { top: "88%", left: "50%" },
  { top: "80%", left: "20%" },
  { top: "54%", left: "12%" },
  { top: "29%", left: "17%" },
  { top: "14%", left: "40%" },
  { top: "14%", left: "60%" },
  { top: "29%", left: "83%" },
  { top: "54%", left: "88%" },
  { top: "80%", left: "80%" },
];

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

/** bb inteiro a partir de fichas (o parser guarda FICHAS, não bb). */
function toBB(chips: number, bb: number): number {
  return bb > 0 ? Math.round(chips / bb) : Math.round(chips);
}

/** bb com 1 casa quando pequeno ("3.5bb"), inteiro quando grande ("14bb"). */
function fmtBB(chips: number, bb: number): string {
  const v = bb > 0 ? chips / bb : chips;
  return v < 10 ? `${(Math.round(v * 2) / 2).toString().replace(/\.0$/, "")}bb` : `${Math.round(v)}bb`;
}

/** Label legível da ação já em bb: "Call 2bb", "Raise 5bb", "All-in". */
function actionText(a: ParsedAction, bb: number): string {
  const label = ACTION_PT[a.type] ?? a.type;
  if (
    a.type === "fold" ||
    a.type === "check" ||
    a.type === "uncalled" ||
    a.type === "collected"
  )
    return label;
  const bbv = fmtBB(a.amount, bb);
  if (a.allIn) return `${label} ${bbv} (all-in)`;
  return `${label} ${bbv}`;
}

interface SeatState {
  slot: number; // índice da posição na mesa (0..8)
  name: string;
  stack: number; // fichas restantes no momento do passo
  position: string;
  isHero: boolean;
  isButton: boolean;
  folded: boolean;
  lastAction: string | null;
}

interface StepInfo {
  actionIdx: number; // -1 inicial, -2 rua, -3 resultado
  action: ParsedAction | null;
  board: number[];
  seats: SeatState[];
  pot: string | null; // ex.: "Alguém levou o pote"
  potBB: number; // pote acumulado (em bb) até este passo
}

/**
 * Constroi os passos de replay de uma mão. Entre as ações reais são inseridos
 * passos "rua" (flop/turn/river) que fazem o board crescer.
 */
function buildSteps(hand: ParsedHand): StepInfo[] {
  const n = hand.seats.length;
  // slot visual: o herói fica embaixo (slot 0); os demais distribuídos ao redor
  // mantendo o sentido horário. Quem não é herói: mapear na ordem dos seats.
  const seatSlots: number[] = [];
  let heroSlot = 0;
  let slot = 1;
  const order = [...hand.seats].sort((a, b) => a.seat - b.seat);
  for (const s of order) {
    if (s.isHero) {
      heroSlot = 0;
    } else {
      seatSlots.push(slot);
      slot += 1;
    }
  }
  void heroSlot;
  let otherIdx = 0;
  const slotOf: Record<string, number> = {};
  for (const s of order) {
    slotOf[s.name] = s.isHero ? 0 : seatSlots[otherIdx++];
  }

  const seatsAt: SeatState[] = order.map((s) => ({
    slot: slotOf[s.name],
    name: s.name,
    stack: s.stack,
    position: POS_SHORT[s.position ?? ""] ?? "",
    isHero: s.isHero,
    isButton: s.isButton,
    folded: false,
    lastAction: null,
  }));

  const bb = hand.bb || 1;
  // Pote e apostas por rua (em FICHAS) — reconstrói o pote crescendo de verdade.
  let potChips = 0;
  let committed: Record<string, number> = {}; // aposta desta rua, por jogador

  const steps: StepInfo[] = [
    {
      actionIdx: -1,
      action: null,
      board: [],
      seats: seatsAt.map((s) => ({ ...s })),
      pot: null,
      potBB: 0,
    },
  ];

  let visibleBoard = 0;
  let lastStreet: Street = "preflop";

  for (let i = 0; i < hand.actions.length; i++) {
    const a = hand.actions[i];
    const targetVisible =
      a.street === "flop"
        ? 3
        : a.street === "turn"
          ? 4
          : a.street === "river"
            ? 5
            : 0;
    if (targetVisible > visibleBoard && lastStreet !== a.street) {
      visibleBoard = targetVisible;
      lastStreet = a.street;
      committed = {}; // nova rua: zera as apostas da rua
      steps.push({
        actionIdx: -2,
        action: null,
        board: hand.board.slice(0, visibleBoard),
        seats: seatsAt.map((s) => ({ ...s })),
        pot: null,
        potBB: toBB(potChips, bb),
      });
    }
    const seat = seatsAt.find((s) => s.name === a.player);
    if (seat) {
      seat.lastAction = actionText(a, bb);
      if (a.type === "fold") {
        seat.folded = true;
        seat.lastAction = "Fold";
      } else if (a.type === "ante") {
        const d = a.amount || hand.ante;
        seat.stack = Math.max(0, seat.stack - d);
        potChips += d;
      } else if (a.type === "sb" || a.type === "bb" || a.type === "call" || a.type === "bet") {
        const d = a.amount || (a.type === "sb" ? hand.sb : a.type === "bb" ? hand.bb : 0);
        seat.stack = Math.max(0, seat.stack - d);
        potChips += d;
        committed[a.player] = (committed[a.player] ?? 0) + d;
      } else if (a.type === "raise") {
        // amount é o TOTAL "to" — o que entra é o delta sobre o já apostado na rua.
        const delta = Math.max(0, a.amount - (committed[a.player] ?? 0));
        seat.stack = Math.max(0, seat.stack - delta);
        potChips += delta;
        committed[a.player] = a.amount;
      } else if (a.type === "uncalled") {
        seat.stack += a.amount;
        potChips = Math.max(0, potChips - a.amount);
        committed[a.player] = Math.max(0, (committed[a.player] ?? 0) - a.amount);
      }
    }
    steps.push({
      actionIdx: i,
      action: a,
      board: hand.board.slice(0, visibleBoard),
      seats: seatsAt.map((s) => ({ ...s })),
      pot:
        a.type === "collected"
          ? `${a.player} levou o pote`
          : a.type === "uncalled"
            ? `Devolvido a ${a.player}`
            : null,
      potBB: toBB(potChips, bb),
    });
  }

  // Passo final: resultado da mão
  steps.push({
    actionIdx: -3,
    action: null,
    board: hand.board,
    seats: seatsAt.map((s) => ({ ...s })),
    pot: "Resultado",
    potBB: toBB(potChips, bb),
  });

  void n;
  return steps;
}

export function ImportReplayer({
  hands,
  reports,
  session,
  startIndex = 0,
  onBack,
  _previewStep,
}: {
  hands: ParsedHand[];
  reports: { handId: string; feedback?: FeedbackItem; heroCardsText: string; effectiveBB: number; situation: string }[];
  /** Sessão completa — habilita o diagnóstico final (nota + fortes/fracos/ajustes). */
  session?: SessionReport;
  startIndex?: number;
  onBack?: () => void;
  /** Apenas para preview/testes: passo inicial do replay. */
  _previewStep?: number;
}) {
  const { t } = useT();
  const [handIdx, setHandIdx] = useState(startIndex);
  const [showDiag, setShowDiag] = useState(false);
  const hand = hands[handIdx];
  const report = reports[handIdx];
  const steps = useMemo(() => buildSteps(hand), [hand]);
  const [stepIdx, setStepIdx] = useState(_previewStep ?? 0);
  const step = steps[stepIdx];
  const atEnd = stepIdx >= steps.length - 1;
  const isLastHand = handIdx === hands.length - 1;

  // ── DIAGNÓSTICO DA SESSÃO — o raio-x do treinador ao fim da revisão ──
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

  const boardStr = useMemo(
    () => hand.board.map((c) => cardToString(c)).join(" "),
    [hand],
  );
  const fb = report?.feedback;

  const streetOfStep = (): Street => {
    if (step.action) return step.action.street;
    if (stepIdx === 0) return "preflop";
    return steps[stepIdx - 1]?.action?.street ?? "preflop";
  };

  return (
    <div className="import-replayer">
      {/* Cabeçalho: mão atual + voltar para o raio-x */}
      <div className="ir-head">
        <button className="btn tiny" onClick={onBack}>
          ◀ {t("import.backToList")}
        </button>
        <span className="ir-counter">
          {t("import.handN", { n: handIdx + 1, total: hands.length })}
        </span>
        <span className="ir-nav">
          <button
            className="btn tiny"
            disabled={handIdx === 0}
            onClick={() => {
              setHandIdx((i) => i - 1);
              setStepIdx(0);
            }}
          >
            ◀◀
          </button>
          <button
            className="btn tiny"
            disabled={handIdx === hands.length - 1}
            onClick={() => {
              setHandIdx((i) => i + 1);
              setStepIdx(0);
            }}
          >
            ▶▶
          </button>
          {session ? (
            <button className="btn tiny" onClick={() => setShowDiag(true)} title="Diagnóstico da sessão">
              🏁
            </button>
          ) : null}
        </span>
      </div>

      {/* Mesa: assentos nas posições fixas, board no centro */}
      <div className="table-wrap ir-table">
        {step.seats.map((s) => (
          <div
            key={s.slot}
            className={`seat ir-seat${s.isHero ? " hero" : ""}${s.folded ? " folded" : ""}${s.name === step.action?.player ? " acting" : ""}`}
            style={SEAT_POS[s.slot]}
          >
            <div className="pod">
              {s.isButton ? <span className="ir-dealer">D</span> : null}
              <div className="name">{s.name}</div>
              <div className="arch">{s.position}</div>
              <div className="stack">
                {s.folded ? "fora" : `${toBB(s.stack, hand.bb)}bb`}
              </div>
              {s.isHero && hand.heroCards.length > 0 ? (
                <div className="hole">
                  {hand.heroCards.map((c, j) => (
                    <CardView key={j} card={c} small />
                  ))}
                </div>
              ) : null}
              {s.lastAction ? <div className="badge">{s.lastAction}</div> : null}
            </div>
          </div>
        ))}

        {/* Centro da mesa: pote + board */}
        <div className="ir-center">
          <div className="ir-potchip">🪙 Pote {step.potBB}bb</div>
          <div className="board ir-board">
            {step.board.length === 0 ? (
              <span className="muted">pré-flop</span>
            ) : (
              step.board.map((c, i) => <CardView key={i} card={c} />)
            )}
          </div>
        </div>
      </div>

      {/* Aviso de pote coletado / devolvido */}
      {step.pot && step.actionIdx !== -3 ? (
        <div className="ir-pot">{step.pot}</div>
      ) : null}

      {/* Ação atual */}
      {step.action ? (
        <div className="ir-step">
          <span className="ir-street">{STREET_PT[step.action.street]}</span>
          <span className={`ir-who${step.action.player === hand.heroName ? " ir-hero" : ""}`}>
            {step.action.player === hand.heroName
              ? `${step.action.player} (você)`
              : step.action.player}
          </span>
          <span
            className={`ir-action ${step.action.type === "fold" ? "act-fold" : step.action.type === "call" ? "act-call" : "act-raise"}`}
          >
            {actionText(step.action, hand.bb)}
          </span>
        </div>
      ) : step.actionIdx === -3 ? (
        <div className="ir-result">
          <div className="ir-result-title">{t("import.result")}</div>
          <div className="ir-result-body">
            {(() => {
              const alive = step.seats
                .filter((s) => !s.folded)
                .map((s) => s.name);
              const showdown = alive.length > 1;
              return (
                <>
                  {showdown ? (
                    <div>
                      <b>Showdown:</b> {alive.join(", ")}
                      {boardStr ? <span> · board {boardStr}</span> : null}
                    </div>
                  ) : (
                    <div>
                      <b>{alive[0] ? `${alive[0]} levou o pote` : "pote dividido"}</b>
                    </div>
                  )}
                  {fb ? (
                    <div
                      className={`ir-fb ${fb.rating === "boa" ? "fb-boa" : fb.rating === "imprecisa" ? "fb-imp" : fb.rating === "ruim" ? "fb-ruim" : "fb-ok"}`}
                    >
                      <b>Coach:</b> {fb.text}
                    </div>
                  ) : null}
                  {report?.situation ? (
                    <div className="ir-situ">{report.situation}</div>
                  ) : null}
                  {session ? (
                    <button
                      className="btn primary"
                      style={{ marginTop: 14, width: "100%" }}
                      onClick={() => setShowDiag(true)}
                    >
                      {isLastHand
                        ? "🏁 Ver diagnóstico da sessão"
                        : "🏁 Diagnóstico da sessão (pontos fortes e fracos)"}
                    </button>
                  ) : null}
                </>
              );
            })()}
          </div>
        </div>
      ) : (
        <div className="ir-step ir-mute">
          <span className="ir-street">{STREET_PT[streetOfStep()]}</span>
          <span className="ir-action act-check">pronto pra jogar</span>
        </div>
      )}

      {/* Navegação ação por ação */}
      <div className="ir-nav">
        <button
          className="btn"
          disabled={stepIdx === 0}
          onClick={() => setStepIdx((s) => s - 1)}
        >
          ◀ {t("import.prevAction")}
        </button>
        <span className="ir-counter">
          {atEnd
            ? t("import.end")
            : `${t("import.actionN", { n: stepIdx, total: steps.length - 2 })}`}
        </span>
        <button
          className="btn"
          disabled={atEnd}
          onClick={() => setStepIdx((s) => Math.min(steps.length - 1, s + 1))}
        >
          {t("import.nextAction")} ▶
        </button>
      </div>

      {/* Timeline compacta: todas as ações da mão */}
      <details className="ir-timeline">
        <summary>{t("import.timeline")}</summary>
        <div className="ir-tl-list">
          {hand.actions.map((a, i) => (
            <span
              key={i}
              className={`ir-tl-item${i === stepIdx ? " ir-tl-now" : ""}`}
              onClick={() => setStepIdx(i + 1)}
            >
              <b>{a.player}</b> {actionText(a, hand.bb)}
            </span>
          ))}
        </div>
      </details>
    </div>
  );
}
