// ---------------------------------------------------------------------------
// Lista "onde você perde mais ficha" + tendência por posição. Componente de
// APRESENTAÇÃO puro: recebe o relatório já calculado (train/positionTendency) e
// desenha. Usado na revisão do torneio E no "Seu jogo" do Perfil.
// ---------------------------------------------------------------------------
import type { PositionReport, Tendency } from "../train/positionTendency";

function tendencyChip(t: Tendency): { icon: string; label: string; cls: string } | null {
  if (t === "agressivo") return { icon: "🔥", label: "agressivo demais", cls: "aggr" };
  if (t === "passivo") return { icon: "🧊", label: "passivo demais", cls: "pass" };
  if (t === "equilibrado") return { icon: "≈", label: "equilibrado", cls: "bal" };
  return null;
}

export function PositionTendencyList({
  report,
  title = "📍 Onde você perde mais ficha",
  emptyHint,
}: {
  report: PositionReport[];
  title?: string;
  emptyHint?: string;
}) {
  if (report.length === 0) {
    return emptyHint ? <p className="pt-empty">{emptyHint}</p> : null;
  }

  const worst = report[0];
  const worstChip = tendencyChip(worst.tendency);

  return (
    <div className="pt-block">
      <div className="pt-title">{title}</div>

      {/* Destaque da pior posição — a "maior sangria". */}
      <div className="pt-callout">
        <div className="pt-callout-pos">{worst.position}</div>
        <div className="pt-callout-body">
          Sua posição mais fraca: acerta <b>{Math.round(worst.accuracy * 100)}%</b>.
          {worst.tendency && worst.leakLabel ? <> Aqui, {worst.leakLabel}.</> : null}
        </div>
      </div>

      <div className="pt-list">
        {report.map((r) => {
          const chip = tendencyChip(r.tendency);
          return (
            <div key={r.position} className="pt-row">
              <span className="pt-pos">{r.position}</span>
              <div className="pt-bar">
                <div className="pt-bar-fill" style={{ width: `${Math.round(r.accuracy * 100)}%` }} />
              </div>
              <span className="pt-pct">{Math.round(r.accuracy * 100)}%</span>
              {chip ? <span className={`pt-tag ${chip.cls}`}>{chip.icon} {chip.label}</span> : <span className="pt-tag empty" />}
            </div>
          );
        })}
      </div>
      {worstChip ? null : (
        <p className="pt-fine">Jogue mais mãos pra eu apontar a sua tendência por posição.</p>
      )}
    </div>
  );
}
