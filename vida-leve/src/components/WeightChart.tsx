import { tendencia } from "../lib/adaptive";
import { formatarDataCurta } from "../lib/dates";
import type { WeightLog } from "../lib/types";

interface Props {
  logs: WeightLog[];
  pesoInicial: number;
}

/**
 * Gráfico em SVG puro: pontos = pesagens; linha grossa = TENDÊNCIA (média móvel).
 * A tendência é o que importa — o peso do dia oscila 1–2 kg por água e sal.
 */
export function WeightChart({ logs, pesoInicial }: Props) {
  const pontos = [{ peso_kg: pesoInicial, data_registro: "início" }, ...logs.slice(-16)];
  if (pontos.length < 2) {
    return <p className="py-8 text-center text-sm text-slate-500">Faça seu primeiro check-in para ver o gráfico de evolução.</p>;
  }

  const L = 320;
  const A = 160;
  const m = { t: 16, r: 12, b: 26, l: 34 };
  const pesos = pontos.map((p) => p.peso_kg);
  const linha = tendencia(pesos);
  const todos = [...pesos, ...linha];
  const min = Math.floor(Math.min(...todos) - 1);
  const max = Math.ceil(Math.max(...todos) + 1);
  const x = (i: number) => m.l + (i * (L - m.l - m.r)) / (pontos.length - 1);
  const y = (v: number) => m.t + ((max - v) * (A - m.t - m.b)) / (max - min || 1);
  const caminho = (vals: number[]) => vals.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${caminho(linha)} L${x(pontos.length - 1).toFixed(1)},${A - m.b} L${x(0).toFixed(1)},${A - m.b} Z`;
  const meio = Math.round((min + max) / 2);

  return (
    <div>
      <svg viewBox={`0 0 ${L} ${A}`} className="w-full" role="img" aria-label="Gráfico de evolução do peso com linha de tendência">
        <defs>
          <linearGradient id="grad-peso" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[max, meio, min].map((v) => (
          <g key={v}>
            <line x1={m.l} x2={L - m.r} y1={y(v)} y2={y(v)} className="stroke-slate-200" strokeDasharray="3 4" />
            <text x={m.l - 6} y={y(v) + 4} textAnchor="end" className="fill-slate-400 text-[10px]">
              {v}
            </text>
          </g>
        ))}
        <path d={area} fill="url(#grad-peso)" />
        <path d={caminho(pesos)} fill="none" className="stroke-slate-300" strokeWidth="1.5" strokeDasharray="2 3" />
        <path d={caminho(linha)} fill="none" stroke="#059669" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {pontos.map((p, i) => (
          <g key={`${p.data_registro}-${i}`}>
            <circle cx={x(i)} cy={y(p.peso_kg)} r={i === pontos.length - 1 ? 4.5 : 3} className="fill-superficie stroke-slate-400" strokeWidth="1.5" />
            {(i === 0 || i === pontos.length - 1 || pontos.length <= 6) && (
              <text x={x(i)} y={A - 8} textAnchor="middle" className="fill-slate-400 text-[10px]">
                {i === 0 ? "início" : formatarDataCurta(p.data_registro)}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className="mt-1 flex items-center justify-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 rounded bg-marca-600" /> tendência
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full ring-1 ring-slate-400" /> pesagens
        </span>
      </div>
    </div>
  );
}
