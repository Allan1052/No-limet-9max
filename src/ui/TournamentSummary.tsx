// Análise de fim de torneio: mostra como o herói jogou (resultado, estilo,
// qualidade das decisões e os erros a rever). Aparece quando o torneio termina.
import type { TournamentSummary as Summary } from "../app/gameController";

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
  return (
    <div className="overlay" onClick={onClose}>
      <div className="replay summary-modal" onClick={(e) => e.stopPropagation()}>
        <div className={`summary-banner ${champ ? "champ" : "out"}`}>
          {champ ? "🏆 Você venceu o torneio!" : "Fim de linha — você foi eliminado"}
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
          <span className="pill boa">Boas {summary.ratings.boa}</span>
          <span className="pill ok">Ok {summary.ratings.ok}</span>
          <span className="pill imprecisa">Imprecisas {summary.ratings.imprecisa}</span>
          <span className="pill ruim">Ruins {summary.ratings.ruim}</span>
        </div>

        {summary.mistakes.length > 0 ? (
          <>
            <h4>Mãos para rever ({summary.mistakes.length})</h4>
            {summary.mistakes.map((it, i) => (
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
            Sem erros claros de EV para revisar — jogo consistente. 👏
          </div>
        )}

        <button className="btn primary" onClick={onClose}>
          Fechar e configurar novo torneio
        </button>
      </div>
    </div>
  );
}
