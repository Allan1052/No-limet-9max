import { ArrowLeft, ArrowRight, Droplets, Flame, Leaf, Loader2, Beef, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { CamposBasicos, CamposRotina } from "../components/CamposPerfil";
import { paraInput, useProfileForm, validarBasico, validarRotina } from "../components/useProfileForm";
import { classificarIMC, recalcularPlano } from "../lib/calculations";
import { gerarMissoes } from "../lib/habits";
import { useAppStore } from "../store/useAppStore";

const PASSOS = ["Sobre você", "Sua rotina", "Seu plano"] as const;

export function Onboarding() {
  const salvarPerfil = useAppStore((s) => s.salvarPerfil);
  const { form, set, erros, setErros } = useProfileForm();
  const [passo, setPasso] = useState(0);
  const [salvando, setSalvando] = useState(false);

  const previa = useMemo(() => {
    if (passo < 2) return null;
    const input = paraInput(form);
    const plano = recalcularPlano(
      { peso_kg: input.peso_inicial, altura_cm: input.altura_cm, idade: input.idade, sexo: input.sexo },
      input.nivel_atividade,
    );
    return { input, plano, missoes: gerarMissoes(input) };
  }, [passo, form]);

  const avancar = async () => {
    const e = passo === 0 ? validarBasico(form) : passo === 1 ? validarRotina(form) : {};
    if (Object.keys(e).length) {
      setErros(e);
      return;
    }
    if (passo < 2) {
      setPasso(passo + 1);
      window.scrollTo({ top: 0 });
      return;
    }
    setSalvando(true);
    await salvarPerfil(paraInput(form), true);
    setSalvando(false);
  };

  return (
    <div className="pt-seguro mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-6">
      <header className="mb-6 mt-2">
        <div className="mb-5 flex items-center gap-2 text-marca-600">
          <Leaf className="h-6 w-6" />
          <span className="text-lg font-bold">Vida Leve</span>
        </div>
        <div className="flex gap-1.5" aria-hidden>
          {PASSOS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition ${i <= passo ? "bg-marca-500" : "bg-slate-200"}`} />
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Passo {passo + 1} de {PASSOS.length}
        </p>
        <h1 className="text-2xl font-bold">{PASSOS[passo]}</h1>
      </header>

      <main className="flex-1">
        {passo === 0 && <CamposBasicos form={form} erros={erros} set={set} />}
        {passo === 1 && <CamposRotina form={form} erros={erros} set={set} />}
        {passo === 2 && previa && (
          <div className="space-y-4">
            <p className="text-slate-600">
              Pronto, {previa.input.nome.split(" ")[0]}! Estas são suas metas iniciais. Elas se ajustam sozinhas a cada
              check-in de peso.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Meta Icone={Flame} cor="text-orange-500 bg-orange-50" rotulo="Calorias/dia" valor={`${previa.plano.calorias_meta}`} sufixo="kcal" />
              <Meta Icone={Droplets} cor="text-sky-500 bg-sky-50" rotulo="Água/dia" valor={(previa.plano.meta_agua_ml / 1000).toFixed(1).replace(".", ",")} sufixo="L" />
              <Meta Icone={Beef} cor="text-rose-500 bg-rose-50" rotulo="Proteína/dia" valor={`${previa.plano.meta_proteina_g}`} sufixo="g" />
              <Meta Icone={Sparkles} cor="text-violet-500 bg-violet-50" rotulo="IMC" valor={previa.plano.imc.toFixed(1).replace(".", ",")} sufixo={classificarIMC(previa.plano.imc).rotulo} />
            </div>
            <div className="cartao text-sm text-slate-600">
              Metabolismo basal: <b>{previa.plano.tmb} kcal</b> · gasto estimado: <b>{previa.plano.gasto_total} kcal</b> ·
              déficit: <b>{previa.plano.deficit_aplicado} kcal</b>
            </div>
            <div className="cartao">
              <h2 className="mb-2 font-semibold">Suas primeiras missões</h2>
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
                {previa.missoes.slice(0, 4).map((m) => (
                  <li key={m.descricao_habito}>{m.descricao_habito}</li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-slate-400">
              Estimativas educativas. Não substituem nutricionista ou médico — procure um profissional se tiver
              condições de saúde, estiver grávida ou amamentando.
            </p>
          </div>
        )}
      </main>

      <footer className="mt-8 flex gap-3">
        {passo > 0 && (
          <button type="button" className="botao-secundario" onClick={() => setPasso(passo - 1)} aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <button type="button" className="botao-primario flex-1" onClick={avancar} disabled={salvando}>
          {salvando ? <Loader2 className="h-5 w-5 animate-spin" /> : passo === 2 ? "Começar" : "Continuar"}
          {!salvando && <ArrowRight className="h-5 w-5" />}
        </button>
      </footer>
    </div>
  );
}

function Meta(props: { Icone: typeof Flame; cor: string; rotulo: string; valor: string; sufixo: string }) {
  return (
    <div className="cartao p-4">
      <div className={`mb-2 inline-flex rounded-xl p-2 ${props.cor}`}>
        <props.Icone className="h-5 w-5" />
      </div>
      <p className="text-xs text-slate-500">{props.rotulo}</p>
      <p className="text-2xl font-bold tabular-nums">{props.valor}</p>
      <p className="text-xs text-slate-500">{props.sufixo}</p>
    </div>
  );
}
