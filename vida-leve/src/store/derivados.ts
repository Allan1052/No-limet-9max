import { useMemo } from "react";
import { analisarRitmo } from "../lib/adaptive";
import { calcularConquistas, calcularSequencias, type DadosConquistas } from "../lib/conquistas";
import { planoDoPerfil, useAppStore } from "./useAppStore";

/** Dados derivados (memorizados) usados em várias telas. */
function useDadosConquistas(): DadosConquistas | null {
  const profile = useAppStore((s) => s.profile);
  const pesos = useAppStore((s) => s.pesos);
  const agua = useAppStore((s) => s.aguaTotais);
  const missoes = useAppStore((s) => s.missoes);
  const comida = useAppStore((s) => s.comidaTotais);
  return useMemo(() => (profile ? { profile, pesos, agua, missoes, comida } : null), [profile, pesos, agua, missoes, comida]);
}

export function useSequencias() {
  const dados = useDadosConquistas();
  const hoje = useAppStore((s) => s.hoje);
  return useMemo(() => (dados ? calcularSequencias(dados, hoje) : null), [dados, hoje]);
}

export function useConquistas() {
  const dados = useDadosConquistas();
  const hoje = useAppStore((s) => s.hoje);
  return useMemo(() => (dados ? calcularConquistas(dados, hoje) : []), [dados, hoje]);
}

export function useRitmoAtual() {
  const profile = useAppStore((s) => s.profile);
  const pesos = useAppStore((s) => s.pesos);
  const hoje = useAppStore((s) => s.hoje);
  return useMemo(
    () => (profile ? analisarRitmo(pesos, planoDoPerfil(profile).deficit_aplicado, hoje) : null),
    [profile, pesos, hoje],
  );
}
