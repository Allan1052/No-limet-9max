// Modal com as DICAS COMPLETAS da mão — abre pelo botão no centro da mesa
// depois do river/showdown. Reúne o resumo e cada decisão sua avaliada.
import { summarize, mixText, type FeedbackItem } from "../feedback/analyzer";
import { useT } from "../i18n";
import type { TransKey } from "../i18n/translations";
import { useSettings } from "../app/settings";
import { findBlockers } from "../bots/blockers";
import { classifyBoard } from "../bots/boardTexture";
import type { Card } from "../engine/cards";
import { UserSubscriptionLevel } from "../app/gameController";
import { CoachSpeechButton } from "./CoachSpeechButton";

export function HandTipsModal({
  items,
  onClose,
  heroHand = [],
  board = [],
  userSubscriptionLevel,
}: {
  items: FeedbackItem[];
  onClose: () => void;
  heroHand?: Card[];
  board?: Card[];
  userSubscriptionLevel: UserSubscriptionLevel;
}) {
  const { t } = useT();
  const { mode } = useSettings();
  const tecnico = mode === "tecnico";
  const ratingLabel = (r: string) => t(`rating.${r}` as TransKey);

  // Leitura avançada do board (só no modo técnico): tamanho de aposta por
  // textura + bloqueadores das suas cartas.
  const hasBoard = board.length >= 3;
  const texture = hasBoard ? classifyBoard(board) : null;
  const sizePct = texture ? Math.round((0.33 + 0.4 * texture.wetness) * 100) : 0;
  const texKey = texture
    ? texture.wetness < 0.4
      ? "tips.texDry"
      : texture.wetness < 0.7
        ? "tips.texMed"
        : "tips.texWet"
    : "";
  const blockers = hasBoard ? findBlockers(heroHand, board) : [];

  return (
    <div className="overlay" onClick={onClose}>
      <div className="replay tips-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ss-head">
          <h3>💡 {t("tips.title")}</h3>
          <button className="btn tiny" onClick={onClose}>
            fechar ✕
          </button>
        </div>
        <div className="summary">{summarize(items, userSubscriptionLevel)}</div>

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
        {items.length === 0 ? (
          <div className="legend">{t("tips.empty")}</div>
        ) : (
          items.map((it, i) => (
            <div key={i} className={`fb-item ${it.rating}`}>
              <div className="fb-head">
                <span>
                  {it.street}: {it.heroAction}
                </span>
                <span className="tag">{ratingLabel(it.rating)}</span>
              </div>
              <div className="fb-text" style={{ flex: 1 }}>
                {it.text}
                {tecnico && it.equity !== undefined ? ` (equity ${Math.round(it.equity * 100)}%` : ""}
                {tecnico && it.equity !== undefined && it.potOdds !== undefined
                  ? `, preço ${Math.round(it.potOdds * 100)}%)`
                  : tecnico && it.equity !== undefined
                    ? ")"
                    : ""}
              </div>
              <CoachSpeechButton text={it.text} size="small" />
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
