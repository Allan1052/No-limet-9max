// Tela de Missões: lista de desafios com barra de progresso e selo de concluído.
// É a camada de "sensação de conquista" que segura o recreativo voltando.
import { useT } from "../i18n";
import type { TransKey } from "../i18n/translations";
import type { MissionView } from "../app/missions";

const CAT_LABEL: Record<string, string> = {
  volume: "Volume",
  qualidade: "Qualidade",
  disciplina: "Disciplina",
  torneio: "Torneio",
};

export function MissionsPanel({
  missions,
  done,
  total,
  onReset,
}: {
  missions: MissionView[];
  done: number;
  total: number;
  onReset: () => void;
}) {
  const { t } = useT();
  return (
    <div className="missions-view">
      <div className="panel">
        <div className="pp-head">
          <h3>{t("missions.title")}</h3>
          <button className="btn tiny" onClick={onReset}>
            {t("missions.reset")}
          </button>
        </div>
        <div className="missions-count">{t("missions.done", { done, total })}</div>

        <div className="missions-list">
          {missions.map(({ mission, progress, done: isDone }) => {
            const pct = Math.min(100, Math.round((progress / mission.goal) * 100));
            return (
              <div key={mission.id} className={`mission-card ${isDone ? "done" : ""}`}>
                <div className="mission-icon">{isDone ? "✅" : mission.icon}</div>
                <div className="mission-body">
                  <div className="mission-top">
                    <span className="mission-title">{t(mission.titleKey as TransKey)}</span>
                    <span className="mission-cat">{CAT_LABEL[mission.category]}</span>
                  </div>
                  <div className="mission-desc">{t(mission.descKey as TransKey)}</div>
                  <div className="mission-bar">
                    <div className="mission-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mission-count">
                    {Math.min(progress, mission.goal)} / {mission.goal}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
