import { Beef, CalendarCheck, Check, CheckCircle2, Droplets, Flame, GlassWater, HeartPulse, PartyPopper, Plus, Undo2 } from "lucide-react";
import { useState } from "react";
import { AnelDia } from "../components/AnelDia";
import { Aviso } from "../components/Aviso";
import { ProgressBar } from "../components/ProgressBar";
import { classificarIMC, progresso } from "../lib/calculations";
import { diasParaCheckin } from "../lib/lembretes";
import { alertasDeSaude } from "../lib/seguranca";
import { useRitmoAtual, useSequencias } from "../store/derivados";
import { missoesDoDia, placarDoDia, planoDoPerfil, useAppStore } from "../store/useAppStore";
import { usePreferencias } from "../store/usePreferencias";

const litros = (ml: number) => (ml / 1000).toFixed(2).replace(".", ",").replace(/0$/, "");

function saudacao(): string {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export function Dashboard() {
  const estado = useAppStore();
  const { profile, agua, comida, hoje, pesos, adicionarAgua, desfazerAgua, alternarHabito, irPara } = estado;
  const copos = usePreferencias((s) => s.copos);
  const lembretes = usePreferencias((s) => s.lembretes);
  const seq = useSequencias();
  const ritmo = useRitmoAtual();
  const [outro, setOutro] = useState(false);
  const [mlOutro, setMlOutro] = useState("");

  if (!profile) return null;
  const plano = planoDoPerfil(profile);
  const imc = classificarIMC(plano.imc);
  const placar = placarDoDia(estado);
  const missoes = missoesDoDia(estado.missoes, hoje);
  const totalAgua = agua.reduce((s, a) => s + a.quantidade_ml, 0);
  const aguaOk = totalAgua >= profile.meta_agua_ml;
  const proteina = comida.reduce((s, c) => s + c.proteina_g, 0);
  const calorias = comida.reduce((s, c) => s + c.calorias, 0);
  const feitas = missoes.filter((h) => h.concluido_hoje).length;
  const perdido = Math.round((profile.peso_inicial - profile.peso_atual) * 10) / 10;
  const ultimo = pesos.at(-1);
  const diasDesde = ultimo ? Math.round((Date.parse(hoje) - Date.parse(ultimo.data_registro)) / 864e5) : null;
  const diaDeCheckin = diasDesde === null || diasDesde >= 7 || (lembretes.checkin && diasParaCheckin(new Date(), lembretes.diaCheckin) === 0 && diasDesde >= 6);
  const alertas = alertasDeSaude(profile, ritmo);

  const enviarOutro = () => {
    const ml = Math.round(Number(mlOutro));
    if (ml > 0 && ml <= 2000) void adicionarAgua(ml);
    setOutro(false);
    setMlOutro("");
  };

  return (
    <div className="space-y-4">
      <header className="mb-1 flex items-end justify-between">
        <div>
          <p className="text-sm text-slate-500">{saudacao()},</p>
          <h1 className="text-2xl font-bold">{profile.nome.split(" ")[0]} 👋</h1>
        </div>
        {seq && (seq.agua > 0 || seq.missoes > 0) && (
          <div className="flex gap-1.5">
            {seq.missoes > 0 && <span className="chip bg-orange-100 text-orange-800" title="Dias seguidos com 3+ missões">🔥 {seq.missoes}</span>}
            {seq.agua > 0 && <span className="chip bg-sky-100 text-sky-800" title="Dias seguidos batendo a água">💧 {seq.agua}</span>}
          </div>
        )}
      </header>

      <section className="cartao">
        <AnelDia
          valor={placar.total}
          partes={[
            { rotulo: "Água", valor: placar.agua, cor: "bg-sky-500" },
            { rotulo: "Missões", valor: placar.missoes, cor: "bg-marca-500" },
            { rotulo: "Proteína", valor: placar.proteina, cor: "bg-rose-500" },
          ]}
        />
      </section>

      {diaDeCheckin && (
        <Aviso
          tipo="sucesso"
          icone={<CalendarCheck className="h-5 w-5" />}
          acao={
            <button type="button" className="text-sm font-semibold underline" onClick={() => irPara("progresso")}>
              Pesar
            </button>
          }
        >
          {diasDesde === null ? "Faça seu primeiro check-in de peso." : "Dia de check-in! Pese-se e o plano se ajusta."}
        </Aviso>
      )}

      {alertas.map((a) => (
        <Aviso key={a.id} tipo={a.tipo} icone={<HeartPulse className="h-5 w-5" />}>
          {a.texto}
        </Aviso>
      ))}

      {/* Status: IMC */}
      <section className="cartao flex items-center gap-4">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Seu IMC</p>
          <p className="text-3xl font-bold tabular-nums">{plano.imc.toFixed(1).replace(".", ",")}</p>
          <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${imc.cor}`}>{imc.rotulo}</span>
        </div>
        <button type="button" onClick={() => irPara("progresso")} className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
          <p className="text-xs text-slate-400">Peso atual</p>
          <p className="text-xl font-bold tabular-nums">{profile.peso_atual.toString().replace(".", ",")} kg</p>
          {perdido !== 0 && (
            <p className={`text-xs font-semibold ${perdido > 0 ? "text-marca-600" : "text-amber-600"}`}>
              {perdido > 0 ? "−" : "+"}
              {Math.abs(perdido).toString().replace(".", ",")} kg desde o início
            </p>
          )}
        </button>
      </section>

      {/* Hidratação */}
      <section className={`cartao transition ${aguaOk ? "ring-2 ring-sky-300" : ""}`}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-sky-50 p-2 text-sky-500">
              <Droplets className="h-5 w-5" />
            </div>
            <h2 className="font-semibold">Hidratação</h2>
          </div>
          {aguaOk && (
            <span className="chip bg-sky-100 text-sky-700">
              <PartyPopper className="h-3.5 w-3.5" /> Meta batida!
            </span>
          )}
        </div>
        <p className="mb-2 tabular-nums">
          <span className="text-2xl font-bold">{litros(totalAgua)} L</span>
          <span className="text-slate-400"> / {litros(profile.meta_agua_ml)} L</span>
        </p>
        <ProgressBar valor={progresso(totalAgua, profile.meta_agua_ml)} cor="bg-sky-500" rotuloAcessivel="Progresso de água" />
        <p className="mt-2 text-xs text-slate-500">
          {aguaOk ? "Excelente! Continue bebendo conforme a sede." : `Faltam ${litros(profile.meta_agua_ml - totalAgua)} L.`}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {copos.map((ml, i) => (
            <button
              key={ml}
              type="button"
              className={`botao flex-1 px-3 text-white shadow-sm ${i === 1 || copos.length === 1 ? "bg-sky-600" : "bg-sky-500"}`}
              onClick={() => adicionarAgua(ml)}
              aria-label={`Adicionar ${ml} ml de água`}
            >
              <GlassWater className="h-4 w-4" /> +{ml}
            </button>
          ))}
          <button type="button" className="botao-secundario px-3" onClick={() => setOutro((v) => !v)} aria-label="Outra quantidade">
            <Plus className="h-5 w-5" />
          </button>
          <button type="button" className="botao-secundario px-3" onClick={() => desfazerAgua()} disabled={agua.length === 0} aria-label="Desfazer último registro">
            <Undo2 className="h-5 w-5" />
          </button>
        </div>
        {outro && (
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              enviarOutro();
            }}
          >
            <input className="campo" inputMode="numeric" placeholder="Quantos ml?" value={mlOutro} onChange={(e) => setMlOutro(e.target.value.replace(/\D/g, ""))} autoFocus />
            <button type="submit" className="botao-primario px-4">
              OK
            </button>
          </form>
        )}
      </section>

      {/* Nutrição */}
      <section className="cartao space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Alimentação de hoje</h2>
          <button type="button" className="text-sm font-semibold text-marca-700" onClick={() => irPara("comida")}>
            + Registrar
          </button>
        </div>
        <Barra
          Icone={Beef}
          cor="text-rose-500 bg-rose-50"
          barra="bg-rose-500"
          rotulo="Proteína"
          valor={`${Math.round(proteina)} / ${profile.meta_proteina_g} g`}
          pct={progresso(proteina, profile.meta_proteina_g)}
        />
        <Barra
          Icone={Flame}
          cor="text-orange-500 bg-orange-50"
          barra={calorias > profile.calorias_meta ? "bg-amber-500" : "bg-orange-500"}
          rotulo={plano.modo === "manutencao" ? "Calorias (manutenção)" : `Calorias · déficit ${plano.deficit_aplicado}`}
          valor={`${calorias} / ${profile.calorias_meta} kcal`}
          pct={progresso(calorias, profile.calorias_meta)}
        />
        {comida.length === 0 && <p className="text-xs text-slate-500">Toque em “Registrar” e some o que comeu em segundos.</p>}
      </section>

      {/* Missões */}
      <section className="cartao">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Missões do dia</h2>
          <span className="text-sm font-semibold tabular-nums text-marca-600">
            {feitas}/{missoes.length}
          </span>
        </div>
        <ProgressBar valor={progresso(feitas, missoes.length)} rotuloAcessivel="Missões concluídas" />
        {missoes.length > 0 && feitas === missoes.length && (
          <p className="mt-3 flex items-center gap-2 rounded-2xl bg-marca-50 px-3 py-2 text-sm font-medium text-marca-700">
            <CheckCircle2 className="h-5 w-5" /> Todas as missões de hoje concluídas. Que dia!
          </p>
        )}
        <ul className="mt-3 space-y-2">
          {missoes.map((h) => {
            const ok = h.concluido_hoje;
            return (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => alternarHabito(h.id)}
                  aria-pressed={ok}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left text-sm transition active:scale-[0.99] ${
                    ok ? "border-marca-200 bg-marca-50 text-slate-500" : "border-slate-200 bg-superficie text-slate-800"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                      ok ? "border-marca-500 bg-marca-500 text-white" : "border-slate-300"
                    }`}
                  >
                    {ok && <Check className="h-4 w-4" strokeWidth={3} />}
                  </span>
                  <span className={`flex-1 ${ok ? "line-through" : ""}`}>{h.descricao_habito}</span>
                  {h.nivel > 1 && <span className="chip bg-violet-100 text-violet-700">nív. {h.nivel}</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-slate-400">Novas missões todo dia. A cada 5 vezes concluída, a missão sobe de nível.</p>
      </section>
    </div>
  );
}

function Barra(props: { Icone: typeof Beef; cor: string; barra: string; rotulo: string; valor: string; pct: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`rounded-xl p-2 ${props.cor}`}>
        <props.Icone className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="mb-1 flex justify-between text-sm">
          <span className="text-slate-600">{props.rotulo}</span>
          <span className="font-semibold tabular-nums">{props.valor}</span>
        </div>
        <ProgressBar valor={props.pct} cor={props.barra} rotuloAcessivel={props.rotulo} />
      </div>
    </div>
  );
}
