// ---------------------------------------------------------------------------
// StreakBanner — mostra a sequência diária (🔥) de forma VISÍVEL no app.
//
// Hoje o streak só aparece escondido no Perfil. Essa faixa fica no topo da
// tela de Treino, acima da Mão do Dia, pra o jogador VER o hábito crescendo
// e ficar motivado a não quebrar. Usa a mesma identidade do app (verde-feltro
// + dourado). Sem backend — tudo local via localStorage.
// ---------------------------------------------------------------------------
import { useState, useEffect } from "react";
import { getStreak } from "../train/streak";
import { useT } from "../i18n";

export function StreakBanner() {
  const { t } = useT();
  const [streak, setStreak] = useState(getStreak());

  // Atualiza quando voltar ao app (ex.: depois de resolver a mão do dia)
  useEffect(() => {
    const onFocus = () => setStreak(getStreak());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  if (streak.current <= 0) {
    // Sem streak ainda — incentivo pra começar (primeira vez)
    return (
      <div className="streak-banner empty">
        <span className="streak-icon">🔥</span>
        <span className="streak-text">{t("streak.start")}</span>
      </div>
    );
  }

  // Streak ativa — mostra o número e o recorde
  const isOnFire = streak.current >= 3;
  return (
    <div className={`streak-banner ${isOnFire ? "on-fire" : ""}`}>
      <span className="streak-icon">🔥</span>
      <span className="streak-count">
        <b>{streak.current}</b> {streak.current === 1 ? t("streak.daySingular") : t("streak.days")}
      </span>
      {streak.best > streak.current ? (
        <span className="streak-best">
          (recorde: {streak.best})
        </span>
      ) : streak.current >= 3 ? (
        <span className="streak-best">🏆 recorde!</span>
      ) : null}
    </div>
  );
}
