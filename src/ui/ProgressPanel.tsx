// Placar de evolução: mostra a taxa de boas decisões, mãos jogadas e a
// tendência da semana. É a "sensação de progresso" que traz o jogador de volta.
import { useT } from "../i18n";
import type { ProgressSummary } from "../app/progress";

export function ProgressPanel({
  summary,
  onReset,
}: {
  summary: ProgressSummary;
  onReset: () => void;
}) {
  const { t } = useT();
  const has = summary.decisions > 0 || summary.hands > 0;

  return (
    <div className="panel progress-panel">
      <div className="pp-head">
        <h3>{t("progress.title")}</h3>
        {has ? (
          <button className="btn tiny" onClick={onReset}>
            {t("progress.reset")}
          </button>
        ) : null}
      </div>

      {!has ? (
        <div className="legend">{t("progress.empty")}</div>
      ) : (
        <>
          <div
            className="pp-ring"
            style={{ ["--rate" as string]: summary.goodRateAll }}
          >
            <div className="pp-rate">{summary.goodRateAll}%</div>
            <div className="pp-rate-lbl">{t("progress.goodRate")}</div>
          </div>

          <div className="pp-stats">
            <span>
              {summary.hands} {t("progress.hands")}
            </span>
            <span>
              {summary.decisions} {t("progress.decisions")}
            </span>
          </div>

          {summary.weekDecisions >= 5 ? (
            <div className="pp-week">
              <span>
                {t("progress.thisWeek")}: <b>{summary.goodRateWeek}%</b> ·{" "}
                {t("progress.allTime")}: {summary.goodRateAll}%
              </span>
              {summary.trend > 1 ? (
                <div className="pp-trend up">{t("progress.trendUp")}</div>
              ) : summary.trend < -1 ? (
                <div className="pp-trend down">{t("progress.trendDown")}</div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
