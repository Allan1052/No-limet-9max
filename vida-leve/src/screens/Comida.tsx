import { Beef, Flame, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ProgressBar } from "../components/ProgressBar";
import { paraNumero } from "../components/useProfileForm";
import { ALIMENTOS, FONTE_ALIMENTOS } from "../lib/alimentos";
import { progresso } from "../lib/calculations";
import { useAppStore } from "../store/useAppStore";

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export function Comida() {
  const profile = useAppStore((s) => s.profile);
  const comida = useAppStore((s) => s.comida);
  const adicionar = useAppStore((s) => s.adicionarComida);
  const remover = useAppStore((s) => s.removerComida);
  const [recente, setRecente] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [prot, setProt] = useState("");
  const [kcal, setKcal] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  if (!profile) return null;
  const proteina = comida.reduce((s, c) => s + c.proteina_g, 0);
  const calorias = comida.reduce((s, c) => s + c.calorias, 0);
  const faltaProt = Math.max(0, Math.round(profile.meta_proteina_g - proteina));

  const tocar = async (id: string) => {
    const a = ALIMENTOS.find((x) => x.id === id);
    if (!a) return;
    if (await adicionar({ nome: a.nome, proteina_g: a.proteina_g, calorias: a.calorias })) {
      setRecente(id);
      setTimeout(() => setRecente((r) => (r === id ? null : r)), 900);
    }
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const p = paraNumero(prot || "0");
    const k = paraNumero(kcal || "0");
    if (!nome.trim()) return setErro("Dê um nome ao alimento.");
    if (!Number.isFinite(p) || p < 0 || p > 300) return setErro("Proteína entre 0 e 300 g.");
    if (!Number.isFinite(k) || k < 0 || k > 5000) return setErro("Calorias entre 0 e 5000.");
    setErro(null);
    if (await adicionar({ nome: nome.trim().slice(0, 80), proteina_g: Math.round(p * 10) / 10, calorias: Math.round(k) })) {
      setNome("");
      setProt("");
      setKcal("");
    }
  };

  return (
    <div className="space-y-4">
      <header className="mb-2">
        <h1 className="text-2xl font-bold">Comida</h1>
        <p className="text-sm text-slate-500">Some o que comeu hoje. Não precisa ser exato — o hábito vale mais.</p>
      </header>

      <section className="cartao space-y-4">
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-semibold text-rose-700">
              <Beef className="h-4 w-4" /> Proteína
            </span>
            <span className="tabular-nums">
              <b>{fmt(proteina)}</b> / {profile.meta_proteina_g} g
            </span>
          </div>
          <ProgressBar valor={progresso(proteina, profile.meta_proteina_g)} cor="bg-rose-500" rotuloAcessivel="Proteína do dia" />
          <p className="mt-1 text-xs text-slate-500">{faltaProt > 0 ? `Faltam ${faltaProt} g.` : "Meta de proteína batida! 💪"}</p>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-semibold text-orange-800">
              <Flame className="h-4 w-4" /> Calorias
            </span>
            <span className="tabular-nums">
              <b>{calorias}</b> / {profile.calorias_meta} kcal
            </span>
          </div>
          <ProgressBar
            valor={progresso(calorias, profile.calorias_meta)}
            cor={calorias > profile.calorias_meta ? "bg-amber-500" : "bg-orange-500"}
            rotuloAcessivel="Calorias do dia"
          />
          {calorias > profile.calorias_meta && (
            <p className="mt-1 text-xs text-amber-700">Passou um pouco da meta — tudo bem. Um dia não define a semana.</p>
          )}
        </div>
      </section>

      <section className="cartao">
        <h2 className="mb-1 font-semibold">Atalhos</h2>
        <p className="mb-3 text-xs text-slate-500">Um toque soma uma porção.</p>
        <ul className="grid grid-cols-2 gap-2">
          {ALIMENTOS.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => tocar(a.id)}
                className={`flex h-full w-full items-start gap-2 rounded-2xl border px-3 py-2.5 text-left transition active:scale-[0.97] ${
                  recente === a.id ? "border-marca-500 bg-marca-50" : "border-slate-200 bg-superficie"
                }`}
              >
                <span className="text-2xl" aria-hidden>
                  {a.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium leading-tight">{a.nome}</span>
                  <span className="block text-[11px] text-slate-500">{a.porcao}</span>
                  <span className="mt-0.5 block text-[11px] font-semibold text-rose-700">
                    {a.proteina_g} g prot · {a.calorias} kcal
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-slate-400">{FONTE_ALIMENTOS}</p>
      </section>

      <form onSubmit={enviar} className="cartao space-y-3">
        <h2 className="font-semibold">Outro alimento</h2>
        <input className="campo" placeholder="Nome (ex.: marmita do almoço)" value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <input className="campo" inputMode="decimal" placeholder="Proteína (g)" value={prot} onChange={(e) => setProt(e.target.value.replace(/[^\d.,]/g, ""))} />
          <input className="campo" inputMode="numeric" placeholder="Calorias" value={kcal} onChange={(e) => setKcal(e.target.value.replace(/\D/g, ""))} />
        </div>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <button type="submit" className="botao-primario w-full">
          <Plus className="h-5 w-5" /> Adicionar
        </button>
        <p className="text-[11px] text-slate-400">Dica: os valores estão no rótulo, na “informação nutricional”.</p>
      </form>

      {comida.length > 0 && (
        <section className="cartao">
          <h2 className="mb-2 font-semibold">Hoje</h2>
          <ul className="divide-y divide-slate-100">
            {[...comida].reverse().map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.nome}</p>
                  <p className="text-xs text-slate-500">
                    {fmt(c.proteina_g)} g prot · {c.calorias} kcal ·{" "}
                    {new Date(c.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-xl p-2 text-slate-300 hover:bg-red-50 hover:text-red-500"
                  aria-label={`Remover ${c.nome}`}
                  onClick={() => remover(c.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
