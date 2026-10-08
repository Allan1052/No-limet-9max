import { Apple, Home, TrendingDown, UserRound, type LucideIcon } from "lucide-react";
import { useAppStore, type Aba } from "../store/useAppStore";

const ITENS: { aba: Aba; rotulo: string; Icone: LucideIcon }[] = [
  { aba: "inicio", rotulo: "Hoje", Icone: Home },
  { aba: "comida", rotulo: "Comida", Icone: Apple },
  { aba: "progresso", rotulo: "Progresso", Icone: TrendingDown },
  { aba: "perfil", rotulo: "Perfil", Icone: UserRound },
];

export function BottomNav() {
  const aba = useAppStore((s) => s.aba);
  const irPara = useAppStore((s) => s.irPara);
  return (
    <nav className="pb-seguro fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-superficie/90 backdrop-blur">
      <ul className="mx-auto flex max-w-md">
        {ITENS.map(({ aba: alvo, rotulo, Icone }) => {
          const ativo = aba === alvo;
          return (
            <li key={alvo} className="flex-1">
              <button
                type="button"
                onClick={() => irPara(alvo)}
                aria-current={ativo ? "page" : undefined}
                className={`flex w-full flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition ${
                  ativo ? "text-marca-600" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Icone className="h-6 w-6" strokeWidth={ativo ? 2.4 : 2} />
                {rotulo}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
