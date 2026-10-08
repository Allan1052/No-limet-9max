import { Monitor, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { usePreferencias, type Tema } from "../../store/usePreferencias";

const TEMAS: { valor: Tema; rotulo: string; Icone: typeof Sun }[] = [
  { valor: "sistema", rotulo: "Automático", Icone: Monitor },
  { valor: "claro", rotulo: "Claro", Icone: Sun },
  { valor: "escuro", rotulo: "Escuro", Icone: Moon },
];

export function Aparencia() {
  const tema = usePreferencias((s) => s.tema);
  const copos = usePreferencias((s) => s.copos);
  const atualizar = usePreferencias((s) => s.atualizar);
  const [textos, setTextos] = useState(copos.map(String));

  const salvarCopos = (lista: string[]) => {
    const validos = [...new Set(lista.map((t) => Math.round(Number(t))).filter((n) => n >= 50 && n <= 2000))].sort((a, b) => a - b);
    if (validos.length) atualizar({ copos: validos.slice(0, 3) });
  };

  return (
    <section className="cartao space-y-5">
      <div>
        <h2 className="mb-3 font-semibold">Aparência</h2>
        <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-2">
          {TEMAS.map(({ valor, rotulo, Icone }) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={tema === valor}
              onClick={() => atualizar({ tema: valor })}
              className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-sm transition ${
                tema === valor ? "border-marca-500 bg-marca-50 font-semibold text-marca-700" : "border-slate-200 text-slate-600"
              }`}
            >
              <Icone className="h-5 w-5" /> {rotulo}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-1 text-sm font-semibold">Botões de água (ml)</h3>
        <p className="mb-2 text-xs text-slate-500">Use os tamanhos do seu copo e da sua garrafa.</p>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <input
              key={i}
              className="campo text-center"
              inputMode="numeric"
              aria-label={`Tamanho ${i + 1} em ml`}
              value={textos[i] ?? ""}
              placeholder="—"
              onChange={(e) => {
                const novo = [...textos];
                novo[i] = e.target.value.replace(/\D/g, "");
                setTextos(novo);
              }}
              onBlur={() => salvarCopos(textos)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
