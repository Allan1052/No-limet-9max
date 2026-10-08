import { ArrowDown, ArrowRight, ArrowUp, Loader2, RefreshCw, Scale, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { paraNumero } from "../components/useProfileForm";
import { WeightChart } from "../components/WeightChart";
import { LIMITES } from "../lib/calculations";
import { formatarDataLonga, hojeISO } from "../lib/dates";
import type { PlanoMetas } from "../lib/types";
import { useAppStore } from "../store/useAppStore";

const LINHAS: { chave: keyof PlanoMetas; rotulo: string; sufixo: string }[] = [
  { chave: "tmb", rotulo: "Metabolismo basal", sufixo: "kcal" },
  { chave: "calorias_meta", rotulo: "Calorias/dia", sufixo: "kcal" },
  { chave: "meta_agua_ml", rotulo: "Água/dia", sufixo: "ml" },
  { chave: "meta_proteina_g", rotulo: "Proteína/dia", sufixo: "g" },
  { chave: "imc", rotulo: "IMC", sufixo: "" },
];

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export function CheckIn() {
  const profile = useAppStore((s) => s.profile);
  const pesos = useAppStore((s) => s.pesos);
  const resumo = useAppStore((s) => s.ultimoRecalculo);
  const registrarPeso = useAppStore((s) => s.registrarPeso);
  const apagarPeso = useAppStore((s) => s.apagarPeso);

  const [peso, setPeso] = useState("");
  const [data, setData] = useState(hojeISO());
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  if (!profile) return null;

  const ultimo = pesos.at(-1);
  const diasDesdeUltimo = ultimo
    ? Math.floor((Date.parse(hojeISO()) - Date.parse(ultimo.data_registro)) / 864e5)
    : null;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const v = Math.round(paraNumero(peso) * 10) / 10;
    const { min, max } = LIMITES.peso_kg;
    if (!Number.isFinite(v) || v < min || v > max) {
      setErro(`Informe um peso entre ${min} e ${max} kg.`);
      return;
    }
    if (data > hojeISO()) {
      setErro("A data não pode ser no futuro.");
      return;
    }
    setErro(null);
    setSalvando(true);
    const ok = await registrarPeso(v, data);
    setSalvando(false);
    if (ok) setPeso("");
  };

  return (
    <div className="space-y-4">
      <header className="mb-2">
        <h1 className="text-2xl font-bold">Check-in de peso</h1>
        <p className="text-sm text-slate-500">
          {diasDesdeUltimo === null
            ? "Registre sua primeira pesagem."
            : diasDesdeUltimo >= 7
              ? "Já passou uma semana — hora do check-in!"
              : `Último check-in ${diasDesdeUltimo === 0 ? "hoje" : diasDesdeUltimo === 1 ? "ontem" : `há ${diasDesdeUltimo} dias`}. O ideal é 1× por semana, no mesmo horário.`}
        </p>
      </header>

      <form onSubmit={enviar} className="cartao space-y-4">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div>
            <label htmlFor="peso-atual" className="rotulo">
              Peso de hoje
            </label>
            <div className="relative">
              <input
                id="peso-atual"
                className="campo pr-12 text-2xl font-bold"
                inputMode="decimal"
                placeholder={profile.peso_atual.toString().replace(".", ",")}
                value={peso}
                onChange={(e) => setPeso(e.target.value.replace(/[^\d.,]/g, ""))}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">kg</span>
            </div>
          </div>
          <div>
            <label htmlFor="data" className="rotulo">
              Data
            </label>
            <input id="data" type="date" max={hojeISO()} className="campo h-[60px] px-3" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
        </div>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <button type="submit" className="botao-primario w-full" disabled={salvando || !peso}>
          {salvando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Scale className="h-5 w-5" />}
          Salvar e recalcular plano
        </button>
      </form>

      {resumo && (
        <section className="cartao ring-2 ring-marca-200" aria-live="polite">
          <div className="mb-3 flex items-center gap-2 text-marca-700">
            <RefreshCw className="h-5 w-5" />
            <h2 className="font-semibold">Plano recalculado!</h2>
          </div>
          <p className="mb-3 text-sm text-slate-600">
            {fmt(resumo.pesoAnterior)} kg <ArrowRight className="inline h-3.5 w-3.5" /> <b>{fmt(resumo.pesoNovo)} kg</b>
          </p>
          <table className="w-full text-sm">
            <tbody>
              {LINHAS.map(({ chave, rotulo, sufixo }) => {
                const a = resumo.antes[chave];
                const d = resumo.depois[chave];
                const dif = Math.round((d - a) * 10) / 10;
                return (
                  <tr key={chave} className="border-t border-slate-100">
                    <td className="py-2 text-slate-500">{rotulo}</td>
                    <td className="py-2 text-right tabular-nums text-slate-400">{fmt(a)}</td>
                    <td className="py-2 text-right font-semibold tabular-nums">
                      {fmt(d)} {sufixo}
                    </td>
                    <td className="w-14 py-2 text-right text-xs tabular-nums">
                      {dif === 0 ? (
                        <span className="text-slate-300">=</span>
                      ) : (
                        <span className={dif < 0 ? "text-marca-600" : "text-amber-600"}>
                          {dif < 0 ? <ArrowDown className="inline h-3 w-3" /> : <ArrowUp className="inline h-3 w-3" />}
                          {fmt(Math.abs(dif))}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      <section className="cartao">
        <h2 className="mb-2 font-semibold">Evolução</h2>
        <WeightChart logs={pesos} pesoInicial={profile.peso_inicial} />
      </section>

      {pesos.length > 0 && (
        <section className="cartao">
          <h2 className="mb-2 font-semibold">Histórico</h2>
          <ul className="divide-y divide-slate-100">
            {[...pesos].reverse().map((w, i, arr) => {
              const anterior = arr[i + 1]?.peso_kg ?? profile.peso_inicial;
              const dif = Math.round((w.peso_kg - anterior) * 10) / 10;
              return (
                <li key={w.id} className="flex items-center gap-3 py-3">
                  <div className="flex-1">
                    <p className="font-semibold tabular-nums">{fmt(w.peso_kg)} kg</p>
                    <p className="text-xs text-slate-400">{formatarDataLonga(w.data_registro)}</p>
                  </div>
                  {dif !== 0 && (
                    <span className={`text-sm font-medium tabular-nums ${dif < 0 ? "text-marca-600" : "text-amber-600"}`}>
                      {dif > 0 ? "+" : "−"}
                      {fmt(Math.abs(dif))}
                    </span>
                  )}
                  <button
                    type="button"
                    className="rounded-xl p-2 text-slate-300 hover:bg-red-50 hover:text-red-500"
                    aria-label={`Apagar registro de ${formatarDataLonga(w.data_registro)}`}
                    onClick={() => {
                      if (confirm("Apagar este registro? O plano será recalculado.")) void apagarPeso(w.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
