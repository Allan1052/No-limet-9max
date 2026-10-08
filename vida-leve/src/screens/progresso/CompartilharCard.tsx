import { Download, Loader2, Share2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { compartilharImagem, gerarCard } from "../../lib/cardCompartilhar";
import { useConquistas, useSequencias } from "../../store/derivados";
import { useAppStore } from "../../store/useAppStore";

/** Prévia + botão de compartilhar do card de progresso. */
export function CompartilharCard({ onFechar }: { onFechar: () => void }) {
  const profile = useAppStore((s) => s.profile);
  const conquistas = useConquistas();
  const seq = useSequencias();
  const [mostrarKg, setMostrarKg] = useState(true);
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const dados = useMemo(() => {
    if (!profile) return null;
    const desbloqueadas = conquistas.filter((c) => c.desbloqueada);
    const semanas = Math.max(1, Math.round((Date.now() - Date.parse(profile.created_at)) / (7 * 864e5)));
    return {
      nome: profile.nome,
      kgPerdidos: mostrarKg ? Math.round((profile.peso_inicial - profile.peso_atual) * 10) / 10 : null,
      semanas,
      sequenciaMissoes: seq?.missoes ?? 0,
      conquistas: desbloqueadas.length,
      emojisConquistas: desbloqueadas.map((c) => c.emoji),
    };
  }, [profile, conquistas, seq, mostrarKg]);

  useEffect(() => {
    if (!dados) return;
    let vivo = true;
    let criado: string | null = null;
    gerarCard(dados)
      .then((b) => {
        if (!vivo) return;
        criado = URL.createObjectURL(b);
        setBlob(b);
        setUrl(criado);
      })
      .catch((e: unknown) => setAviso(e instanceof Error ? e.message : "Não foi possível gerar a imagem."));
    return () => {
      vivo = false;
      if (criado) URL.revokeObjectURL(criado);
    };
  }, [dados]);

  const enviar = async () => {
    if (!blob) return;
    setEnviando(true);
    const r = await compartilharImagem(blob);
    setEnviando(false);
    if (r === "baixado") setAviso("Imagem baixada! Agora é só postar.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center" onClick={onFechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Compartilhar progresso"
        className="animar-surgir pb-seguro max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-superficie p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Compartilhar progresso</h2>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="rounded-xl p-2 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mx-auto aspect-[4/5] w-full max-w-[280px] overflow-hidden rounded-2xl bg-slate-100">
          {url ? <img src={url} alt="Prévia do card de progresso" className="h-full w-full object-cover" /> : <Loader2 className="m-auto mt-24 h-8 w-8 animate-spin text-slate-400" />}
        </div>
        <label className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
          <span>Mostrar quantos quilos perdi</span>
          <input type="checkbox" className="h-5 w-5 accent-marca-600" checked={mostrarKg} onChange={(e) => setMostrarKg(e.target.checked)} />
        </label>
        <p className="mt-2 text-xs text-slate-500">O card nunca mostra seu peso, só a diferença (se você quiser).</p>
        {aviso && <p className="mt-2 text-sm text-marca-700">{aviso}</p>}
        <button type="button" className="botao-primario mt-4 w-full" onClick={enviar} disabled={!blob || enviando}>
          {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : "share" in navigator ? <Share2 className="h-5 w-5" /> : <Download className="h-5 w-5" />}
          {"share" in navigator ? "Compartilhar" : "Baixar imagem"}
        </button>
      </div>
    </div>
  );
}
