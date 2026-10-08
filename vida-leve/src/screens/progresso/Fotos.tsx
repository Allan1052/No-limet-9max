import { Camera, Loader2, Lock, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatarDataLonga, hojeISO } from "../../lib/dates";
import { apagarFoto, listarFotos, salvarFoto, type FotoProgresso } from "../../lib/fotosDB";

interface FotoComUrl extends FotoProgresso {
  url: string;
}

export function Fotos() {
  const [fotos, setFotos] = useState<FotoComUrl[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [comparar, setComparar] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    try {
      const lista = await listarFotos();
      setFotos((antigas) => {
        antigas.forEach((f) => URL.revokeObjectURL(f.url));
        return lista.map((f) => ({ ...f, url: URL.createObjectURL(f.blob) }));
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível abrir as fotos.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => () => fotos.forEach((f) => URL.revokeObjectURL(f.url)), [fotos]);

  const escolher = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setCarregando(true);
    setErro(null);
    try {
      await salvarFoto(arquivo, hojeISO());
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar a foto.");
      setCarregando(false);
    }
  };

  const primeira = fotos[0];
  const ultima = fotos.at(-1);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Fotos de progresso</h2>
        <p className="flex items-center gap-1.5 text-sm text-slate-500">
          <Lock className="h-4 w-4" /> Ficam só neste aparelho. Nunca vão para a internet.
        </p>
      </div>

      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void escolher(e.target.files?.[0])} />
      <button type="button" className="botao-primario w-full" onClick={() => input.current?.click()} disabled={carregando}>
        {carregando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />} Tirar / escolher foto
      </button>
      <p className="text-xs text-slate-500">Dica: mesma roupa, mesmo lugar, mesma luz — a cada 2 ou 4 semanas.</p>
      {erro && <p className="text-sm text-red-600">{erro}</p>}

      {fotos.length >= 2 && (
        <button type="button" className="botao-secundario w-full" onClick={() => setComparar((v) => !v)}>
          {comparar ? "Ver todas" : "Comparar primeira × última"}
        </button>
      )}

      {comparar && primeira && ultima ? (
        <div className="grid grid-cols-2 gap-2">
          {[primeira, ultima].map((f, i) => (
            <figure key={f.id} className="overflow-hidden rounded-2xl bg-slate-100">
              <img src={f.url} alt={`Foto de ${formatarDataLonga(f.data)}`} className="aspect-[3/4] w-full object-cover" />
              <figcaption className="px-2 py-1.5 text-center text-xs text-slate-600">
                {i === 0 ? "Antes" : "Agora"} · {formatarDataLonga(f.data)}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <ul className="grid grid-cols-3 gap-2">
          {[...fotos].reverse().map((f) => (
            <li key={f.id} className="relative overflow-hidden rounded-2xl bg-slate-100">
              <img src={f.url} alt={`Foto de ${formatarDataLonga(f.data)}`} className="aspect-[3/4] w-full object-cover" loading="lazy" />
              <span className="absolute bottom-1 left-1 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] text-white">{formatarDataLonga(f.data)}</span>
              <button
                type="button"
                className="absolute right-1 top-1 rounded-lg bg-black/50 p-1.5 text-white"
                aria-label="Apagar foto"
                onClick={async () => {
                  if (!confirm("Apagar esta foto?")) return;
                  await apagarFoto(f.id);
                  await carregar();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {!carregando && fotos.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Nenhuma foto ainda.</p>}
    </div>
  );
}
