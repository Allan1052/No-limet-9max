// ---------------------------------------------------------------------------
// HOJE — a porta de entrada do app. Uma decisão (a Mão do dia), não um cardápio.
// O recreativo abre, resolve a mão do dia, vê a streak, e — se quiser — desce
// pra analisar a própria mão. É o coração do hábito "uma mão por vez".
// ---------------------------------------------------------------------------
import { useState, useEffect } from "react";
import { DailyHand } from "./DailyHand";
import { getTrainingDayStatus } from "../train/streak";
import { buildDailyScenario } from "../train/daily";
import { useT } from "../i18n";
import type { AppView } from "./BottomNav";
import "./hojeView.css";

// Abre a MÃO DO DIA direto no TREINO 1×1 (não passa mais pela tela de análise).
// Grava o spec no canal que o UltraTrainer lê ao montar (o mesmo do "Treinar
// esse spot"), com `hand` (Card[]) e a marca `fromDaily` pra o 1×1 entrar em
// "modo mão do dia": mesma mão, o jogador pode ver Fold/Call/Raise/Re-raise e o
// porquê de cada um. Como a mão do dia é determinística pela data, ela só troca
// no dia seguinte. O 1×1 GERAL (aba Treinar) continua separado, sem spec.
function openDailyIn1x1(setView: (v: AppView) => void) {
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
        hand: scenario.hand,
        fromDaily: true,
      }),
    );
  } catch {
    /* se falhar, abre o 1×1 vazio (tela de montar a mão) */
  }
  setView("ultra");
  // Reforço: se o UltraTrainer já estiver montado, o evento faz ele reler o spec.
  window.dispatchEvent(new CustomEvent("cof-open-ultra"));
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

      <button className="btn hoje-shortcut" onClick={() => openDailyIn1x1(setView)}>
        <span>🎯 {t("hoje.analyze")}</span>
        <span aria-hidden="true">›</span>
      </button>
    </div>
  );
}
