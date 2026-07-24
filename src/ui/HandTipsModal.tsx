// Modal com as DICAS COMPLETAS da mão — abre pelo botão no centro da mesa
// depois do river/showdown. Reúne o resumo e cada decisão sua avaliada.
import { summarize, mixText, type FeedbackItem } from "../feedback/analyzer";
import { useT } from "../i18n";
import type { TransKey } from "../i18n/translations";
import { useSettings } from "../app/settings";

export function HandTipsModal({
  items,
  onClose,
}: {
  items: FeedbackItem[];
  onClose: () => void;
}) {
  const { t } = useT();
  const { mode } = useSettings();
  const tecnico = mode === "tecnico";
  const ratingLabel = (r: string) => t(`rating.${r}` as TransKey);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="replay tips-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ss-head">
          <h3>💡 {t("tips.title")}</h3>
          <button className="btn tiny" onClick={onClose}>
            fechar ✕
          </button>
        </div>
        <div className="summary">{summarize(items)}</div>
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
              <div className="fb-text">
                {it.text}
                {tecnico && it.equity !== undefined ? ` (equity ${Math.round(it.equity * 100)}%` : ""}
                {tecnico && it.equity !== undefined && it.potOdds !== undefined
                  ? `, preço ${Math.round(it.potOdds * 100)}%)`
                  : tecnico && it.equity !== undefined
                    ? ")"
                    : ""}
              </div>
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
