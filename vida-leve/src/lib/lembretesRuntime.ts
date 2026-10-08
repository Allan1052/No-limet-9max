import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import { usePreferencias } from "../store/usePreferencias";
import { hojeISO } from "./dates";
import { deveLembrarAgua, deveLembrarCheckin } from "./lembretes";

/**
 * Agendador de lembretes. Limite honesto de um app web SEM servidor:
 * - Com o app aberto ou em segundo plano: notificações confiáveis (este hook).
 * - Com o app instalado no Android (Chrome): o service worker também acorda
 *   periodicamente ("periodic background sync") e lembra da água.
 * - Com o app totalmente fechado (principalmente iPhone): use o lembrete de
 *   calendário (.ics) para o check-in semanal.
 */

export type EstadoPermissao = "nao_suportado" | "default" | "granted" | "denied";

export function estadoPermissao(): EstadoPermissao {
  if (typeof Notification === "undefined") return "nao_suportado";
  return Notification.permission;
}

export async function pedirPermissao(): Promise<EstadoPermissao> {
  if (typeof Notification === "undefined") return "nao_suportado";
  const r = await Notification.requestPermission();
  if (r === "granted") await registrarSyncPeriodico();
  return r;
}

async function mostrar(titulo: string, corpo: string, tag: string): Promise<void> {
  if (estadoPermissao() !== "granted") return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const opcoes: NotificationOptions = { body: corpo, tag, icon: "/icon-192.png", badge: "/icon-192.png" };
    if (reg) await reg.showNotification(titulo, opcoes);
    else new Notification(titulo, opcoes);
  } catch {
    /* sem notificação neste navegador */
  }
}

interface RegistroComSync extends ServiceWorkerRegistration {
  periodicSync?: { register: (tag: string, o: { minInterval: number }) => Promise<void> };
}

async function registrarSyncPeriodico(): Promise<void> {
  try {
    const reg = (await navigator.serviceWorker?.ready) as RegistroComSync | undefined;
    await reg?.periodicSync?.register("lembrete-agua", { minInterval: 2 * 36e5 });
  } catch {
    /* não suportado (iPhone, desktop): segue com os outros meios */
  }
}

/** O service worker não lê o localStorage: espelhamos o necessário no Cache. */
async function espelharParaSW(dados: unknown): Promise<void> {
  try {
    const cache = await caches.open("vida-leve-config");
    await cache.put("/__lembretes.json", new Response(JSON.stringify(dados), { headers: { "Content-Type": "application/json" } }));
  } catch {
    /* sem Cache Storage */
  }
}

export function useLembretes(): void {
  useEffect(() => {
    const verificar = () => {
      const s = useAppStore.getState();
      const prefs = usePreferencias.getState();
      if (s.status !== "pronto" || !s.profile) return;
      const agora = new Date();
      const hoje = hojeISO(agora);
      const total = s.agua.reduce((t, a) => t + a.quantidade_ml, 0);
      const ultimaAgua = s.agua.at(-1);

      void espelharParaSW({
        config: prefs.lembretes,
        data: hoje,
        total,
        meta: s.profile.meta_agua_ml,
        ultimo: ultimaAgua?.created_at ?? null,
      });

      const bloco = deveLembrarAgua(
        agora,
        prefs.lembretes,
        total,
        s.profile.meta_agua_ml,
        ultimaAgua ? new Date(ultimaAgua.created_at) : null,
        prefs.ultimoBlocoAgua,
      );
      if (bloco) {
        prefs.atualizar({ ultimoBlocoAgua: bloco });
        const falta = ((s.profile.meta_agua_ml - total) / 1000).toFixed(1).replace(".", ",");
        void mostrar("💧 Hora de beber água", `Faltam ${falta} L para a meta de hoje. Um copo agora?`, "agua");
      }

      if (deveLembrarCheckin(agora, prefs.lembretes, s.pesos.at(-1)?.data_registro ?? null, hoje, prefs.ultimoAvisoCheckin === hoje)) {
        prefs.atualizar({ ultimoAvisoCheckin: hoje });
        void mostrar("⚖️ Dia de check-in!", "Pese-se e o Vida Leve recalcula seu plano.", "checkin");
      }
    };
    verificar();
    const id = setInterval(verificar, 60_000);
    if (estadoPermissao() === "granted") void registrarSyncPeriodico();
    return () => clearInterval(id);
  }, []);
}
