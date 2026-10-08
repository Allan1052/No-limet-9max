import { Copy, Loader2, UserPlus, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { repository } from "../../data";
import { useAppStore } from "../../store/useAppStore";
import { usePreferencias } from "../../store/usePreferencias";

export function Dupla() {
  const parceiros = useAppStore((s) => s.parceiros);
  const carregar = useAppStore((s) => s.carregarParceiros);
  const conectar = useAppStore((s) => s.conectarParceiro);
  const remover = useAppStore((s) => s.removerParceiro);
  const compartilharKg = usePreferencias((s) => s.compartilharKg);
  const atualizar = usePreferencias((s) => s.atualizar);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [digitado, setDigitado] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!repository.suportaParceiros) return;
    void carregar();
    repository.meuCodigoConvite().then(setCodigo).catch(() => setCodigo(null));
  }, [carregar]);

  return (
    <section className="cartao space-y-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <Users className="h-5 w-5 text-marca-600" /> Modo dupla
      </h2>
      <p className="text-sm text-slate-600">Acompanhe um amigo ou parceiro(a): vocês veem o placar do dia e as sequências um do outro.</p>

      {!repository.suportaParceiros ? (
        <p className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Disponível quando o app estiver ligado à nuvem (conta com login). No modo local, os dados ficam só neste aparelho.
        </p>
      ) : (
        <>
          <div className="rounded-2xl bg-slate-50 p-4 text-center">
            <p className="text-xs text-slate-500">Seu código</p>
            <p className="font-mono text-3xl font-bold tracking-[0.3em]">{codigo ?? "······"}</p>
            {codigo && (
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-marca-700"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(codigo);
                    setCopiado(true);
                    setTimeout(() => setCopiado(false), 1500);
                  } catch {
                    /* sem área de transferência */
                  }
                }}
              >
                <Copy className="h-4 w-4" /> {copiado ? "Copiado!" : "Copiar"}
              </button>
            )}
          </div>
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (digitado.trim().length < 6) return;
              setEnviando(true);
              if (await conectar(digitado.trim())) setDigitado("");
              setEnviando(false);
            }}
          >
            <input
              className="campo font-mono uppercase tracking-widest"
              placeholder="Código do parceiro"
              maxLength={6}
              value={digitado}
              onChange={(e) => setDigitado(e.target.value.toUpperCase().replace(/[^0-9A-F]/g, ""))}
            />
            <button type="submit" className="botao-primario px-4" disabled={enviando} aria-label="Conectar">
              {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
            </button>
          </form>

          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Mostrar ao parceiro quantos kg perdi</span>
            <input type="checkbox" className="h-5 w-5 accent-marca-600" checked={compartilharKg} onChange={(e) => atualizar({ compartilharKg: e.target.checked })} />
          </label>
          <p className="text-xs text-slate-500">O parceiro nunca vê seu peso, medidas, fotos ou o que você comeu.</p>

          {parceiros.length > 0 && (
            <ul className="space-y-2">
              {parceiros.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-marca-100 font-bold text-marca-700">
                    {p.nome.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{p.nome}</p>
                    {p.resumo ? (
                      <p className="text-xs text-slate-500">
                        Dia {Math.round(p.resumo.pct_dia * 100)}% · 🔥 {p.resumo.sequencia_missoes} · 💧 {p.resumo.sequencia_agua}
                        {p.resumo.kg_perdidos !== null && p.resumo.kg_perdidos > 0 && ` · −${String(p.resumo.kg_perdidos).replace(".", ",")} kg`}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400">Ainda sem atividade</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="rounded-xl p-2 text-slate-300 hover:bg-red-50 hover:text-red-500"
                    aria-label={`Desfazer dupla com ${p.nome}`}
                    onClick={() => {
                      if (confirm(`Desfazer a dupla com ${p.nome}?`)) void remover(p.id);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
