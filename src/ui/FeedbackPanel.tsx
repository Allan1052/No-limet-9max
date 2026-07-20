// Painel de feedback pós-mão: nota + explicação de cada decisão sua.
import { summarize, type FeedbackItem } from "../feedback/analyzer";

const RATING_LABEL: Record<string, string> = {
  boa: "Boa",
  ok: "Ok",
  imprecisa: "Imprecisa",
  ruim: "Ruim",
};

export function FeedbackPanel({ items }: { items: FeedbackItem[] }) {
  return (
    <div className="panel">
      <h3>Feedback da mão</h3>
      <div className="summary">{summarize(items)}</div>
      {items.length === 0 ? (
        <div className="legend">Suas decisões aparecem aqui ao final de cada mão.</div>
      ) : (
        items.map((it, i) => (
          <div key={i} className={`fb-item ${it.rating}`}>
            <div className="fb-head">
              <span>
                {it.street}: {it.heroAction}
              </span>
              <span className="tag">{RATING_LABEL[it.rating]}</span>
            </div>
            <div className="fb-text">
              {it.text}
              {it.equity !== undefined ? ` (equity ${Math.round(it.equity * 100)}%` : ""}
              {it.equity !== undefined && it.potOdds !== undefined
                ? `, preço ${Math.round(it.potOdds * 100)}%)`
                : it.equity !== undefined
                  ? ")"
                  : ""}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function ProfilesLegend() {
  return (
    <div className="panel">
      <h3>Estilos na mesa</h3>
      <div className="legend">
        <span className="dot" style={{ background: "#d1544f" }} />
        <b>Soltos</b> — Recreativo, Calling Station, Spewy: entram em muitos potes,
        pagam demais.
        <br />
        <span className="dot" style={{ background: "#c9b458" }} />
        <b>Tight</b> — Nit e ABC Careful: poucas mãos, aposta = força real.
        <br />
        <span className="dot" style={{ background: "#4caf7d" }} />
        <b>Regs</b> — TAG e LAG: sólidos e agressivos com fundamento.
        <br />
        <span className="dot" style={{ background: "#8a7326" }} />
        <b>Shover</b> — ajusta tudo por stack e ICM (fase final).
      </div>
    </div>
  );
}
