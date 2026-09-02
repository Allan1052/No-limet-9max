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
  title = "📍 Seu acerto por posição",
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
  const worstPct = Math.round(worst.accuracy * 100);
  // Se até a posição mais fraca já vai bem (>=90%), não faz sentido chamar de
  // "fraca" — isso confundia o Allan. Falamos de "espaço pra crescer", não de
  // erro, e sempre explicando que a % é de DECISÕES CERTAS.
  const doingWell = worst.accuracy >= 0.9;

  return (
    <div className="pt-block">
      <div className="pt-title">{title}</div>

      {/* Destaque da posição com mais espaço pra evoluir (a de menor acerto). */}
      <div className="pt-callout">
        <div className="pt-callout-pos">{worst.position}</div>
        <div className="pt-callout-body">
          {doingWell ? (
            <>
              Você vai bem em todas as posições 👏 A que ainda tem mais espaço pra
              crescer é a <b>{worst.position}</b> — <b>{worstPct}%</b> das decisões
              certas.
            </>
          ) : (
            <>
              Posição com mais espaço pra melhorar: você acerta <b>{worstPct}%</b>{" "}
              das decisões aqui.
            </>
          )}
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
