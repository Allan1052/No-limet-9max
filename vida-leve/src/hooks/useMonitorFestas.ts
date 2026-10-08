import { useEffect } from "react";
import { useConquistas } from "../store/derivados";
import { missoesDoDia, useAppStore } from "../store/useAppStore";
import { useFesta } from "../store/useFesta";
import { usePreferencias } from "../store/usePreferencias";

/** Dispara a comemoração quando uma meta do dia é batida ou uma conquista sai. */
export function useMonitorFestas(): void {
  const status = useAppStore((s) => s.status);
  const profile = useAppStore((s) => s.profile);
  const agua = useAppStore((s) => s.agua);
  const comida = useAppStore((s) => s.comida);
  const missoes = useAppStore((s) => s.missoes);
  const hoje = useAppStore((s) => s.hoje);
  const conquistas = useConquistas();
  const festejar = useFesta((s) => s.festejar);

  useEffect(() => {
    if (status !== "pronto" || !profile) return;
    const prefs = usePreferencias.getState();
    const jaHoje = new Set(prefs.festasDoDia.data === hoje ? prefs.festasDoDia.ids : []);
    const novas: string[] = [];
    const marcar = (id: string, emoji: string, titulo: string, texto: string) => {
      if (jaHoje.has(id)) return;
      novas.push(id);
      festejar({ emoji, titulo, texto });
    };

    if (agua.reduce((t, a) => t + a.quantidade_ml, 0) >= profile.meta_agua_ml) {
      marcar("agua", "💧", "Meta de água batida!", "Seu corpo agradece. Hidratação em dia ajuda até a controlar a fome.");
    }
    const deHoje = missoesDoDia(missoes, hoje);
    if (deHoje.length > 0 && deHoje.every((m) => m.concluido_hoje)) {
      marcar("missoes", "🎯", "Todas as missões feitas!", "Dia completo. É assim, uma missão por vez, que o hábito fica.");
    }
    if (comida.reduce((t, c) => t + c.proteina_g, 0) >= profile.meta_proteina_g) {
      marcar("proteina", "💪", "Proteína batida!", "Proteína ajuda a manter os músculos enquanto você emagrece.");
    }

    const vistas = new Set(prefs.conquistasVistas);
    const recentes = conquistas.filter((c) => c.desbloqueada && !vistas.has(c.id));
    if (recentes.length > 2) {
      festejar({
        emoji: "🏅",
        titulo: `${recentes.length} conquistas desbloqueadas!`,
        texto: recentes.map((c) => `${c.emoji} ${c.titulo}`).join(" · "),
      });
    } else {
      for (const c of recentes) festejar({ emoji: c.emoji, titulo: `Conquista: ${c.titulo}`, texto: c.descricao });
    }

    if (novas.length || recentes.length) {
      prefs.atualizar({
        festasDoDia: { data: hoje, ids: [...jaHoje, ...novas] },
        conquistasVistas: [...vistas, ...recentes.map((c) => c.id)],
      });
    }
  }, [status, profile, agua, comida, missoes, hoje, conquistas, festejar]);
}
