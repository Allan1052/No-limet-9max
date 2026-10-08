import { useEffect } from "react";
import { repository } from "../data";
import { useSequencias } from "../store/derivados";
import { missoesDoDia, placarDoDia, useAppStore } from "../store/useAppStore";
import { usePreferencias } from "../store/usePreferencias";

/** Modo dupla: publica o resumo do dia (com atraso, para não gravar a cada toque). */
export function usePublicarResumo(): void {
  const estado = useAppStore();
  const compartilharKg = usePreferencias((s) => s.compartilharKg);
  const seq = useSequencias();
  const { status, profile, hoje, missoes, publicarResumo } = estado;
  const placar = placarDoDia(estado);

  useEffect(() => {
    if (!repository.suportaParceiros || status !== "pronto" || !profile || !seq) return;
    const deHoje = missoesDoDia(missoes, hoje);
    const id = setTimeout(() => {
      void publicarResumo({
        atualizado_em: new Date().toISOString(),
        pct_dia: Math.round(placar.total * 100) / 100,
        sequencia_agua: seq.agua,
        sequencia_missoes: seq.missoes,
        missoes_hoje: deHoje.filter((m) => m.concluido_hoje).length,
        missoes_total_hoje: deHoje.length,
        kg_perdidos: compartilharKg ? Math.round((profile.peso_inicial - profile.peso_atual) * 10) / 10 : null,
      });
    }, 3000);
    return () => clearTimeout(id);
  }, [status, profile, hoje, missoes, seq, placar.total, compartilharKg, publicarResumo]);
}
