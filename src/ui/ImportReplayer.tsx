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
import { analyzePostflopStreets } from "../import/analyzePostflop";
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
  key: string; // identificador estável (nome do jogador)
  top: string; // posição na elipse (%), calculada em ordem horária a partir do herói
  left: string;
  name: string;
  stack: number; // fichas restantes no momento do passo
  position: string;
  isHero: boolean;
  isButton: boolean;
  folded: boolean;
  lastAction: string | null;
}

/** Posição na elipse da mesa por índice horário (0 = herói embaixo, centro). */
function seatEllipsePos(i: number, n: number): { top: string; left: string } {
  const ang = Math.PI / 2 + (2 * Math.PI * i) / Math.max(1, n);
  const cx = 50, cy = 49, rx = 41, ry = 39;
  const left = cx + rx * Math.cos(ang);
  const top = cy + ry * Math.sin(ang);
  return { top: `${top.toFixed(1)}%`, left: `${left.toFixed(1)}%` };
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
  // ── ORDEM HORÁRIA a partir do herói (embaixo) — respeita as posições reais.
  // Ação anda no sentido do maior assento (com wrap); o vizinho da esquerda do
  // herói (próximo a agir) fica embaixo à esquerda, e assim por diante. Isso
  // deixa botão/SB/BB nos lugares certos em relação ao herói.
  const seated = [...hand.seats].sort((a, b) => a.seat - b.seat);
  const N = seated.length;
  const heroIdx = seated.findIndex((s) => s.isHero);
  const base = heroIdx >= 0 ? heroIdx : 0;
  const clockwise = Array.from({ length: N }, (_, k) => seated[(base + k) % N]);

  const seatsAt: SeatState[] = clockwise.map((s, i) => {
    const pos = seatEllipsePos(i, N);
    return {
      key: s.name,
      top: pos.top,
      left: pos.left,
      name: s.name,
      stack: s.stack,
      position: POS_SHORT[s.position ?? ""] ?? "",
      isHero: s.isHero,
      isButton: s.isButton,
      folded: false,
      lastAction: null,
    };
  });
  const seatByName = (name: string) => seatsAt.find((s) => s.name === name);

  const bb = hand.bb || 1;
  let potChips = 0;
  let committed: Record<string, number> = {}; // aposta desta rua, por jogador

  // ── ANTES + BLINDS já aplicados no estado inicial (sem virar passos). Assim o
  // replay começa direto na 1ª decisão de verdade — sem "apertar Next" a mão
  // toda pra distribuir antes. As fichas do SB/BB já aparecem colocadas.
  for (const a of hand.actions) {
    if (a.street !== "preflop") break;
    const seat = seatByName(a.player);
    if (a.type === "ante") {
      const d = a.amount || hand.ante;
      if (seat) seat.stack = Math.max(0, seat.stack - d);
      potChips += d;
    } else if (a.type === "sb" || a.type === "bb") {
      const d = a.amount || (a.type === "sb" ? hand.sb : hand.bb);
      if (seat) {
        seat.stack = Math.max(0, seat.stack - d);
        seat.lastAction = a.type === "sb" ? `SB ${fmtBB(d, bb)}` : `BB ${fmtBB(d, bb)}`;
      }
      potChips += d;
      committed[a.player] = (committed[a.player] ?? 0) + d;
    }
  }

  const steps: StepInfo[] = [
    {
      actionIdx: -1,
      action: null,
      board: [],
      seats: seatsAt.map((s) => ({ ...s })),
      pot: null,
      potBB: toBB(potChips, bb),
    },
  ];

  let visibleBoard = 0;
  let lastStreet: Street = "preflop";

  for (let i = 0; i < hand.actions.length; i++) {
    const a = hand.actions[i];
    // Antes/blinds já entraram no estado inicial — não viram passos.
    if (a.type === "ante" || a.type === "sb" || a.type === "bb") continue;

    const targetVisible =
      a.street === "flop" ? 3 : a.street === "turn" ? 4 : a.street === "river" ? 5 : 0;
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
    const seat = seatByName(a.player);
    if (seat) {
      seat.lastAction = actionText(a, bb);
      if (a.type === "fold") {
        seat.folded = true;
        seat.lastAction = "Fold";
      } else if (a.type === "call" || a.type === "bet") {
        const d = a.amount;
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

  const boardStr = useMemo(
    () => hand.board.map((c) => cardToString(c)).join(" "),
    [hand],
  );

  // Dica do coach PÓS-FLOP (flop/turn/river) — calculada sob demanda por mão
  // (equity real vs range), pra a importação inteira não travar. O pré-flop já
  // vem em report.feedback.
  const streetFb = useMemo(() => analyzePostflopStreets(hand, "free"), [hand]);

  // ── DIAGNÓSTICO DA SESSÃO — o raio-x do treinador ao fim da revisão ──
  // IMPORTANTE: este return fica DEPOIS de todos os hooks (senão o React
  // renderiza menos hooks ao abrir o diagnóstico e o app trava).
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
  const fb = report?.feedback;

  const streetOfStep = (): Street => {
    if (step.action) return step.action.street;
    if (stepIdx === 0) return "preflop";
    return steps[stepIdx - 1]?.action?.street ?? "preflop";
  };

  // Dica do coach da RUA ATUAL: pós-flop quando disponível, senão o pré-flop.
  const curStreet = streetOfStep();
  const coachFb =
    curStreet === "flop" || curStreet === "turn" || curStreet === "river"
      ? streetFb[curStreet] ?? fb
      : fb;

  return (
    <div className="import-replayer ir-fullscreen">
      {/* Cabeçalho: marca + mão atual + navegação */}
      <div className="ir-head">
        <button className="btn tiny ir-exit" onClick={onBack}>
          ✕
        </button>
        <span className="ir-brand">
          CALL <i>ou</i> FOLD
          <span className="ir-counter">{t("import.handN", { n: handIdx + 1, total: hands.length })}</span>
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
            key={s.key}
            className={`seat ir-seat${s.isHero ? " hero" : ""}${s.folded ? " folded" : ""}${s.name === step.action?.player ? " acting" : ""}`}
            style={{ top: s.top, left: s.left }}
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

      {/* DICA DO COACH — o que era recomendado NESTA RUA (igual ao jogo ao vivo).
          Muda rua a rua: pré-flop, flop, turn, river. Ajuda quem revisa a ver a
          jogada certa na hora. */}
      {coachFb ? (
        <div
          className={`ir-coach ${
            coachFb.rating === "boa" ? "c-boa" : coachFb.rating === "ok" ? "c-ok" : coachFb.rating === "imprecisa" ? "c-imp" : "c-ruim"
          }`}
        >
          <span className="ir-coach-badge">{coachFb.rating === "boa" || coachFb.rating === "ok" ? "✓" : "✗"}</span>
          <span className="ir-coach-txt">
            <b className="ir-coach-street">{STREET_PT[curStreet]}</b>
            {" · "}Coach recomendava <b>{coachFb.advice.toUpperCase()}</b>
            {coachFb.heroAction ? (
              <>
                {" · "}você fez <b>{coachFb.heroAction.toUpperCase()}</b>
              </>
            ) : null}
          </span>
        </div>
      ) : null}

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
