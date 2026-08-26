// ---------------------------------------------------------------------------
// Painel "Sua evolução" — versão técnica (redesign 16/08).
//
// Substitui o placar antigo de emojis por métricas que um jogador de poker
// realmente usa: VPIP com zona de referência recreativa (20–30%), taxa de
// precisão geral e semanal, gráfico das últimas 8 semanas e um balanço
// objetivo de forças e fraquezas. Tudo derivado de dados reais registrados
// em src/app/progress.ts — nada é inventado (sem PFR/3bet% falsos).
// ---------------------------------------------------------------------------
import { useT } from "../i18n";
import { isoWeekKey, type ProgressSummary } from "../app/progress";

const EVOLUTION_LEVELS = [
  { level: 1, name: "Passageiro", icon: "🚌", minVpip: 60, desc: "Você entra em tudo — igual ônibus cheio." },
  { level: 2, name: "Condutor", icon: "🎫", minVpip: 45, desc: "Começou a escolher as mãos." },
  { level: 3, name: "Motorista", icon: "🚍", minVpip: 30, desc: "Entende quando subir e quando descer." },
  { level: 4, name: "Piloto", icon: "✈️", minVpip: 20, desc: "Controla o jogo como controla a rota." },
  { level: 5, name: "Águia", icon: "🦅", minVpip: 0, desc: "Você folda o que não presta. Nível profissional." },
];

/** Zona de referência de VPIP para recreativo (faixa saudável). */
const VPIP_LO = 20;
const VPIP_HI = 30;
const MIN_SAMPLE = 20;

/** Últimas 8 semanas (incluindo a atual), da mais antiga para a mais nova. */
function recentWeeks(summary: ProgressSummary, now: Date = new Date()): { key: string; rate: number; decisions: number }[] {
  const cur = new Date(now);
  const weeks: { key: string; rate: number; decisions: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate() - i * 7));
    const key = isoWeekKey(d);
    const wc = summary.weeksCounts?.[key] ?? { total: 0, good: 0 };
    const total = wc.total;
    const rate = total >= 5 ? Math.round((wc.good / total) * 100) : -1;
    weeks.push({ key, rate, decisions: total });
  }
  return weeks;
}

/**
 * Forças e fraquezas derivadas dos dados reais. Cada item usa um limiar
 * mínimo de amostra para não rotular o jogador com poucos dados.
 */
function strengthsWeaknesses(summary: ProgressSummary): { kind: "good" | "bad"; label: string }[] {
  const items: { kind: "good" | "bad"; label: string }[] = [];
  const minDec = 20; // exige no mínimo 20 decisões para diagnosticar

  if (summary.decisions >= minDec) {
    // VPIP: faixa saudável de recreativo = 20–30%.
    if (summary.vpip <= VPIP_HI) {
      items.push({ kind: "good", label: `VPIP ${summary.vpip}% — seleção de mãos na faixa ideal` });
    } else if (summary.vpip >= 45) {
      items.push({ kind: "bad", label: `VPIP ${summary.vpip}% — você entra em mãos demais` });
    }
    if (summary.vpip >= 10 && summary.vpip < VPIP_LO) {
      items.push({ kind: "bad", label: `VPIP ${summary.vpip}% — muito passivo, está pagando demais os blinds` });
    }

    // Precisão semanal.
    if (summary.weekDecisions >= 10) {
      if (summary.goodRateWeek >= 80) {
        items.push({ kind: "good", label: `Precisão de ${summary.goodRateWeek}% nesta semana` });
      } else if (summary.goodRateWeek < 70) {
        items.push({ kind: "bad", label: `Precisão de ${summary.goodRateWeek}% nesta semana — abaixo do ideal` });
      }
    }

    // Disciplina pré-flop: muitos folds corretos é bom.
    if (summary.preflopFoldsThisWeek >= 15) {
      items.push({ kind: "good", label: `${summary.preflopFoldsThisWeek} folds pré-flop certos nesta semana` });
    }

    // Chips perdidos em calls ruins: fraqueza quando relevante.
    if (summary.chipsLostThisWeek >= 200) {
      items.push({
        kind: "bad",
        label: `${summary.chipsLostThisWeek.toLocaleString("en-US")} chips perdidos em calls ruins esta semana`,
      });
    }

    // Agressividade produtiva: c-bets que fazem o vilão desistir.
    if (summary.cbetsThisWeek >= 5 && summary.botsFoldedThisWeek >= 3) {
      items.push({
        kind: "good",
        label: `${summary.botsFoldedThisWeek} pots ganhos com sua agressividade esta semana`,
      });
    }

    // Tendência.
    if (summary.trend >= 3) {
      items.push({ kind: "good", label: `Tendência em alta (+${summary.trend} pts vs. seu histórico)` });
    } else if (summary.trend <= -3) {
      items.push({ kind: "bad", label: `Tendência em queda (${summary.trend} pts vs. seu histórico)` });
    }
  }
  return items;
}

export function ProgressPanel({
  summary,
  onReset,
}: {
  summary: ProgressSummary;
  onReset: () => void;
}) {
  const { t } = useT();
  const has = summary.decisions > 0 || summary.hands > 0;
  const sampleSufficient = summary.decisions >= MIN_SAMPLE;

  const currentLevel = sampleSufficient
    ? EVOLUTION_LEVELS.find((l) => summary.vpip >= l.minVpip) ?? EVOLUTION_LEVELS[0]
    : null;

  const weeks = recentWeeks(summary);
  const fx = has ? strengthsWeaknesses(summary) : [];
  const goodTags = fx.filter((x) => x.kind === "good");
  const badTags = fx.filter((x) => x.kind === "bad");
  const chartMax = Math.max(1, ...weeks.map((w) => (w.rate >= 0 ? w.rate : 0)));

  // Posição do VPIP na barra (0..100%).
  const vpipPct = Math.min(100, Math.max(0, summary.vpip));
  const zoneLoPct = VPIP_LO;
  const zoneHiPct = VPIP_HI;

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
        <div className="legend pp-empty">
          <div className="pp-empty-icon">🃏</div>
          <p>{t("progress.empty")}</p>
          <p className="pp-empty-hint">Cada decisão certa vira ponto e vira gráfico — volta aqui depois de uma sessão.</p>
        </div>
      ) : (
        <>
          {/* ---------- VPIP com zona de referência ---------- */}
          <div className="pp-metric">
            <div className="pp-metric-head">
              <span className="pp-metric-name">VPIP</span>
              <span className="pp-metric-sub">
                {sampleSufficient ? `${t("progress.vpipHint")}: ${VPIP_LO}–${VPIP_HI}%` : t("progress.sampleInsufficient", { c: summary.decisions, min: MIN_SAMPLE })}
              </span>
            </div>
            <div className="pp-vpip-row">
              <div className={`pp-vpip-track${sampleSufficient ? "" : " insufficient"}`}>
                <div
                  className="pp-vpip-zone"
                  style={{ left: `${zoneLoPct}%`, width: `${zoneHiPct - zoneLoPct}%` }}
                />
                <div
                  className="pp-vpip-marker"
                  style={{ left: `${vpipPct}%` }}
                  title={sampleSufficient ? `VPIP ${summary.vpip}%` : `Amostra: ${summary.decisions} decisões`}
                />
              </div>
              <span className={`pp-vpip-val ${sampleSufficient && summary.vpip >= VPIP_LO && summary.vpip <= VPIP_HI ? "in-zone" : ""}`}>
                {sampleSufficient ? `${summary.vpip}%` : "—"}
              </span>
            </div>
            {currentLevel ? (
              <div className="pp-level-line">
                <span className="pp-level-icon">{currentLevel.icon}</span>
                <span className="pp-level-name">{currentLevel.name}</span>
                <span className="pp-level-desc">{currentLevel.desc}</span>
              </div>
            ) : (
                <div className="pp-sample-note">
                {t("progress.sampleHint", { n: Math.max(0, MIN_SAMPLE - summary.decisions) })}
              </div>
            )}
          </div>

          {/* ---------- Precisão (anel) + semana ---------- */}
          <div className="pp-metric">
            <div className="pp-metric-head">
              <span className="pp-metric-name">{t("progress.precision")}</span>
              <span className="pp-metric-sub">boa + ok</span>
            </div>
            <div className="pp-prec-row">
              <div className={`pp-ring${sampleSufficient ? "" : " insufficient"}`} style={{ ["--rate" as string]: sampleSufficient ? summary.goodRateAll : 0 }}>
                <div className="pp-rate">{sampleSufficient ? `${summary.goodRateAll}%` : "—"}</div>
                <div className="pp-rate-lbl">{sampleSufficient ? t("progress.allTime") : t("progress.sampleShort")}</div>
              </div>
              <div className="pp-prec-side">
                <div className="pp-prec-item">
                  <div className="pp-prec-num">{t("progress.thisWeek")}</div>
                  <div className={`pp-prec-val ${summary.goodRateWeek >= 80 ? "good" : summary.goodRateWeek < 70 && summary.weekDecisions >= 10 ? "bad" : ""}`}>
                    {summary.weekDecisions >= 5 ? `${summary.goodRateWeek}%` : "—"}
                  </div>
                </div>
                <div className="pp-prec-item">
                  <div className="pp-prec-num">{t("progress.trend")}</div>
                  <div className={`pp-prec-val ${summary.trend >= 1 ? "good" : summary.trend <= -1 ? "bad" : ""}`}>
                    {summary.weekDecisions >= 5 ? (summary.trend > 0 ? `+${summary.trend}` : summary.trend) : "—"}
                  </div>
                </div>
                <div className="pp-prec-item">
                  <div className="pp-prec-num">{summary.decisions}</div>
                  <div className="pp-prec-val">{t("progress.decisions")}</div>
                </div>
              </div>
            </div>
          </div>

          {/* ---------- Gráfico semanal (8 semanas) ---------- */}
          <div className="pp-metric">
            <div className="pp-metric-head">
              <span className="pp-metric-name">{t("progress.weekChart")}</span>
              <span className="pp-metric-sub">{t("progress.chartNote")}</span>
            </div>
            <div className="pp-chart">
              <div className="pp-sw-list">
                {weeks.map((w) => {
                  const isLast = w === weeks[weeks.length - 1];
                  const h = w.rate >= 0 ? Math.max(6, Math.round((w.rate / chartMax) * 72)) : 4;
                  return (
                    <div key={w.key} className="pp-sw-item" title={`${w.key}: ${w.rate >= 0 ? `${w.rate}%` : t("progress.noData")} (${w.decisions})`}>
                      <div className="pp-sw-lbl">{w.rate >= 0 ? `${w.rate}%` : "·"}</div>
                      <div
                        className={`pp-sw-bar ${isLast ? "cur" : ""}`}
                        style={{ height: `${h}px`, opacity: w.rate < 0 ? 0.35 : 1 }}
                      />
                      <div className="pp-sw-key">{w.key.slice(6)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ---------- Forças e fraquezas ---------- */}
          {fx.length > 0 && (
            <div className="pp-metric">
              <div className="pp-metric-head">
                <span className="pp-metric-name">{t("progress.reading")}</span>
              </div>
              {badTags.length > 0 ? (
                <div className="pp-fx">
                  <div className="pp-fx-title bad">{t("progress.weakness")}</div>
                  <div className="pp-fx-tags">
                    {badTags.map((x) => (
                      <span key={x.label} className="pp-fx-tag bad">
                        {x.label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {goodTags.length > 0 ? (
                <div className="pp-fx">
                  <div className="pp-fx-title good">{t("progress.strength")}</div>
                  <div className="pp-fx-tags">
                    {goodTags.map((x) => (
                      <span key={x.label} className="pp-fx-tag good">
                        {x.label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <div className="pp-stats">
            <span>
              {summary.hands} {t("progress.hands")} · {summary.decisions} {t("progress.decisions")}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
