import { Beef, Check, CheckCircle2, Droplets, Flame, GlassWater, PartyPopper, Undo2 } from "lucide-react";
import { ProgressBar } from "../components/ProgressBar";
import { classificarIMC, progresso } from "../lib/calculations";
import { estaConcluidaHoje } from "../lib/habits";
import { planoDoPerfil, useAppStore } from "../store/useAppStore";

const COPO_ML = 250;

const litros = (ml: number) => (ml / 1000).toFixed(2).replace(".", ",").replace(/0$/, "");

function saudacao(): string {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export function Dashboard() {
  const profile = useAppStore((s) => s.profile);
  const agua = useAppStore((s) => s.agua);
  const habitos = useAppStore((s) => s.habitos);
  const hoje = useAppStore((s) => s.hoje);
  const adicionarAgua = useAppStore((s) => s.adicionarAgua);
  const desfazerAgua = useAppStore((s) => s.desfazerAgua);
  const alternarHabito = useAppStore((s) => s.alternarHabito);
  const irPara = useAppStore((s) => s.irPara);

  if (!profile) return null;
  const plano = planoDoPerfil(profile);
  const imc = classificarIMC(plano.imc);
  const totalAgua = agua.reduce((s, a) => s + a.quantidade_ml, 0);
  const pAgua = progresso(totalAgua, profile.meta_agua_ml);
  const aguaOk = pAgua >= 1;
  const feitas = habitos.filter((h) => estaConcluidaHoje(h, hoje)).length;
  const perdido = Math.round((profile.peso_inicial - profile.peso_atual) * 10) / 10;

  return (
    <div className="space-y-4">
      <header className="mb-2">
        <p className="text-sm text-slate-500">{saudacao()},</p>
        <h1 className="text-2xl font-bold">{profile.nome.split(" ")[0]} 👋</h1>
      </header>

      {/* Status: IMC */}
      <section className="cartao flex items-center gap-4">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Seu IMC</p>
          <p className="text-3xl font-bold tabular-nums">{plano.imc.toFixed(1).replace(".", ",")}</p>
          <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${imc.cor}`}>{imc.rotulo}</span>
        </div>
        <button type="button" onClick={() => irPara("checkin")} className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
          <p className="text-xs text-slate-400">Peso atual</p>
          <p className="text-xl font-bold tabular-nums">{profile.peso_atual.toString().replace(".", ",")} kg</p>
          {perdido !== 0 && (
            <p className={`text-xs font-semibold ${perdido > 0 ? "text-marca-600" : "text-amber-600"}`}>
              {perdido > 0 ? `−${perdido}` : `+${Math.abs(perdido)}`} kg desde o início
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
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
              <PartyPopper className="h-3.5 w-3.5" /> Meta batida!
            </span>
          )}
        </div>
        <p className="mb-2 tabular-nums">
          <span className="text-2xl font-bold">{litros(totalAgua)} L</span>
          <span className="text-slate-400"> / {litros(profile.meta_agua_ml)} L</span>
        </p>
        <ProgressBar valor={pAgua} cor="bg-sky-500" rotuloAcessivel="Progresso de água" />
        <p className="mt-2 text-xs text-slate-500">
          {aguaOk
            ? "Excelente! Continue bebendo conforme a sede."
            : `Faltam ${Math.ceil((profile.meta_agua_ml - totalAgua) / COPO_ML)} copos de ${COPO_ML} ml.`}
        </p>
        <div className="mt-4 flex gap-2">
          <button type="button" className="botao flex-1 bg-sky-500 text-white shadow-sm shadow-sky-500/30 hover:bg-sky-600" onClick={() => adicionarAgua(COPO_ML)}>
            <GlassWater className="h-5 w-5" /> +{COPO_ML} ml ingeridos
          </button>
          <button type="button" className="botao-secundario px-4" onClick={() => desfazerAgua()} disabled={agua.length === 0} aria-label="Desfazer último copo">
            <Undo2 className="h-5 w-5" />
          </button>
        </div>
      </section>

      {/* Nutrição */}
      <section className="grid grid-cols-2 gap-3">
        <div className="cartao p-4">
          <div className="mb-2 inline-flex rounded-xl bg-orange-50 p-2 text-orange-500">
            <Flame className="h-5 w-5" />
          </div>
          <p className="text-xs text-slate-500">Calorias/dia</p>
          <p className="text-2xl font-bold tabular-nums">{profile.calorias_meta}</p>
          <p className="text-xs text-slate-400">kcal · déficit {plano.deficit_aplicado}</p>
        </div>
        <div className="cartao p-4">
          <div className="mb-2 inline-flex rounded-xl bg-rose-50 p-2 text-rose-500">
            <Beef className="h-5 w-5" />
          </div>
          <p className="text-xs text-slate-500">Proteína/dia</p>
          <p className="text-2xl font-bold tabular-nums">{profile.meta_proteina_g} g</p>
          <p className="text-xs text-slate-400">≈ {Math.round(profile.meta_proteina_g / 4)} g por refeição (4×)</p>
        </div>
      </section>

      {/* Missões */}
      <section className="cartao">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Missões do dia</h2>
          <span className="text-sm font-semibold tabular-nums text-marca-600">
            {feitas}/{habitos.length}
          </span>
        </div>
        <ProgressBar valor={progresso(feitas, habitos.length)} rotuloAcessivel="Missões concluídas" />
        {habitos.length > 0 && feitas === habitos.length && (
          <p className="mt-3 flex items-center gap-2 rounded-2xl bg-marca-50 px-3 py-2 text-sm font-medium text-marca-700">
            <CheckCircle2 className="h-5 w-5" /> Todas as missões de hoje concluídas. Que dia!
          </p>
        )}
        <ul className="mt-3 space-y-2">
          {habitos.map((h) => {
            const ok = estaConcluidaHoje(h, hoje);
            return (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => alternarHabito(h.id)}
                  aria-pressed={ok}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left text-sm transition active:scale-[0.99] ${
                    ok ? "border-marca-200 bg-marca-50 text-slate-500" : "border-slate-200 bg-white text-slate-800"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                      ok ? "border-marca-500 bg-marca-500 text-white" : "border-slate-300"
                    }`}
                  >
                    {ok && <Check className="h-4 w-4" strokeWidth={3} />}
                  </span>
                  <span className={ok ? "line-through" : ""}>{h.descricao_habito}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
