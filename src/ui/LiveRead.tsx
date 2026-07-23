// Leitura ao vivo do spot do herói: range estimado do vilão, equity da mão
// contra esse range, preço para pagar e a estratégia mista recomendada
// (frequências). É o "raio-x" do profissional — visível ENQUANTO você decide,
// não só no replay depois.
import { mixText, type HeroAdvice } from "../feedback/analyzer";

export function LiveRead({ advice }: { advice: HeroAdvice | null }) {
  if (!advice) return null;
  const eq = advice.equity;
  const req = advice.potOdds;
  const vr = advice.villainRangePct;
  const mix = mixText(advice.mix);
  const priced = eq !== undefined && req !== undefined;
  const ahead = priced ? eq >= req : undefined;

  return (
    <div className="panel live-read">
      <h3>Leitura do spot</h3>

      {advice.kind === "postflop" && eq !== undefined ? (
        <div className="lr-grid">
          {vr !== undefined ? (
            <div className="lr-cell">
              <div className="lr-lbl">Range do vilão</div>
              <div className="lr-val">~{Math.round(vr * 100)}%</div>
            </div>
          ) : null}
          <div className="lr-cell">
            <div className="lr-lbl">Sua equity</div>
            <div className="lr-val">{Math.round(eq * 100)}%</div>
          </div>
          {req !== undefined && req > 0 ? (
            <div className="lr-cell">
              <div className="lr-lbl">Preço p/ pagar</div>
              <div className={`lr-val ${ahead ? "good" : "bad"}`}>{Math.round(req * 100)}%</div>
            </div>
          ) : null}
        </div>
      ) : null}

      {priced && req! > 0 ? (
        <div className={`lr-verdict ${ahead ? "good" : "bad"}`}>
          {ahead
            ? `Equity acima do preço (${Math.round((eq! - req!) * 100)}% de margem): dá para continuar.`
            : `Equity abaixo do preço (${Math.round((req! - eq!) * 100)}% a menos): tende a fold.`}
        </div>
      ) : null}

      {mix ? (
        <div className="lr-mix">
          <span className="lr-lbl">Estratégia recomendada</span>
          <div className="lr-mixbar">
            {(advice.mix ?? [])
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
      ) : (
        <div className="lr-note">{advice.reason}</div>
      )}
    </div>
  );
}
