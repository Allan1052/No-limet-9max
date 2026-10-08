import { Bell, BellOff, CalendarPlus } from "lucide-react";
import { useState } from "react";
import { baixarArquivo } from "../../lib/cardCompartilhar";
import { DIAS_SEMANA, gerarICSCheckin, type ConfigLembretes } from "../../lib/lembretes";
import { estadoPermissao, pedirPermissao, type EstadoPermissao } from "../../lib/lembretesRuntime";
import { usePreferencias } from "../../store/usePreferencias";

function Interruptor({ ligado, onChange, rotulo }: { ligado: boolean; onChange: (v: boolean) => void; rotulo: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      onClick={() => onChange(!ligado)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${ligado ? "bg-marca-600" : "bg-slate-300"}`}
    >
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${ligado ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

const horas = (de: number, ate: number) => Array.from({ length: ate - de + 1 }, (_, i) => de + i);

export function Lembretes() {
  const c = usePreferencias((s) => s.lembretes);
  const atualizar = usePreferencias((s) => s.atualizar);
  const [permissao, setPermissao] = useState<EstadoPermissao>(estadoPermissao());
  const set = (p: Partial<ConfigLembretes>) => atualizar({ lembretes: { ...c, ...p } });

  return (
    <section className="cartao space-y-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <Bell className="h-5 w-5 text-marca-600" /> Lembretes
      </h2>

      {permissao === "default" && (
        <button type="button" className="botao-primario w-full" onClick={async () => setPermissao(await pedirPermissao())}>
          <Bell className="h-5 w-5" /> Ativar notificações
        </button>
      )}
      {permissao === "denied" && (
        <p className="flex items-start gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <BellOff className="mt-0.5 h-4 w-4 shrink-0" /> Notificações bloqueadas. Libere nas configurações do navegador para este site.
        </p>
      )}
      {permissao === "nao_suportado" && (
        <p className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Este navegador não mostra notificações. No iPhone, instale o app na tela inicial (Compartilhar → Adicionar à Tela de Início).
          Os avisos dentro do app e o calendário funcionam sempre.
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Beber água</p>
          <p className="text-xs text-slate-500">Só se a meta não foi batida e você não bebeu há pouco.</p>
        </div>
        <Interruptor ligado={c.agua} onChange={(v) => set({ agua: v })} rotulo="Lembrete de água" />
      </div>
      {c.agua && (
        <div className="grid grid-cols-3 gap-2 text-sm">
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">A cada</span>
            <select className="campo px-2 py-2" value={c.aguaIntervaloH} onChange={(e) => set({ aguaIntervaloH: Number(e.target.value) })}>
              {[1, 2, 3, 4].map((h) => (
                <option key={h} value={h}>
                  {h}h
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">Das</span>
            <select className="campo px-2 py-2" value={c.inicioH} onChange={(e) => set({ inicioH: Number(e.target.value) })}>
              {horas(5, 12).map((h) => (
                <option key={h} value={h}>
                  {h}h
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">Até</span>
            <select className="campo px-2 py-2" value={c.fimH} onChange={(e) => set({ fimH: Number(e.target.value) })}>
              {horas(17, 23).map((h) => (
                <option key={h} value={h}>
                  {h}h
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div>
          <p className="text-sm font-medium">Check-in semanal</p>
          <p className="text-xs text-slate-500">Pesar sempre no mesmo dia e horário dá mais precisão.</p>
        </div>
        <Interruptor ligado={c.checkin} onChange={(v) => set({ checkin: v })} rotulo="Lembrete de check-in" />
      </div>
      {c.checkin && (
        <>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <select className="campo px-2 py-2" aria-label="Dia do check-in" value={c.diaCheckin} onChange={(e) => set({ diaCheckin: Number(e.target.value) })}>
              {DIAS_SEMANA.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
            <select className="campo px-2 py-2" aria-label="Hora do check-in" value={c.horaCheckin} onChange={(e) => set({ horaCheckin: Number(e.target.value) })}>
              {horas(5, 22).map((h) => (
                <option key={h} value={h}>
                  {h}h
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="botao-secundario w-full"
            onClick={() => baixarArquivo(new Blob([gerarICSCheckin(c)], { type: "text/calendar" }), "vida-leve-checkin.ics")}
          >
            <CalendarPlus className="h-5 w-5" /> Pôr o check-in no calendário
          </button>
          <p className="text-xs text-slate-500">
            O calendário avisa mesmo com o app fechado — ideal para o iPhone, que limita notificações de sites.
          </p>
        </>
      )}
    </section>
  );
}
