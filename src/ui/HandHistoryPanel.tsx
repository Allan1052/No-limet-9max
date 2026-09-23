import { useMemo, useState } from "react";
import { loadHandLog, filterHandLog, type HandLogFilter, type ErrorKind } from "../app/handHistoryLog";
import { buildSevenDayReview } from "../app/sevenDayReview";
import type { UserSubscriptionLevel } from "../app/gameController";
import { HandTipsModal } from "./HandTipsModal";

const FAM_LABEL: Record<string, string> = { fold: "Fold", check: "Check", call: "Call", aggro: "Raise" };
const RATING_LABEL: Record<string, string> = { boa: "Boa", ok: "Ok", imprecisa: "Imprecisa", ruim: "Ruim" };
const virtualBuyIn = (n: number) => `${Math.round(n).toLocaleString("pt-BR")} fichas simuladas`;

const dateLabel = (ts: number) => {
  const d = new Date(ts); const hoje = new Date();
  const mesmoDia = d.getFullYear() === hoje.getFullYear() && d.getMonth() === hoje.getMonth() && d.getDate() === hoje.getDate();
  const hh = String(d.getHours()).padStart(2, "0"); const mm = String(d.getMinutes()).padStart(2, "0");
  return mesmoDia ? `Hoje ${hh}:${mm}` : `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${hh}:${mm}`;
};

export function HandHistoryPanel() {
  const all = loadHandLog();
  const [kind, setKind] = useState<ErrorKind | "ok" | undefined>();
  const [fam, setFam] = useState<string | undefined>();
  const [circuitOnly, setCircuitOnly] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const review = useMemo(() => buildSevenDayReview(all), [all]);
  const f: HandLogFilter = { kind: kind as ErrorKind | undefined, fam, circuitOnly };
  const list = useMemo(() => filterHandLog(all, f), [all, kind, fam, circuitOnly]);
  const toggleKind = (k: ErrorKind | "ok") => setKind((cur) => cur === k ? undefined : k);

  return <div className="hh-panel">
    <div className="hh-title">📜 Histórico de Mãos</div>
    <div className="hh-sub">{all.length === 0 ? "Jogue e conclua um torneio: as decisões que valem revisão aparecem aqui." : `${all.length} decisões registradas — filtre e clique para ver a análise.`}</div>

    {review.total > 0 ? <div className="hh-seven" style={{ margin: "12px 0", padding: 12, border: "1px solid rgba(212,175,55,.35)", borderRadius: 12 }}>
      <b>SEU JOGO EM 7 DIAS</b>
      <div style={{ marginTop: 6 }}>{review.total} decisões · {review.attention} pedem atenção{review.accuracyPct !== null ? ` · ${review.accuracyPct}% sólidas` : ""}</div>
      {review.trend ? <div className="muted">{review.trend === "up" ? "↗ Evolução em relação aos 7 dias anteriores" : review.trend === "down" ? "↘ Semana mais difícil que a anterior" : "→ Estável em relação aos 7 dias anteriores"}</div> : null}
      {review.recommendation ? <div style={{ marginTop: 8 }}><b>Treino recomendado:</b> {review.recommendation.mode === "preflop" ? "Pré-flop" : "Pós-flop"} · padrão recorrente {review.recommendation.label} ({review.recommendation.count}x). <span className="muted">Abra Pontos Fracos para treinar esse padrão com os drills já disponíveis.</span></div> : <div className="muted" style={{ marginTop: 8 }}>Ainda sem repetição suficiente para chamar algo de ponto fraco.</div>}
    </div> : null}

    <div className="hh-filters">
      {(["ruim", "imprecisa", "ok"] as const).map((k) => <button key={k} className={`hh-chip ${kind === k ? "active" : ""}`} onClick={() => toggleKind(k)}>{k === "ruim" ? "🔴 Ruins" : k === "imprecisa" ? "🟡 Imprecisas" : "🟢 Ok"}</button>)}
      <div className="hh-fam-row"><span className="hh-fam-lbl">Minha ação:</span>{(["fold", "call", "aggro", "check"] as const).map((k) => <button key={k} className={`hh-chip small ${fam === k ? "active" : ""}`} onClick={() => setFam((cur) => cur === k ? undefined : k)}>{FAM_LABEL[k]}</button>)}</div>
      <button className={`hh-chip small ${circuitOnly ? "active" : ""}`} onClick={() => setCircuitOnly((c) => !c)}>🏁 Só Circuito</button>
    </div>

    <div className="hh-list">{list.length === 0 ? <div className="hh-empty">{all.length === 0 ? "Sem histórico ainda. Jogue e finalize um torneio!" : "Nenhuma decisão com este filtro — troque os filtros."}</div> : list.slice(0, 80).map((e, i) => {
      const r = e.item.rating; const isOpen = openIdx === i;
      return <div key={`${e.timestamp}-${i}`}>
        <button className={`hh-entry ${r}`} onClick={() => setOpenIdx(isOpen ? null : i)}>
          <div className="hh-entry-head"><span className="hh-street">{e.item.street}</span><span className="hh-what">Você: <b>{e.item.heroAction}</b>{e.item.advice && e.item.advice !== e.item.heroAction ? ` · Padrão: ${e.item.advice}` : ""}</span><span className={`hh-tag ${r}`}>{RATING_LABEL[r] ?? r}</span></div>
          <div className="hh-meta">{dateLabel(e.timestamp)} · Faixa didática {virtualBuyIn(e.buyIn)} · {e.mode === "circuito" ? `Circuito${e.circuitStage ? ` E${e.circuitStage}` : ""}` : "Treino Livre"} · {e.entrants} participantes</div>
        </button>
        {isOpen ? <div className="hh-tip"><HandTipsModal items={[e.item]} onClose={() => setOpenIdx(null)} userSubscriptionLevel={"free" as UserSubscriptionLevel} /></div> : null}
      </div>;
    })}</div>
  </div>;
}
