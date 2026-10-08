import { Download, FileText, ShieldCheck, Trash2, X } from "lucide-react";
import { useState } from "react";
import { repository } from "../../data";
import { baixarArquivo } from "../../lib/cardCompartilhar";
import { hojeISO } from "../../lib/dates";
import { apagarTodasFotos } from "../../lib/fotosDB";
import { useAppStore } from "../../store/useAppStore";
import { usePreferencias } from "../../store/usePreferencias";

export function TextoPrivacidade() {
  const nuvem = repository.modo === "supabase";
  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-700">
      <p>
        <b>Resumo:</b> o Vida Leve guarda só o necessário para calcular suas metas. Não vendemos, não compartilhamos e não usamos seus dados
        para anúncios.
      </p>
      <h3 className="font-semibold text-slate-900">Quais dados</h3>
      <p>
        Nome, idade, sexo biológico, altura, peso, medidas, rotina, respostas de saúde (gestação/condição de saúde), registros de água,
        comida e missões. Peso e saúde são <b>dados sensíveis</b> pela LGPD (Lei 13.709/2018).
      </p>
      <h3 className="font-semibold text-slate-900">Para quê</h3>
      <p>Exclusivamente para calcular e ajustar seu plano e mostrar seu progresso. Base legal: seu consentimento, ao usar o app.</p>
      <h3 className="font-semibold text-slate-900">Onde ficam</h3>
      <p>
        {nuvem
          ? "Na sua conta, num banco de dados protegido (Supabase), onde cada pessoa só acessa as próprias linhas."
          : "Somente neste aparelho, no armazenamento do navegador. Nada vai para a internet."}{" "}
        <b>Fotos de progresso ficam sempre só no aparelho.</b>
      </p>
      <h3 className="font-semibold text-slate-900">Modo dupla</h3>
      <p>Seu parceiro vê apenas seu primeiro nome, o placar do dia e as sequências — e os quilos perdidos só se você permitir.</p>
      <h3 className="font-semibold text-slate-900">Seus direitos</h3>
      <p>
        Você pode baixar todos os seus dados ou apagar tudo a qualquer momento, aqui no Perfil. Apagar é definitivo e inclui{" "}
        {nuvem ? "a sua conta." : "tudo o que está neste aparelho."}
      </p>
      <p className="text-xs text-slate-500">
        O app é educativo e não substitui orientação de médico ou nutricionista.
      </p>
    </div>
  );
}

export function Privacidade() {
  const apagarTudo = useAppStore((s) => s.apagarTudo);
  const resetarPrefs = usePreferencias((s) => s.resetar);
  const [aberto, setAberto] = useState(false);
  const [exportando, setExportando] = useState(false);

  const exportar = async () => {
    setExportando(true);
    try {
      const dados = await repository.exportAll();
      baixarArquivo(new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" }), `vida-leve-meus-dados-${hojeISO()}.json`);
    } finally {
      setExportando(false);
    }
  };

  const apagar = async () => {
    const msg =
      repository.modo === "supabase"
        ? "Apagar sua CONTA e TODOS os dados? Isso não pode ser desfeito."
        : "Apagar TODOS os dados deste aparelho e recomeçar? Isso não pode ser desfeito.";
    if (!confirm(msg)) return;
    await apagarTodasFotos();
    if (await apagarTudo()) resetarPrefs();
  };

  return (
    <section className="cartao space-y-3">
      <h2 className="flex items-center gap-2 font-semibold">
        <ShieldCheck className="h-5 w-5 text-marca-600" /> Privacidade e dados
      </h2>
      <button type="button" className="botao-secundario w-full justify-start" onClick={() => setAberto(true)}>
        <FileText className="h-5 w-5" /> Política de privacidade
      </button>
      <button type="button" className="botao-secundario w-full justify-start" onClick={exportar} disabled={exportando}>
        <Download className="h-5 w-5" /> Baixar meus dados
      </button>
      <button type="button" className="botao w-full justify-start bg-superficie text-red-600 ring-1 ring-red-200 hover:bg-red-50" onClick={apagar}>
        <Trash2 className="h-5 w-5" /> {repository.modo === "supabase" ? "Apagar minha conta e dados" : "Apagar todos os dados"}
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center" onClick={() => setAberto(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Política de privacidade"
            className="animar-surgir pb-seguro max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-superficie p-5 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Política de privacidade</h2>
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar" className="rounded-xl p-2 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <TextoPrivacidade />
          </div>
        </div>
      )}
    </section>
  );
}
