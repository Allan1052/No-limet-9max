// Modal com as DICAS COMPLETAS da mão — abre pelo botão no centro da mesa
// depois do river/showdown. Reúne o resumo e cada decisão sua avaliada.
import { useState, type ReactNode } from "react";
import { summarize, mixText, type FeedbackItem } from "../feedback/analyzer";
import { useT } from "../i18n";
import type { TransKey } from "../i18n/translations";
import { findBlockers } from "../bots/blockers";
import { useMemo } from "react";
import { runCalibration } from "../ranges/_calibration/gtoBenchmark";
import type { Card } from "../engine/cards";
import { UserSubscriptionLevel } from "../app/gameController";
import { buildCoachV2PostHandDecision } from "./coachV2PostHand";

type TipsMode = "free" | "technical";

export function HandTipsModal({
  items,
  itemsFree,
  itemsTechnical,
  onClose,
  heroHand = [],
  board = [],
  userSubscriptionLevel,
  heroPosition: _heroPosition,
  heroBB: _heroBB,
  icmPhase: _icmPhase,
  actions,
}: {
  items: FeedbackItem[];
  itemsFree?: FeedbackItem[];
  itemsTechnical?: FeedbackItem[];
  onClose: () => void;
  /** Ações de fim de mão (Nova mão, Rever, Compartilhar, Evolução…) — as mesmas
   *  que ficam embaixo da mesa, agora também dentro do modal. */
  actions?: ReactNode;
  heroHand?: Card[];
  board?: Card[];
  userSubscriptionLevel: UserSubscriptionLevel;
  /** Posição do herói no spot (ex.: UTG, BTN) — mantida por compatibilidade da API. */
  heroPosition?: string;
  /** Stack do herói em big blinds — mantido por compatibilidade da API. */
  heroBB?: number;
  /** Fase ICM do torneio — mantida por compatibilidade da API. */
  icmPhase?: "early" | "bubble" | "itm";
}) {
  const { t } = useT();
  const ratingLabel = (r: string) => t(`rating.${r}` as TransKey);
  const [tipsMode, setTipsMode] = useState<TipsMode>("free");

  const displayItems =
    tipsMode === "free" && itemsFree && itemsFree.length > 0
      ? itemsFree
      : tipsMode === "technical" && itemsTechnical && itemsTechnical.length > 0
        ? itemsTechnical
        : items;
  const tecnico = tipsMode === "technical";
  // O RESUMO do topo segue a ABA escolhida (Simples/Técnico), não o nível global
  // do app — antes ele ficava igual nas duas abas (o Allan percebeu que "técnico
  // = simples"). Ultra continua ultra; a aba só alterna entre simples e técnico.
  const summaryLevel: UserSubscriptionLevel =
    userSubscriptionLevel === "ultra" ? "ultra" : tecnico ? "technical" : "free";

  // Leitura complementar do board (só no modo técnico). Aqui ficam apenas
  // bloqueadores realmente observáveis; sizing vem exclusivamente do feedback
  // calculado pelo Motor V2 em cada decisão.
  const hasBoard = board.length >= 3;
  const blockers = tecnico && hasBoard ? findBlockers(heroHand, board) : [];

  return (
    <div className="overlay" onClick={onClose}>
      <div className="replay tips-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ss-head">
          <h3>💡 {t("tips.title")}</h3>
          <button className="btn tiny" onClick={onClose}>
            fechar ✕
          </button>
        </div>
        <GtoSealChip />

        {/* Abas Simples / Técnico */}
        <div className="tips-mode-tabs">
          <button
            className={`tips-tab ${tipsMode === "free" ? "active" : ""}`}
            onClick={() => setTipsMode("free")}
          >
            💬 Simples
          </button>
          <button
            className={`tips-tab ${tipsMode === "technical" ? "active" : ""}`}
            onClick={() => setTipsMode("technical")}
          >
            🔢 Técnico
          </button>
        </div>

        <div className="summary">{summarize(displayItems, summaryLevel)}</div>
        {tecnico && hasBoard ? (
          <div className="board-read">
            <div className="br-head">🧠 {t("tips.boardRead")}</div>
            {blockers.length > 0 ? (
              <ul className="br-blockers">
                {blockers.map((b, i) => (
                  <li key={i}>{t(`blocker.${b.kind}` as TransKey, { c: b.label })}</li>
                ))}
              </ul>
            ) : (
              <div className="br-none">{t("tips.noBlockers")}</div>
            )}
          </div>
        ) : null}
        {displayItems.length === 0 ? (
          <div className="legend">{t("tips.empty")}</div>
        ) : (
          displayItems.map((it, i) => {
            const view = buildCoachV2PostHandDecision(it, tecnico ? "technical" : "simple");
            return (
              <div key={i} className={`fb-item ${it.rating}`}>
                <div className="fb-head">
                  <span>{it.street}</span>
                  <span className="tag">{ratingLabel(it.rating)}</span>
                </div>
                <div className="fb-text">
                  {/* Ordem pedagógica: 1) decisão  2) motivo  3) matemática */}
                  <div className="fb-decision">{view.decisionLine}</div>
                  <div>{view.reason}</div>
                </div>
                {view.metrics.length > 0 ? (
                  <div className="fb-mix">{view.metrics.join(" · ")}</div>
                ) : null}
                {tecnico && mixText(it.mix) ? (
                  <div className="fb-mix">
                    {t("panel.strategyLabel")}: {mixText(it.mix)}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
        {actions ? (
          <div className="tips-actions controls action-row">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Selo de confiança: teste INTERNO de qualidade. Comparamos as decisões de
// range com a teoria num banco nosso de spots de referência. Número sempre
// dinâmico (runCalibration). Honestidade: é controle de qualidade nosso, NÃO
// certificação externa de GTO nem promessa de solver.
// ---------------------------------------------------------------------------
export function GtoSealChip() {
  const cal = useMemo(() => runCalibration(), []);
  const pct = Math.round(cal.score * 100);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        margin: "-4px 12px 6px",
        fontSize: 11,
        color: "#7ec58a",
        border: "1px solid #3c5f44",
        background: "rgba(80,160,95,0.08)",
        borderRadius: 20,
        padding: "3px 12px",
        textAlign: "center",
      }}
    >
      ✓ Bate com a teoria em {pct}% de {cal.total} spots · teste interno
    </div>
  );
}
