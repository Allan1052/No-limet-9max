import { Loader2, Ruler, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { paraNumero } from "../../components/useProfileForm";
import { formatarDataLonga, hojeISO } from "../../lib/dates";
import { classificarRCE, relacaoCinturaAltura } from "../../lib/medidas";
import { useAppStore } from "../../store/useAppStore";

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export function Medidas() {
  const profile = useAppStore((s) => s.profile);
  const medidas = useAppStore((s) => s.medidas);
  const adicionar = useAppStore((s) => s.adicionarMedida);
  const apagar = useAppStore((s) => s.apagarMedida);
  const [cintura, setCintura] = useState("");
  const [quadril, setQuadril] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  if (!profile) return null;
  const primeira = medidas[0];
  const ultima = medidas.at(-1);
  const rce = ultima ? relacaoCinturaAltura(ultima.cintura_cm, profile.altura_cm) : null;
  const classe = rce !== null ? classificarRCE(rce) : null;
  const difCintura = primeira && ultima && medidas.length > 1 ? Math.round((ultima.cintura_cm - primeira.cintura_cm) * 10) / 10 : null;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const c = paraNumero(cintura);
    const q = quadril.trim() ? paraNumero(quadril) : null;
    if (!Number.isFinite(c) || c < 40 || c > 250) return setErro("Cintura entre 40 e 250 cm.");
    if (q !== null && (!Number.isFinite(q) || q < 50 || q > 250)) return setErro("Quadril entre 50 e 250 cm.");
    setErro(null);
    setSalvando(true);
    const ok = await adicionar({ data: hojeISO(), cintura_cm: Math.round(c * 10) / 10, quadril_cm: q === null ? null : Math.round(q * 10) / 10 });
    setSalvando(false);
    if (ok) {
      setCintura("");
      setQuadril("");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Medidas</h2>
        <p className="text-sm text-slate-500">Muita gente perde centímetros antes de a balança mexer. Meça a cada 2–4 semanas.</p>
      </div>

      {ultima && (
        <section className="cartao">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Cintura</p>
              <p className="text-2xl font-bold tabular-nums">{fmt(ultima.cintura_cm)} cm</p>
              {difCintura !== null && difCintura !== 0 && (
                <p className={`text-xs font-semibold ${difCintura < 0 ? "text-marca-600" : "text-amber-600"}`}>
                  {difCintura < 0 ? "−" : "+"}
                  {fmt(Math.abs(difCintura))} cm desde a 1ª medida
                </p>
              )}
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Cintura ÷ altura</p>
              <p className="text-2xl font-bold tabular-nums">{rce?.toFixed(2).replace(".", ",")}</p>
              {classe && <span className={`chip mt-1 ${classe.cor}`}>{classe.rotulo}</span>}
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Alvo usual: cintura menor que metade da altura (relação abaixo de 0,5). É um indicador simples, não um diagnóstico.
          </p>
        </section>
      )}

      <form onSubmit={enviar} className="cartao space-y-3">
        <h3 className="flex items-center gap-2 font-semibold">
          <Ruler className="h-5 w-5 text-marca-600" /> Nova medida
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="cintura" className="rotulo">
              Cintura (cm)
            </label>
            <input id="cintura" className="campo" inputMode="decimal" placeholder="Na altura do umbigo" value={cintura} onChange={(e) => setCintura(e.target.value.replace(/[^\d.,]/g, ""))} />
          </div>
          <div>
            <label htmlFor="quadril" className="rotulo">
              Quadril (opcional)
            </label>
            <input id="quadril" className="campo" inputMode="decimal" placeholder="Parte mais larga" value={quadril} onChange={(e) => setQuadril(e.target.value.replace(/[^\d.,]/g, ""))} />
          </div>
        </div>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <button type="submit" className="botao-primario w-full" disabled={salvando || !cintura}>
          {salvando && <Loader2 className="h-5 w-5 animate-spin" />} Salvar medida
        </button>
        <p className="text-xs text-slate-400">Dica: meça em pé, relaxado, sem apertar a fita, sempre no mesmo horário.</p>
      </form>

      {medidas.length > 0 && (
        <section className="cartao">
          <h3 className="mb-2 font-semibold">Histórico</h3>
          <ul className="divide-y divide-slate-100">
            {[...medidas].reverse().map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-3">
                <div className="flex-1">
                  <p className="font-semibold tabular-nums">
                    {fmt(m.cintura_cm)} cm{m.quadril_cm !== null && <span className="font-normal text-slate-500"> · quadril {fmt(m.quadril_cm)} cm</span>}
                  </p>
                  <p className="text-xs text-slate-400">{formatarDataLonga(m.data)}</p>
                </div>
                <button
                  type="button"
                  className="rounded-xl p-2 text-slate-300 hover:bg-red-50 hover:text-red-500"
                  aria-label={`Apagar medida de ${formatarDataLonga(m.data)}`}
                  onClick={() => {
                    if (confirm("Apagar esta medida?")) void apagar(m.id);
                  }}
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
