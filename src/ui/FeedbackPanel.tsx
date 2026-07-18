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
        <b>Maníaco / LAG</b> — muito agressivo, muito blefe (Kenney, Astedt).
        <br />
        <span className="dot" style={{ background: "#c9b458" }} />
        <b>TAG</b> — sólido e seletivo (Chidwick, Moorman, Dan Smith).
        <br />
        <span className="dot" style={{ background: "#4caf7d" }} />
        <b>Quase-GTO</b> — muito balanceado (Holz).
        <br />
        <span className="dot" style={{ background: "#8a7326" }} />
        <b>Técnico/adaptável</b> — ajusta ao stack (Sikorski, Addamo).
      </div>
    </div>
  );
}
