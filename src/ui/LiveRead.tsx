// Leitura ao vivo do spot do herói.
//
// Modo TÉCNICO: range estimado do vilão, equity da mão, preço e a estratégia
// mista (frequências) — o "raio-x" do profissional.
// Modo SIMPLES: linguagem humana ("você está na frente / atrás") + a barra
// visual de estratégia, sem números que assustam o recreativo.
import { mixText, type HeroAdvice } from "../feedback/analyzer";
import { useT } from "../i18n";
import { useSettings } from "../app/settings";

export function LiveRead({ advice }: { advice: HeroAdvice | null }) {
  const { t } = useT();
  const { mode } = useSettings();
  if (!advice) return null;
  const simple = mode === "simples";
  const eq = advice.equity;
  const req = advice.potOdds;
  const vr = advice.villainRangePct;
  const mix = mixText(advice.mix);
  const priced = eq !== undefined && req !== undefined && req > 0;
  const margin = priced ? eq! - req! : 0;
  const ahead = margin > 0;

  const strategyBar =
    advice.mix && advice.mix.length > 0 ? (
      <div className="lr-mix">
        <span className="lr-lbl">{t("panel.strategy")}</span>
        <div className="lr-mixbar">
          {advice.mix
            .filter((m) => m.freq >= 0.05)
            .map((m, i) => (
              <div
                key={i}
                className={`lr-seg seg-${m.action}`}
                style={{ width: `${Math.round(m.freq * 100)}%` }}
                title={`${m.action} ${Math.round(m.freq * 100)}%`}
              >
                {Math.round(m.freq * 100) >= 12 ? `${Math.round(m.freq * 100)}%` : ""}
              </div>
            ))}
        </div>
        <div className="lr-mixlabel">{mix}</div>
      </div>
    ) : null;

  // ---------- Modo SIMPLES ----------
  if (simple) {
    return (
      <div className="panel live-read">
        <h3>{t("panel.liveRead")}</h3>
        {priced ? (
          <div className={`lr-verdict ${ahead ? "good" : Math.abs(margin) < 0.05 ? "" : "bad"}`}>
            {Math.abs(margin) < 0.05
              ? t("read.close")
              : ahead
                ? t("read.ahead")
                : t("read.behind")}
          </div>
        ) : null}
        {strategyBar}
      </div>
    );
  }

  // ---------- Modo TÉCNICO ----------
  return (
    <div className="panel live-read">
      <h3>{t("panel.liveRead")}</h3>

      {advice.kind === "postflop" && eq !== undefined ? (
        <div className="lr-grid">
          {vr !== undefined ? (
            <div className="lr-cell">
              <div className="lr-lbl">{t("panel.villainRange")}</div>
              <div className="lr-val">~{Math.round(vr * 100)}%</div>
            </div>
          ) : null}
          <div className="lr-cell">
            <div className="lr-lbl">{t("panel.yourEquity")}</div>
            <div className="lr-val">{Math.round(eq * 100)}%</div>
          </div>
          {priced ? (
            <div className="lr-cell">
              <div className="lr-lbl">{t("panel.price")}</div>
              <div className={`lr-val ${ahead ? "good" : "bad"}`}>{Math.round(req! * 100)}%</div>
            </div>
          ) : null}
        </div>
      ) : null}

      {priced ? (
        <div className={`lr-verdict ${ahead ? "good" : "bad"}`}>
          {ahead
            ? t("panel.aheadPrice", { m: Math.round(margin * 100) })
            : t("panel.behindPrice", { m: Math.round(-margin * 100) })}
        </div>
      ) : null}

      {strategyBar ?? <div className="lr-note">{advice.reason}</div>}
    </div>
  );
}
