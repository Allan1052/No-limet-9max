import { ArrowLeft, ArrowRight, Beef, Droplets, Flame, HeartPulse, Leaf, Loader2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Aviso } from "../components/Aviso";
import { CamposBasicos, CamposRotina, CamposSaude } from "../components/CamposPerfil";
import { paraInput, useProfileForm, validarBasico, validarRotina } from "../components/useProfileForm";
import { classificarIMC, recalcularPlano } from "../lib/calculations";
import { hojeISO } from "../lib/dates";
import { gerarMissoesDoDia } from "../lib/habits";
import { alertasDeSaude } from "../lib/seguranca";
import type { Profile } from "../lib/types";
import { useAppStore } from "../store/useAppStore";

const PASSOS = ["Sobre você", "Sua rotina", "Sua saúde", "Seu plano"] as const;
const ULTIMO = PASSOS.length - 1;

export function Onboarding() {
  const salvarPerfil = useAppStore((s) => s.salvarPerfil);
  const { form, set, erros, setErros } = useProfileForm();
  const [passo, setPasso] = useState(0);
  const [salvando, setSalvando] = useState(false);

  const previa = useMemo(() => {
    if (passo < ULTIMO) return null;
    const input = paraInput(form);
    const plano = recalcularPlano(
      { peso_kg: input.peso_inicial, altura_cm: input.altura_cm, idade: input.idade, sexo: input.sexo },
      input.nivel_atividade,
      { gestante_lactante: input.gestante_lactante },
    );
    const alertas = alertasDeSaude({ ...input, peso_atual: input.peso_inicial } as Profile);
    return { input, plano, alertas, missoes: gerarMissoesDoDia(input, hojeISO(), "previa") };
  }, [passo, form]);

  const avancar = async () => {
    const e = passo === 0 ? validarBasico(form) : passo === 1 ? validarRotina(form) : {};
    if (Object.keys(e).length) {
      setErros(e);
      return;
    }
    if (passo < ULTIMO) {
      setPasso(passo + 1);
      window.scrollTo({ top: 0 });
      return;
    }
    setSalvando(true);
    await salvarPerfil(paraInput(form), true);
    setSalvando(false);
  };

  const virgula = (n: number, casas = 1) => n.toFixed(casas).replace(".", ",");

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
        {passo === 2 && (
          <div className="space-y-5">
            <Aviso tipo="info" icone={<HeartPulse className="h-5 w-5" />}>
              Duas perguntas rápidas para o plano ser seguro para você. As respostas ficam só com você.
            </Aviso>
            <CamposSaude form={form} erros={erros} set={set} />
          </div>
        )}
        {passo === ULTIMO && previa && (
          <div className="space-y-4">
            <p className="text-slate-600">
              Pronto, {previa.input.nome.split(" ")[0]}! Estas são suas metas iniciais. Elas se ajustam sozinhas a cada check-in — e,
              com o tempo, ao seu ritmo real.
            </p>
            {previa.alertas.map((a) => (
              <Aviso key={a.id} tipo={a.tipo} icone={<HeartPulse className="h-5 w-5" />}>
                {a.texto}
              </Aviso>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <Meta Icone={Flame} cor="text-orange-500 bg-orange-50" rotulo="Calorias/dia" valor={`${previa.plano.calorias_meta}`} sufixo="kcal" />
              <Meta Icone={Droplets} cor="text-sky-500 bg-sky-50" rotulo="Água/dia" valor={virgula(previa.plano.meta_agua_ml / 1000)} sufixo="litros" />
              <Meta Icone={Beef} cor="text-rose-500 bg-rose-50" rotulo="Proteína/dia" valor={`${previa.plano.meta_proteina_g}`} sufixo="gramas" />
              <Meta Icone={Sparkles} cor="text-violet-500 bg-violet-50" rotulo="IMC" valor={virgula(previa.plano.imc)} sufixo={classificarIMC(previa.plano.imc).rotulo} />
            </div>
            <div className="cartao text-sm text-slate-600">
              Metabolismo basal: <b>{previa.plano.tmb} kcal</b> · gasto estimado: <b>{previa.plano.gasto_total} kcal</b> ·{" "}
              {previa.plano.modo === "manutencao" ? <b>plano de manutenção (sem déficit)</b> : <>déficit: <b>{previa.plano.deficit_aplicado} kcal</b></>}
            </div>
            <div className="cartao">
              <h2 className="mb-1 font-semibold">Missões de hoje</h2>
              <p className="mb-2 text-xs text-slate-500">Mudam todo dia e ficam mais desafiadoras conforme você conclui.</p>
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
                {previa.missoes.map((m) => (
                  <li key={m.missao_id}>{m.descricao_habito}</li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-slate-400">
              Estimativas educativas, uma semana por vez. Não substituem nutricionista ou médico. Ritmo saudável: perder de 0,5% a 1% do
              peso por semana.
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
          {salvando ? <Loader2 className="h-5 w-5 animate-spin" /> : passo === ULTIMO ? "Começar" : "Continuar"}
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
