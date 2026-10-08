import { OPCOES_ATIVIDADE, OPCOES_SEXO, OPCOES_TRANSPORTE } from "../lib/opcoes";
import { Opcoes, SimNao } from "./Opcoes";
import type { ErrosForm, FormPerfil } from "./useProfileForm";

interface Props {
  form: FormPerfil;
  erros: ErrosForm;
  set: <K extends keyof FormPerfil>(campo: K, valor: FormPerfil[K]) => void;
}

function Erro({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1.5 text-sm text-red-600">{msg}</p> : null;
}

function CampoNumero(props: {
  id: string;
  rotulo: string;
  sufixo: string;
  valor: string;
  onChange: (v: string) => void;
  erro?: string;
  decimal?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={props.id} className="rotulo">
        {props.rotulo}
      </label>
      <div className="relative">
        <input
          id={props.id}
          className={`campo pr-14 ${props.erro ? "border-red-400" : ""}`}
          inputMode={props.decimal ? "decimal" : "numeric"}
          value={props.valor}
          placeholder={props.placeholder}
          onChange={(e) => props.onChange(e.target.value.replace(/[^\d.,]/g, ""))}
          aria-invalid={!!props.erro}
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
          {props.sufixo}
        </span>
      </div>
      <Erro msg={props.erro} />
    </div>
  );
}

export function CamposBasicos({ form, erros, set }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="nome" className="rotulo">
          Nome
        </label>
        <input
          id="nome"
          className={`campo ${erros.nome ? "border-red-400" : ""}`}
          value={form.nome}
          maxLength={80}
          autoComplete="given-name"
          placeholder="Como quer ser chamado(a)?"
          onChange={(e) => set("nome", e.target.value)}
        />
        <Erro msg={erros.nome} />
      </div>

      <div>
        <span className="rotulo">Sexo biológico</span>
        <Opcoes nome="Sexo biológico" opcoes={OPCOES_SEXO} valor={form.sexo} onChange={(v) => set("sexo", v)} />
        <p className="mt-1.5 text-xs text-slate-500">Usado apenas na fórmula do metabolismo basal.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <CampoNumero id="idade" rotulo="Idade" sufixo="anos" valor={form.idade} onChange={(v) => set("idade", v)} erro={erros.idade} placeholder="30" />
        <CampoNumero id="altura" rotulo="Altura" sufixo="cm" valor={form.altura_cm} onChange={(v) => set("altura_cm", v)} erro={erros.altura_cm} placeholder="170" />
        <CampoNumero id="peso" rotulo="Peso" sufixo="kg" decimal valor={form.peso_inicial} onChange={(v) => set("peso_inicial", v)} erro={erros.peso_inicial} placeholder="80" />
      </div>

      <div>
        <span className="rotulo">Nível de atividade</span>
        <Opcoes
          nome="Nível de atividade"
          colunas={1}
          opcoes={OPCOES_ATIVIDADE}
          valor={form.nivel_atividade}
          onChange={(v) => set("nivel_atividade", v)}
        />
      </div>
    </div>
  );
}

export function CamposRotina({ form, erros, set }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <span className="rotulo">Como você vai para o trabalho/estudo?</span>
        <Opcoes nome="Transporte" opcoes={OPCOES_TRANSPORTE} valor={form.transporte} onChange={(v) => set("transporte", v)} />
      </div>

      <div>
        <label htmlFor="sentado" className="rotulo">
          Quantas horas por dia você passa sentado(a)?
        </label>
        <div className="flex items-center gap-4">
          <input
            id="sentado"
            type="range"
            min={0}
            max={16}
            step={1}
            value={form.horas_sentado}
            onChange={(e) => set("horas_sentado", e.target.value)}
            className="h-2 flex-1 cursor-pointer accent-marca-600"
          />
          <span className="w-16 rounded-xl bg-slate-100 py-2 text-center font-semibold tabular-nums">{form.horas_sentado}h</span>
        </div>
        <Erro msg={erros.horas_sentado} />
      </div>

      <div>
        <span className="rotulo">Você costuma subir escadas no dia a dia?</span>
        <SimNao nome="Sobe escadas" valor={form.sobe_escadas} onChange={(v) => set("sobe_escadas", v)} />
      </div>

      <div>
        <span className="rotulo">Já pratica alguma atividade física?</span>
        <SimNao nome="Pratica atividade" valor={form.pratica_atividade} onChange={(v) => set("pratica_atividade", v)} />
      </div>
    </div>
  );
}

export function CamposSaude({ form, set }: Props) {
  return (
    <div className="space-y-6">
      {form.sexo === "feminino" && (
        <div>
          <span className="rotulo">Está grávida ou amamentando?</span>
          <SimNao nome="Gestante ou amamentando" valor={form.gestante_lactante} onChange={(v) => set("gestante_lactante", v)} />
          <p className="mt-1.5 text-xs text-slate-500">Se sim, o app não propõe déficit calórico — só hábitos e hidratação.</p>
        </div>
      )}
      <div>
        <span className="rotulo">Tem alguma condição de saúde ou usa remédio contínuo?</span>
        <SimNao nome="Condição de saúde" valor={form.condicao_saude} onChange={(v) => set("condicao_saude", v)} />
        <p className="mt-1.5 text-xs text-slate-500">
          Ex.: diabetes, pressão alta, doença nos rins, no coração ou na tireoide, transtorno alimentar.
        </p>
      </div>
    </div>
  );
}
