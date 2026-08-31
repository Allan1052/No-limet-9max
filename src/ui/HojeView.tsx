// ---------------------------------------------------------------------------
// HOJE — a porta de entrada do app. Uma decisão (a Mão do dia), não um cardápio.
// O recreativo abre, resolve a mão do dia, vê a streak, e — se quiser — desce
// pra analisar a própria mão. É o coração do hábito "uma mão por vez".
// ---------------------------------------------------------------------------
import { useState, useEffect } from "react";
import { DailyHand } from "./DailyHand";
import { getTrainingDayStatus } from "../train/streak";
import { buildDailyScenario } from "../train/daily";
import { cardsToString } from "../engine/cards";
import { useT } from "../i18n";
import type { AppView } from "./BottomNav";
import "./hojeView.css";

// Manda a MÃO DO DIA pré-carregada pro HandLab ("Sua Mão"). Grava o spot num
// slot que o HandLab lê ao montar (o mesmo canal do "Treinar esse spot"). Como
// a mão do dia é determinística pela data, ela só troca no dia seguinte.
function openDailyInHandLab(setView: (v: AppView) => void) {
  try {
    const { scenario } = buildDailyScenario();
    const sp = scenario.spec;
    localStorage.setItem(
      "cof-sua-mao-spec",
      JSON.stringify({
        heroPosition: sp.heroPosition,
        villainPosition: sp.raiserPosition ?? "BB",
        situation: sp.raiserPosition ? "vsopen" : "open",
        stage: "inicio",
        stackBB: sp.effectiveBB,
        cards: cardsToString(scenario.hand),
        fromDaily: true,
      }),
    );
  } catch {
    /* se falhar, abre o HandLab normal */
  }
  setView("suamao");
}

export function HojeView({ setView }: { setView: (v: AppView) => void }) {
  const { t } = useT();
  // Lê a streak no mount (localStorage). Re-lê quando a aba volta ao foco, pra
  // refletir a mão do dia recém-resolvida sem precisar recarregar o app.
  const [streak, setStreak] = useState(() => getTrainingDayStatus());
  useEffect(() => {
    const refresh = () => setStreak(getTrainingDayStatus());
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  const hasStreak = streak.current > 0;

  return (
    <div className="hoje-view">
      <div className="hoje-head">
        <div className="hoje-greeting">
          <div className="hoje-title">{t("hoje.greeting")}</div>
          <div className="hoje-sub">{t("hoje.sub")}</div>
        </div>
        <div className={`hoje-streak${hasStreak ? " on" : ""}`} title={t("hoje.bestLabel", { n: streak.best })}>
          <span className="hoje-streak-fire">🔥</span>
          <span className="hoje-streak-n">{streak.current}</span>
        </div>
      </div>

      <DailyHand />

      <button className="btn hoje-shortcut" onClick={() => openDailyInHandLab(setView)}>
        <span>✍️ {t("hoje.analyze")}</span>
        <span aria-hidden="true">›</span>
      </button>
    </div>
  );
}
