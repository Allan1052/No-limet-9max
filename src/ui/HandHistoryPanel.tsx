// ---------------------------------------------------------------------------
// Painel de Histórico de Mãos (Perfil) — revisão do que aconteceu, com FILTRO
// por tipo de erro.
//
// Mostra as decisões registradas nos torneios CONCLUÍDOS (as que valem
// revisão: "Ruins", "Imprecisas" e "Ok"), com filtros por:
//   - categoria da decisão (Rua · o que fez → o que era recomendado)
//   - tipo de erro: Ruins / Imprecisas / Ok
//   - a SUA ação: Fold / Call / Raise / Check
//   - Só Circuito
//
// Cada linha expande para a análise do coach no modo Simples/Técnico (o mesmo
// modal de "Ver Dicas" do torneio).
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import {
  loadHandLog,
  filterHandLog,
  type HandLogFilter,
  type ErrorKind,
} from "../app/handHistoryLog";
import type { UserSubscriptionLevel } from "../app/gameController";
import { HandTipsModal } from "./HandTipsModal";

const FAM_LABEL: Record<string, string> = {
  fold: "Fold",
  check: "Check",
  call: "Call",
  aggro: "Raise",
};

const RATING_LABEL: Record<string, string> = {
  boa: "Boa",
  ok: "Ok",
  imprecisa: "Imprecisa",
  ruim: "Ruim",
};

const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

const dateLabel = (ts: number) => {
  const d = new Date(ts);
  const hoje = new Date();
  const mesmoDia =
    d.getFullYear() === hoje.getFullYear() &&
    d.getMonth() === hoje.getMonth() &&
    d.getDate() === hoje.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return mesmoDia
    ? `Hoje ${hh}:${mm}`
    : `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${hh}:${mm}`;
};

export function HandHistoryPanel() {
  const all = loadHandLog();
  const [kind, setKind] = useState<ErrorKind | "ok" | undefined>(undefined);
  const [fam, setFam] = useState<string | undefined>(undefined);
  const [circuitOnly, setCircuitOnly] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const f: HandLogFilter = { kind: kind as ErrorKind | undefined, fam, circuitOnly };
  const list = useMemo(() => filterHandLog(all, f), [all, kind, fam, circuitOnly]);

  const toggleKind = (k: ErrorKind | "ok") =>
    setKind((cur) => (cur === k ? undefined : k));

  return (
    <div className="hh-panel">
      <div className="hh-title">📜 Histórico de Mãos</div>
      <div className="hh-sub">
        {all.length === 0
          ? "Jogue e conclua um torneio: as decisões que valem revisão aparecem aqui, com filtro por tipo de erro."
          : `${all.length} decisões registradas nos seus torneios concluídos — filtre pelo tipo de erro e clique para ver a análise.`}
      </div>

      {/* Filtros */}
      <div className="hh-filters">
        {(["ruim", "imprecisa", "ok"] as const).map((k) => (
          <button
            key={k}
            className={`hh-chip ${kind === k ? "active" : ""}`}
            onClick={() => toggleKind(k)}
          >
            {k === "ruim" ? "🔴 Ruins" : k === "imprecisa" ? "🟡 Imprecisas" : "🟢 Ok"}
          </button>
        ))}
        <div className="hh-fam-row">
          <span className="hh-fam-lbl">Minha ação:</span>
          {(["fold", "call", "aggro", "check"] as const).map((k2) => (
            <button
              key={k2}
              className={`hh-chip small ${fam === k2 ? "active" : ""}`}
              onClick={() => setFam((cur) => (cur === k2 ? undefined : k2))}
            >
              {FAM_LABEL[k2]}
            </button>
          ))}
        </div>
        <button
          className={`hh-chip small ${circuitOnly ? "active" : ""}`}
          onClick={() => setCircuitOnly((c) => !c)}
        >
          🏁 Só Circuito
        </button>
      </div>

      {/* Lista */}
      <div className="hh-list">
        {list.length === 0 ? (
          <div className="hh-empty">
            {all.length === 0
              ? "Sem histórico ainda. Jogue e finalize um torneio!"
              : "Nenhuma decisão com este filtro — troque os filtros."}
          </div>
        ) : (
          list.slice(0, 80).map((e, i) => {
            const r = e.item.rating;
            const isOpen = openIdx === i;
            return (
              <div key={`${e.timestamp}-${i}`}>
                <button
                  className={`hh-entry ${r}`}
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                >
                  <div className="hh-entry-head">
                    <span className="hh-street">{e.item.street}</span>
                    <span className="hh-what">
                      Você: <b>{e.item.heroAction}</b>
                      {e.item.advice && e.item.advice !== e.item.heroAction
                        ? ` · Padrão: ${e.item.advice}`
                        : ""}
                    </span>
                    <span className={`hh-tag ${r}`}>{RATING_LABEL[r] ?? r}</span>
                  </div>
                  <div className="hh-meta">
                    {dateLabel(e.timestamp)} · Buy-in {usd(e.buyIn)} ·{" "}
                    {e.mode === "circuito"
                      ? `Circuito${e.circuitStage ? ` E${e.circuitStage}` : ""}`
                      : "Treino Livre"}{" "}
                    · {e.entrants} inscritos
                  </div>
                </button>
                {isOpen ? (
                  <div className="hh-tip">
                    <HandTipsModal
                      items={[e.item]}
                      onClose={() => setOpenIdx(null)}
                      userSubscriptionLevel={"free" as UserSubscriptionLevel}
                      /* Nota: o log histórico não guarda a mão nem o stack —
                         o comentário personalizado aparece quando o item trouxer
                         posição/stack no futuro; por enquanto o modal usa a ação. */
                    />
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
