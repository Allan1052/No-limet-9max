import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { BottomNav } from "./components/BottomNav";
import { Comemoracao } from "./components/Comemoracao";
import { ToastErro } from "./components/Toast";
import { useMonitorFestas } from "./hooks/useMonitorFestas";
import { usePublicarResumo } from "./hooks/usePublicarResumo";
import { useTema } from "./hooks/useTema";
import { useLembretes } from "./lib/lembretesRuntime";
import { supabase } from "./lib/supabase";
import { AuthScreen } from "./screens/AuthScreen";
import { Comida } from "./screens/Comida";
import { Dashboard } from "./screens/Dashboard";
import { Onboarding } from "./screens/Onboarding";
import { Profile } from "./screens/Profile";
import { Progresso } from "./screens/Progresso";
import { useAppStore, type Aba } from "./store/useAppStore";
import { usePreferencias } from "./store/usePreferencias";

const ABAS: readonly Aba[] = ["inicio", "comida", "progresso", "perfil"];

export default function App() {
  const status = useAppStore((s) => s.status);
  const aba = useAppStore((s) => s.aba);
  const iniciar = useAppStore((s) => s.iniciar);

  useTema();
  useLembretes();
  useMonitorFestas();
  usePublicarResumo();

  useEffect(() => {
    void iniciar();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "SIGNED_OUT" || evento === "SIGNED_IN") void iniciar();
    });
    return () => data.subscription.unsubscribe();
  }, [iniciar]);

  // Volta para o app depois de horas (ex.: dia seguinte) → recarrega o dia.
  useEffect(() => {
    const aoVoltar = () => {
      if (document.visibilityState === "visible" && useAppStore.getState().status === "pronto") void iniciar();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => document.removeEventListener("visibilitychange", aoVoltar);
  }, [iniciar]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [aba]);

  // Atalhos do ícone do app (manifest "shortcuts"): ?aba=progresso, ?acao=agua
  const atalhoFeito = useRef(false);
  useEffect(() => {
    if (status !== "pronto" || atalhoFeito.current) return;
    atalhoFeito.current = true;
    const q = new URLSearchParams(window.location.search);
    const alvo = q.get("aba") as Aba | null;
    if (alvo && ABAS.includes(alvo)) useAppStore.getState().irPara(alvo);
    if (q.get("acao") === "agua") {
      const copos = usePreferencias.getState().copos;
      void useAppStore.getState().adicionarAgua(copos[1] ?? copos[0] ?? 250);
    }
    if (q.toString()) window.history.replaceState(null, "", window.location.pathname);
  }, [status]);

  return (
    <>
      <ToastErro />
      <Comemoracao />
      {status === "carregando" && (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-gradient-to-br from-marca-600 to-sky-600 text-white">
          <img src="/icon-maskable-512.png" alt="" className="h-24 w-24 rounded-[28px] shadow-xl" />
          <p className="text-2xl font-bold">Vida Leve</p>
          <Loader2 className="h-6 w-6 animate-spin opacity-80" />
        </div>
      )}
      {status === "login" && <AuthScreen />}
      {status === "onboarding" && <Onboarding />}
      {status === "pronto" && (
        <>
          <main className="pt-seguro mx-auto max-w-md px-4 pb-28">
            {aba === "inicio" && <Dashboard />}
            {aba === "comida" && <Comida />}
            {aba === "progresso" && <Progresso />}
            {aba === "perfil" && <Profile />}
          </main>
          <BottomNav />
        </>
      )}
    </>
  );
}
