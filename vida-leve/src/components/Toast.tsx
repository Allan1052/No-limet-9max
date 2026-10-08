import { AlertCircle, X } from "lucide-react";
import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";

export function ToastErro() {
  const erro = useAppStore((s) => s.erro);
  const limpar = useAppStore((s) => s.limparErro);

  useEffect(() => {
    if (!erro) return;
    const t = setTimeout(limpar, 5000);
    return () => clearTimeout(t);
  }, [erro, limpar]);

  if (!erro) return null;
  return (
    <div className="pt-seguro fixed inset-x-0 top-0 z-50 flex justify-center px-4" role="alert">
      <div className="flex w-full max-w-md items-start gap-3 rounded-2xl bg-red-600 px-4 py-3 text-sm text-white shadow-lg">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <p className="flex-1">{erro}</p>
        <button type="button" onClick={limpar} aria-label="Fechar aviso">
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
