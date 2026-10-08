interface Props {
  /** 0 a 1 */
  valor: number;
  cor?: string;
  rotuloAcessivel: string;
}

export function ProgressBar({ valor, cor = "bg-marca-500", rotuloAcessivel }: Props) {
  const pct = Math.round(Math.min(1, Math.max(0, valor)) * 100);
  return (
    <div
      className="h-3 w-full overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-label={rotuloAcessivel}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full rounded-full transition-[width] duration-500 ease-out ${cor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
