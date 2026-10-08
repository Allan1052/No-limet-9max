import type { ReactNode } from "react";

const ESTILOS = {
  info: "bg-sky-50 text-sky-800 ring-sky-200",
  alerta: "bg-amber-50 text-amber-900 ring-amber-200",
  perigo: "bg-red-50 text-red-900 ring-red-200",
  sucesso: "bg-marca-50 text-marca-800 ring-marca-200",
} as const;

export function Aviso({
  tipo = "info",
  icone,
  children,
  acao,
}: {
  tipo?: keyof typeof ESTILOS;
  icone?: ReactNode;
  children: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <div className={`flex items-start gap-3 rounded-2xl px-4 py-3 text-sm ring-1 ${ESTILOS[tipo]}`}>
      {icone && <span className="mt-0.5 shrink-0">{icone}</span>}
      <div className="flex-1">{children}</div>
      {acao}
    </div>
  );
}
