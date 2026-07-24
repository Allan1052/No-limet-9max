// Aviso de missão concluída: aparece por alguns segundos ao completar uma
// missão (a recompensa que dá aquele gostinho de conquista).
import { useEffect } from "react";
import { useT } from "../i18n";
import type { TransKey } from "../i18n/translations";
import type { Mission } from "../app/missions";

export function MissionToast({
  missions,
  onDismiss,
}: {
  missions: Mission[];
  onDismiss: () => void;
}) {
  const { t } = useT();
  useEffect(() => {
    if (missions.length === 0) return;
    const id = setTimeout(onDismiss, 4500);
    return () => clearTimeout(id);
  }, [missions, onDismiss]);

  if (missions.length === 0) return null;
  return (
    <div className="mission-toasts" onClick={onDismiss}>
      {missions.map((m) => (
        <div key={m.id} className="mission-toast">
          <span className="mt-icon">{m.icon}</span>
          <div>
            <div className="mt-head">🎉 {t("missions.toast")}</div>
            <div className="mt-title">{t(m.titleKey as TransKey)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
