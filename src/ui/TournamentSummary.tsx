// Análise de fim de torneio: mostra como o herói jogou (resultado, estilo,
// qualidade das decisões e os erros a rever). Aparece quando o torneio termina.
import { useState } from "react";
import type { TournamentSummary as Summary } from "../app/gameController";
import type { Rating } from "../feedback/analyzer";

const RATING_LABEL: Record<string, string> = {
  boa: "Boa",
  ok: "Ok",
  imprecisa: "Imprecisa",
  ruim: "Ruim",
};

export function TournamentSummary({
  summary,
  onClose,
}: {
  summary: Summary;
  onClose: () => void;
}) {
  const champ = summary.result === "campeao";
  const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
  const num = (n: number) => Math.round(n).toLocaleString("en-US");

  // Filtro: clicar em Ok/Imprecisas/Ruins mostra as decisões daquela categoria.
  // Sem filtro (null), mostra as "mãos para rever" (imprecisa + ruim).
  const [filter, setFilter] = useState<Rating | null>(null);
  const shown = filter ? summary.review.filter((r) => r.rating === filter) : summary.mistakes;
  const toggle = (r: Rating) => setFilter((cur) => (cur === r ? null : r));

  return (
    <div className="overlay" onClick={onClose}>
      <div className="replay summary-modal" onClick={(e) => e.stopPropagation()}>
        <div className={`summary-banner ${champ ? "champ" : "out"}`}>
          {champ
            ? "🏆 Você venceu o torneio!"
            : `Você terminou em ${summary.finishPlace}º de ${num(summary.entrants)}`}
        </div>

        <div className="summary-finish">
          {summary.inMoney ? (
            <span className="itm">Prêmio: {usd(summary.cash)} 💰</span>
          ) : (
            <span className="oom">Fora do dinheiro desta vez — bola pra frente!</span>
          )}
        </div>

        <h3>Análise da sua jogada</h3>

        <div className="summary-stats">
          <div className="ss-item">
            <div className="ss-num">{summary.handsPlayed}</div>
            <div className="ss-lbl">mãos jogadas</div>
          </div>
          <div className="ss-item">
            <div className="ss-num">{summary.vpip}%</div>
            <div className="ss-lbl">VPIP</div>
          </div>
          <div className="ss-item">
            <div className="ss-num">{summary.pfr}%</div>
            <div className="ss-lbl">PFR</div>
          </div>
          <div className="ss-item">
            <div className="ss-num">{summary.threeBet}%</div>
            <div className="ss-lbl">3-bet</div>
          </div>
        </div>

        <div className="summary-note">
          <b>Estilo:</b> {summary.styleNote}
        </div>
        <div className="summary-note">
          <b>Decisões:</b> {summary.qualityNote}
        </div>

        <div className="summary-ratings">
          <span className="pill boa" title="As boas não são detalhadas">
            Boas {summary.ratings.boa}
          </span>
          <button
            className={`pill ok clickable ${filter === "ok" ? "active" : ""}`}
            onClick={() => toggle("ok")}
          >
            Ok {summary.ratings.ok}
          </button>
          <button
            className={`pill imprecisa clickable ${filter === "imprecisa" ? "active" : ""}`}
            onClick={() => toggle("imprecisa")}
          >
            Imprecisas {summary.ratings.imprecisa}
          </button>
          <button
            className={`pill ruim clickable ${filter === "ruim" ? "active" : ""}`}
            onClick={() => toggle("ruim")}
          >
            Ruins {summary.ratings.ruim}
          </button>
        </div>
        <div className="summary-hint">👆 toque em Ok, Imprecisas ou Ruins para ver as decisões</div>

        {shown.length > 0 ? (
          <>
            <h4>
              {filter
                ? `Decisões "${RATING_LABEL[filter]}" (${shown.length})`
                : `Mãos para rever (${shown.length})`}
            </h4>
            {shown.map((it, i) => (
              <div key={i} className={`fb-item ${it.rating}`}>
                <div className="fb-head">
                  <span>
                    {it.street}: {it.heroAction} (padrão: {it.advice})
                  </span>
                  <span className="tag">{RATING_LABEL[it.rating]}</span>
                </div>
                <div className="fb-text">{it.text}</div>
              </div>
            ))}
          </>
        ) : (
          <div className="summary-note">
            {filter
              ? `Nenhuma decisão "${RATING_LABEL[filter]}" neste torneio. 👍`
              : "Sem erros claros de EV para revisar — jogo consistente. 👏"}
          </div>
        )}

        <button className="btn primary" onClick={onClose}>
          Fechar e configurar novo torneio
        </button>
      </div>
    </div>
  );
}
