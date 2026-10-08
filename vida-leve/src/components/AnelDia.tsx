interface Props {
  /** 0 a 1 */
  valor: number;
  tamanho?: number;
  partes: { rotulo: string; valor: number; cor: string }[];
}

/** Anel com o placar do dia + três mini-anéis (água, missões, proteína). */
export function AnelDia({ valor, tamanho = 112, partes }: Props) {
  const pct = Math.round(Math.min(1, Math.max(0, valor)) * 100);
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: tamanho, height: tamanho }}>
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" className="stroke-slate-100" />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            strokeWidth="9"
            strokeLinecap="round"
            stroke="url(#grad-anel)"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct / 100)}
            style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
          />
          <defs>
            <linearGradient id="grad-anel" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#0ea5e9" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center" role="img" aria-label={`Seu dia: ${pct}%`}>
          <span className="text-2xl font-bold tabular-nums">{pct}%</span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">seu dia</span>
        </div>
      </div>
      <ul className="flex-1 space-y-2">
        {partes.map((p) => (
          <li key={p.rotulo}>
            <div className="mb-0.5 flex justify-between text-xs">
              <span className="text-slate-600">{p.rotulo}</span>
              <span className="font-semibold tabular-nums">{Math.round(Math.min(1, p.valor) * 100)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full transition-[width] duration-700 ${p.cor}`} style={{ width: `${Math.min(1, p.valor) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
