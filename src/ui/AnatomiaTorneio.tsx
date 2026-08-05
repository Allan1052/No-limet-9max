// ---------------------------------------------------------------------------
// Anatomia do Torneio — a comparação "como o recreativo joga × o jeito ideal".
// Mostra que a maioria das mãos é fold e onde a ficha escorre (o CALL).
// Só apresentação: números ilustrativos, alinhados ao motor pré-flop do app.
// ---------------------------------------------------------------------------
import { useState } from "react";
import { useT } from "../i18n";
import type { TransKey } from "../i18n/translations";
import { loadDecisionStats, tournamentStatsFor, TIERS, type Tier } from "../train/decisionStats";

type Dist = { fold: number; call: number; raise: number };
const REC: Dist = { fold: 62, call: 24, raise: 14 }; // recreativo típico
const IDE: Dist = { fold: 82, call: 7, raise: 11 }; // jogo disciplinado

const RAIOX_MIN = 15; // decisões mínimas pra revelar um perfil confiável

function leakKey(you: Dist): TransKey {
  if (you.call - IDE.call >= 6) return "raiox.leakCall";
  if (IDE.fold - you.fold >= 10) return "raiox.leakFold";
  if (you.raise - IDE.raise >= 8) return "raiox.leakRaise";
  return "raiox.leakOk";
}

function Bar({ d }: { d: Dist }) {
  return (
    <div className="anat-bar">
      <div className="anat-seg raise" style={{ height: `${d.raise}%` }}>
        <span>{d.raise}%</span>
      </div>
      <div className="anat-seg call" style={{ height: `${d.call}%` }}>
        <span>{d.call}%</span>
      </div>
      <div className="anat-seg fold" style={{ height: `${d.fold}%` }}>
        <span>{d.fold}%</span>
      </div>
    </div>
  );
}

export function AnatomiaTorneio() {
  const { t } = useT();
  const [mode, setMode] = useState<"treino" | "torneio">("treino");
  const [tier, setTier] = useState<Tier>("micro");
  const src = mode === "torneio" ? tournamentStatsFor(tier) : loadDecisionStats();
  const you: Dist =
    src.total > 0
      ? {
          fold: Math.round((src.fold / src.total) * 100),
          call: Math.round((src.call / src.total) * 100),
          raise: Math.round((src.raise / src.total) * 100),
        }
      : { fold: 0, call: 0, raise: 0 };
  const leak = leakKey(you);
  return (
    <div className="train-view">
      <div className="panel anat-panel">
        <div className="ultra-badge">📊 {t("anat.badge")}</div>
        <h3>{t("anat.title")}</h3>
        <p className="ultra-sub">{t("anat.subtitle")}</p>

        <div className="anat-chart">
          <div className="anat-col">
            <Bar d={REC} />
            <div className="anat-lab rec">
              {t("anat.rec")}
              <small>{t("anat.recSub")}</small>
            </div>
          </div>
          <div className="anat-vs">×</div>
          <div className="anat-col">
            <Bar d={IDE} />
            <div className="anat-lab ide">
              {t("anat.ide")}
              <small>{t("anat.ideSub")}</small>
            </div>
          </div>
        </div>

        <div className="anat-legend">
          <span>
            <i className="fold" />
            {t("anat.fold")}
          </span>
          <span>
            <i className="call" />
            {t("anat.call")}
          </span>
          <span>
            <i className="raise" />
            {t("anat.raise")}
          </span>
        </div>

        <div className="anat-leak">
          <div className="anat-leak-t">
            {t("anat.leakTitle")}: 24% × 7%
          </div>
          <div className="anat-leak-s">{t("anat.leak")}</div>
        </div>

        <div className="anat-punch">{t("anat.punch")}</div>
        <div className="anat-note">{t("anat.note")}</div>

        {/* Seu Raio-X — o SEU perfil real vs o ideal */}
        <div className="raiox">
          <div className="raiox-head">🩻 {t("raiox.title")}</div>
          <div className="raiox-modes">
            <button
              className={`raiox-mode ${mode === "treino" ? "on" : ""}`}
              onClick={() => setMode("treino")}
            >
              {t("raiox.modeTrain")}
            </button>
            <button
              className={`raiox-mode ${mode === "torneio" ? "on" : ""}`}
              onClick={() => setMode("torneio")}
            >
              {t("raiox.modeTourney")}
            </button>
          </div>
          {mode === "torneio" ? (
            <div className="raiox-tiers">
              {TIERS.map((tt) => (
                <button
                  key={tt}
                  className={`raiox-tier ${tier === tt ? "on" : ""}`}
                  onClick={() => setTier(tt)}
                >
                  {t(`raiox.tier.${tt}` as TransKey)}
                </button>
              ))}
            </div>
          ) : null}
          {src.total >= RAIOX_MIN ? (
            <>
              <div className="anat-chart">
                <div className="anat-col">
                  <Bar d={you} />
                  <div className="anat-lab you">
                    {t("raiox.you")}
                    <small>{t("raiox.decisions", { n: src.total })}</small>
                  </div>
                </div>
                <div className="anat-vs">×</div>
                <div className="anat-col">
                  <Bar d={IDE} />
                  <div className="anat-lab ide">
                    {t("anat.ide")}
                    <small>{t("anat.ideSub")}</small>
                  </div>
                </div>
              </div>
              <div className={`raiox-verdict ${leak === "raiox.leakOk" ? "ok" : "warn"}`}>
                {t(leak)}
              </div>
            </>
          ) : (
            <div className="raiox-empty">
              {mode === "torneio"
                ? t("raiox.needMoreTourney", { n: RAIOX_MIN - src.total })
                : t("raiox.needMore", { n: RAIOX_MIN - src.total })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
