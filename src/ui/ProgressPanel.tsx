// Placar de evolução: mostra a taxa de boas decisões, mãos jogadas, VPIP,
// chips perdidos em calls ruins, c-bets, bots foldados e o nível de evolução.
import { useT } from "../i18n";
import type { ProgressSummary } from "../app/progress";

const EVOLUTION_LEVELS = [
  { level: 1, name: "Passageiro", icon: "🚌", minVpip: 60, desc: "Você entra em tudo — igual ônibus cheio." },
  { level: 2, name: "Condutor", icon: "🎫", minVpip: 45, desc: "Começou a escolher as mãos." },
  { level: 3, name: "Motorista", icon: "🚍", minVpip: 30, desc: "Entende quando subir e quando descer." },
  { level: 4, name: "Piloto", icon: "✈️", minVpip: 20, desc: "Controla o jogo como controla a rota." },
  { level: 5, name: "Águia", icon: "🦅", minVpip: 0, desc: "Você folda o que não presta. Nível profissional." },
];

export function ProgressPanel({
  summary,
  onReset,
}: {
  summary: ProgressSummary;
  onReset: () => void;
}) {
  const { t } = useT();
  const has = summary.decisions > 0 || summary.hands > 0;

  const currentLevel = EVOLUTION_LEVELS.find(
    (l) => summary.vpip >= l.minVpip
  ) ?? EVOLUTION_LEVELS[0];

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
          {/* Nível de Evolução */}
          <div className="pp-evolution">
            <div className="pp-level-badge">
              <span className="pp-level-icon">{currentLevel.icon}</span>
              <div>
                <div className="pp-level-name">{currentLevel.name}</div>
                <div className="pp-level-desc">{currentLevel.desc}</div>
              </div>
            </div>
            <div className="pp-level-bar">
              {EVOLUTION_LEVELS.map((l) => (
                <span
                  key={l.level}
                  className={`pp-level-dot ${l.level <= currentLevel.level ? "active" : ""}`}
                  title={l.name}
                >
                  {l.level}
                </span>
              ))}
            </div>
            <div className="pp-level-vpip">
              VPIP: <b>{summary.vpip}%</b>
            </div>
          </div>

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

          {/* Métricas de disciplina */}
          <div className="pp-discipline">
            <div className="pp-disc-item">
              <span className="pp-disc-icon">✂️</span>
              <div>
                <div className="pp-disc-val">{summary.preflopFoldsThisWeek}</div>
                <div className="pp-disc-lbl">Folds pré-flop (semana)</div>
              </div>
            </div>
            <div className="pp-disc-item pp-disc-bad">
              <span className="pp-disc-icon">💸</span>
              <div>
                <div className="pp-disc-val">{summary.chipsLostThisWeek.toLocaleString("en-US")}</div>
                <div className="pp-disc-lbl">Chips perdidos em calls ruins</div>
              </div>
            </div>
            <div className="pp-disc-item">
              <span className="pp-disc-icon">⚔️</span>
              <div>
                <div className="pp-disc-val">{summary.cbetsThisWeek}</div>
                <div className="pp-disc-lbl">C-bets (semana)</div>
              </div>
            </div>
            <div className="pp-disc-item">
              <span className="pp-disc-icon">🤯</span>
              <div>
                <div className="pp-disc-val">{summary.botsFoldedThisWeek}</div>
                <div className="pp-disc-lbl">Bots foldados (semana)</div>
              </div>
            </div>
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

          {summary.chipsLostThisWeek > 0 && (
            <div className="pp-chips-lost">
              {summary.chipsLostThisWeek.toLocaleString("en-US")} chips perdidos esta semana em calls que você não deveria ter pagado.
              {summary.chipsLostAllTime > 0 ? (
                <div className="pp-chips-lost-all">
                  Total acumulado: <b>{summary.chipsLostAllTime.toLocaleString("en-US")}</b> chips
                </div>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}
