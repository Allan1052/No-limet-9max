import { formatarDataCurta } from "../lib/dates";
import type { WeightLog } from "../lib/types";

interface Props {
  logs: WeightLog[];
  pesoInicial: number;
}

/** Gráfico de linha em SVG puro (sem dependência extra). */
export function WeightChart({ logs, pesoInicial }: Props) {
  const pontos = [{ peso_kg: pesoInicial, data_registro: "início" }, ...logs.slice(-12)];
  if (pontos.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        Faça seu primeiro check-in para ver o gráfico de evolução.
      </p>
    );
  }

  const L = 320;
  const A = 150;
  const m = { t: 16, r: 12, b: 26, l: 34 };
  const pesos = pontos.map((p) => p.peso_kg);
  const min = Math.floor(Math.min(...pesos) - 1);
  const max = Math.ceil(Math.max(...pesos) + 1);
  const x = (i: number) => m.l + (i * (L - m.l - m.r)) / (pontos.length - 1);
  const y = (v: number) => m.t + ((max - v) * (A - m.t - m.b)) / (max - min || 1);
  const caminho = pontos.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.peso_kg).toFixed(1)}`).join(" ");
  const area = `${caminho} L${x(pontos.length - 1).toFixed(1)},${A - m.b} L${x(0).toFixed(1)},${A - m.b} Z`;
  const meio = Math.round((min + max) / 2);

  return (
    <svg viewBox={`0 0 ${L} ${A}`} className="w-full" role="img" aria-label="Gráfico de evolução do peso">
      <defs>
        <linearGradient id="grad-peso" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[max, meio, min].map((v) => (
        <g key={v}>
          <line x1={m.l} x2={L - m.r} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeDasharray="3 4" />
          <text x={m.l - 6} y={y(v) + 4} textAnchor="end" className="fill-slate-400 text-[10px]">
            {v}
          </text>
        </g>
      ))}
      <path d={area} fill="url(#grad-peso)" />
      <path d={caminho} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pontos.map((p, i) => (
        <g key={`${p.data_registro}-${i}`}>
          <circle cx={x(i)} cy={y(p.peso_kg)} r={i === pontos.length - 1 ? 5 : 3.5} fill="#fff" stroke="#059669" strokeWidth="2" />
          {(i === 0 || i === pontos.length - 1 || pontos.length <= 6) && (
            <text x={x(i)} y={A - 8} textAnchor="middle" className="fill-slate-400 text-[10px]">
              {i === 0 ? "início" : formatarDataCurta(p.data_registro)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
