// Modal com as DICAS COMPLETAS da mão — abre pelo botão no centro da mesa
// depois do river/showdown. Reúne o resumo e cada decisão sua avaliada.
import { useState } from "react";
import { summarize, mixText, type FeedbackItem } from "../feedback/analyzer";
import { useT } from "../i18n";
import type { TransKey } from "../i18n/translations";
import { findBlockers } from "../bots/blockers";
import { classifyBoard } from "../bots/boardTexture";
import { useMemo } from "react";
import { runCalibration } from "../ranges/_calibration/gtoBenchmark";
import type { Card } from "../engine/cards";
import { UserSubscriptionLevel } from "../app/gameController";
import { getHandCommentary } from "./handCommentary";

type TipsMode = "free" | "technical";

export function HandTipsModal({
  items,
  itemsFree,
  itemsTechnical,
  onClose,
  heroHand = [],
  board = [],
  userSubscriptionLevel,
  heroPosition,
  heroBB,
  icmPhase,
}: {
  items: FeedbackItem[];
  itemsFree?: FeedbackItem[];
  itemsTechnical?: FeedbackItem[];
  onClose: () => void;
  heroHand?: Card[];
  board?: Card[];
  userSubscriptionLevel: UserSubscriptionLevel;
  /** Posição do herói no spot (ex.: UTG, BTN) — vem do replay/HandHistory */
  heroPosition?: string;
  /** Stack do herói em big blinds no momento da decisão */
  heroBB?: number;
  /** Fase ICM do torneio — "bubble" perto da bolha, "itm" no dinheiro, "early" início/meio */
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

  // Leitura avançada do board (só no modo técnico): tamanho de aposta por
  // textura + bloqueadores das suas cartas.
  const hasBoard = board.length >= 3;
  const texture = tecnico && hasBoard ? classifyBoard(board) : null;
  const sizePct = texture ? Math.round((0.33 + 0.4 * texture.wetness) * 100) : 0;
  const texKey = texture
    ? texture.wetness < 0.4
      ? "tips.texDry"
      : texture.wetness < 0.7
        ? "tips.texMed"
        : "tips.texWet"
    : "";
  const blockers = tecnico && hasBoard ? findBlockers(heroHand, board) : [];

  // Comentário PERSONALIZADO pela mão — voz anônima, estilo solver.
  // Só aparece quando há exatamente 2 cartas de herói e
  // há decisões avaliadas na rua atual.
  // Âncora = último item com rating (a rua mais recente): o coach comenta a
  // decisão atual, não o pré-flop.
  let firstItem = displayItems.find((it) => it.rating) ?? displayItems[0];
  const withRating = displayItems.filter((it) => it.rating);
  if (withRating.length > 1) firstItem = withRating[withRating.length - 1];
  const handCmt =
    heroHand.length === 2 && firstItem
      ? getHandCommentary(
          {
            heroHand,
            heroAction: firstItem.heroAction,
            position: heroPosition ?? (firstItem as any).position,
            heroBB: heroBB ?? (firstItem as any).heroBB,
            heroBetPct: (firstItem as any).betSizePct,
            rating: firstItem.rating,
            preflop: firstItem.street === "Pré-flop",
            icmPhase,
            board,
          },
          tipsMode,
        )
      : null;
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

        {/* Comentário da mão — específico da mão jogada (voz anônima) */}
        {handCmt ? (
          <div className="hand-cmt">
            <div className="hc-head">
              <span className="hc-hand">🃏 {handCmt.handName}</span>
              <span className="hc-pro">{handCmt.proLabel}</span>
            </div>
            <div className="hc-line">{handCmt.lines[0]}</div>
          </div>
        ) : null}
        <div className="summary">{summarize(displayItems, userSubscriptionLevel)}</div>
        {tecnico && texture ? (
          <div className="board-read">
            <div className="br-head">🧠 {t("tips.boardRead")}</div>
            <div className="br-line">
              {t("tips.sizingLine", { tex: t(texKey as TransKey), pct: sizePct })}{" "}
              <span className="br-why">
                {texture.wetness < 0.5 ? t("tips.whyDry") : t("tips.whyWet")}
              </span>
            </div>
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
          displayItems.map((it, i) => (
            <div key={i} className={`fb-item ${it.rating}`}>
              <div className="fb-head">
                <span>
                  {it.street}: {it.heroAction}
                </span>
                <span className="tag">{ratingLabel(it.rating)}</span>
              </div>
              <div className="fb-text">
                {it.text}
                {tecnico && it.equity !== undefined ? ` (equity ${Math.round(it.equity * 100)}%` : ""}
                {tecnico && it.equity !== undefined && it.potOdds !== undefined
                  ? `, preço ${Math.round(it.potOdds * 100)}%)`
                  : tecnico && it.equity !== undefined
                    ? ")"
                    : ""}
              </div>
              {it.betSizeBB && it.betSizeBB > 0 ? (
                <div
                  className="fb-size"
                  style={{
                    display: "inline-block",
                    marginTop: 6,
                    padding: "2px 10px",
                    borderRadius: 9,
                    fontSize: "0.85em",
                    fontWeight: 700,
                    color: "#0b0f0d",
                    background: "linear-gradient(180deg,#ecd07a,#c9a227)",
                  }}
                >
                  💰 aposte ~{Math.round((it.betSizePct ?? 0) * 100)}% do pote · ≈ {it.betSizeBB}bb
                  {(it.betSizePct ?? 0) > 1 ? " (overbet)" : ""}
                </div>
              ) : null}
              {tecnico && mixText(it.mix) ? (
                <div className="fb-mix">
                  {t("panel.strategyLabel")}: {mixText(it.mix)}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Selo de confiança: o motor é medido contra a teoria GTO num banco de
// spots-referência e o placar de concordância aparece como chip verde.
// Númérico sempre dinâmico (lido de runCalibration) — nunca fixo.
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
        whiteSpace: "nowrap",
      }}
    >
      ✓ Motor validado — bate com o GTO em {pct}% de {cal.total} spots-referência
    </div>
  );
}
