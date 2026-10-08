import { Lock } from "lucide-react";
import { useConquistas, useSequencias } from "../../store/derivados";

export function Conquistas() {
  const conquistas = useConquistas();
  const seq = useSequencias();
  const feitas = conquistas.filter((c) => c.desbloqueada).length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Conquistas</h2>
        <p className="text-sm text-slate-500">
          {feitas} de {conquistas.length} desbloqueadas
        </p>
      </div>

      {seq && (
        <section className="grid grid-cols-3 gap-2 text-center">
          {[
            { emoji: "🔥", rotulo: "Missões", atual: seq.missoes, melhor: seq.melhorMissoes },
            { emoji: "💧", rotulo: "Água", atual: seq.agua, melhor: seq.melhorAgua },
            { emoji: "💪", rotulo: "Proteína", atual: seq.proteina, melhor: seq.melhorProteina },
          ].map((s) => (
            <div key={s.rotulo} className="cartao p-3">
              <p className="text-2xl">{s.emoji}</p>
              <p className="text-2xl font-bold tabular-nums">{s.atual}</p>
              <p className="text-xs text-slate-500">
                {s.atual === 1 ? "dia" : "dias"} de {s.rotulo.toLowerCase()}
              </p>
              <p className="mt-1 text-[10px] text-slate-400">recorde: {s.melhor}</p>
            </div>
          ))}
        </section>
      )}
      <p className="text-xs text-slate-500">
        A sequência conta dias seguidos. Se hoje ainda não bateu, ela não quebra — o dia ainda não acabou.
      </p>

      <ul className="grid grid-cols-2 gap-3">
        {conquistas.map((c) => (
          <li
            key={c.id}
            className={`cartao flex flex-col items-center p-4 text-center ${c.desbloqueada ? "" : "opacity-60 grayscale"}`}
          >
            <span className="mb-1 text-4xl" aria-hidden>
              {c.desbloqueada ? c.emoji : "🔒"}
            </span>
            <p className="text-sm font-semibold">{c.titulo}</p>
            <p className="text-xs text-slate-500">{c.descricao}</p>
            {!c.desbloqueada && c.progresso && (
              <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                <Lock className="h-3 w-3" /> {c.progresso}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
