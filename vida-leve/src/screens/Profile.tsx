import { Database, Loader2, LogOut, Save } from "lucide-react";
import { useState } from "react";
import { CamposBasicos, CamposRotina } from "../components/CamposPerfil";
import { paraInput, useProfileForm, validarBasico, validarRotina } from "../components/useProfileForm";
import { repository } from "../data";
import { useAppStore } from "../store/useAppStore";

export function Profile() {
  const profile = useAppStore((s) => s.profile);
  const salvarPerfil = useAppStore((s) => s.salvarPerfil);
  const sair = useAppStore((s) => s.sair);
  const { form, set, erros, setErros } = useProfileForm(profile ?? undefined);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  if (!profile) return null;

  const salvar = async () => {
    const e = { ...validarBasico(form), ...validarRotina(form) };
    if (Object.keys(e).length) {
      setErros(e);
      return;
    }
    const input = paraInput(form);
    const rotinaMudou =
      input.transporte !== profile.transporte ||
      input.horas_sentado !== profile.horas_sentado ||
      input.sobe_escadas !== profile.sobe_escadas ||
      input.pratica_atividade !== profile.pratica_atividade;
    setSalvando(true);
    const ok = await salvarPerfil(input, rotinaMudou);
    setSalvando(false);
    if (ok) {
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
    }
  };

  const local = repository.modo === "local";

  return (
    <div className="space-y-4">
      <header className="mb-2">
        <h1 className="text-2xl font-bold">Perfil</h1>
        <p className="text-sm text-slate-500">Alterou algo? As metas são recalculadas ao salvar.</p>
      </header>

      <section className="cartao">
        <h2 className="mb-4 font-semibold">Dados básicos</h2>
        <CamposBasicos form={form} erros={erros} set={set} />
      </section>

      <section className="cartao">
        <h2 className="mb-1 font-semibold">Rotina</h2>
        <p className="mb-4 text-xs text-slate-500">Mudar a rotina gera novas missões do dia.</p>
        <CamposRotina form={form} erros={erros} set={set} />
      </section>

      <button type="button" className="botao-primario w-full" onClick={salvar} disabled={salvando}>
        {salvando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
        {salvo ? "Salvo!" : "Salvar alterações"}
      </button>

      <section className="cartao text-sm text-slate-600">
        <div className="mb-2 flex items-center gap-2 font-semibold text-slate-800">
          <Database className="h-4 w-4" /> {local ? "Modo local" : "Conectado à nuvem"}
        </div>
        {local
          ? "Seus dados ficam só neste aparelho/navegador. Configure o Supabase para sincronizar entre dispositivos."
          : "Seus dados estão salvos com segurança na sua conta."}
      </section>

      <button
        type="button"
        className="botao w-full bg-white text-red-600 ring-1 ring-red-200 hover:bg-red-50"
        onClick={() => {
          if (!local || confirm("Apagar TODOS os dados deste aparelho e recomeçar?")) void sair();
        }}
      >
        <LogOut className="h-5 w-5" />
        {local ? "Apagar dados e recomeçar" : "Sair da conta"}
      </button>

      <p className="px-2 pb-2 text-center text-xs text-slate-400">
        Fórmula de Mifflin-St Jeor · água 35 ml/kg · proteína 1,8 g/kg · déficit de 400–500 kcal. Estimativas
        educativas; não substituem acompanhamento profissional.
      </p>
    </div>
  );
}
