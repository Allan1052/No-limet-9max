// ---------------------------------------------------------------------------
// Navegação em 5 destinos: barra fixa embaixo (no alcance do polegar) + uma
// sub-nav contextual (os "irmãos" do destino atual). Substitui a barra de abas
// que rolava no topo. A barra some sozinha na vez do herói (auto-hide) pra os
// botões de ação ficarem com espaço total.
// ---------------------------------------------------------------------------
import type { ReactNode } from "react";
import { useT } from "../i18n";
import { isDevUnlocked } from "../lib/devLock";
import type { TransKey } from "../i18n/translations";

export type AppView =
  | "play"
  | "icm"
  | "torneio"
  | "ranges"
  | "missoes"
  | "treino"
  | "importar"
  | "ultra"
  | "suamao"
  | "campanha"
  | "aprenda"
  | "ranking"
  | "anatomia"
  | "perfil"
  | "drill"
  | "street"
  | "ft";

type Hub = { id: string; icon: string; labelKey: TransKey; views: AppView[] };

// Views avançadas que ficam escondidas atrás do botão "Mais" (pra não sobrecarregar o recreativo)
const ADVANCED_VIEWS: AppView[] = ["campanha", "icm", "drill", "ft"];

// Ordem = ordem na barra. O primeiro view de cada hub é o "destino padrão".
export const HUBS: Hub[] = [
  { id: "jogar", icon: "🃏", labelKey: "nav.play", views: ["play", "torneio"] },
  // ⚠ "street" (Rua por Rua) foi REMOVIDO da navegação (decisão do Allan, 15/08):
  // o treino sempre começa na aba "Sua Mão", que carrega a mão, a posição e o
  // stack reais do spot. O acesso solto pela sub-nav "zerava" o treino.
  { id: "treinar", icon: "🎯", labelKey: "nav.train", views: ["treino", "ultra", "drill", "suamao", "campanha", "ft"] },
  { id: "estudar", icon: "📚", labelKey: "nav.study", views: ["anatomia", "ranges", "aprenda", "icm"] },
  // Allan (18/08): a Importação de mãos saiu de dentro de Estudar (ficava escondida
  // atrás do botão ⋯) e virou aba separada na barra principal, bem visível.
  { id: "importar", icon: "📥", labelKey: "nav.import", views: ["importar"] },
  { id: "ranking", icon: "🏆", labelKey: "nav.ranking", views: ["ranking"] },
  { id: "perfil", icon: "👤", labelKey: "nav.profile", views: ["perfil", "missoes"] },
];

// Rótulo de cada sub-view (reaproveita as chaves tab.* onde faz sentido).
const SUB_LABEL: Record<AppView, TransKey> = {
  play: "tab.play",
  torneio: "tab.tournament",
  treino: "tab.train",
  ultra: "nav.sub.ultra",
  drill: "nav.sub.drill",
  street: "nav.sub.street",
  ft: "nav.sub.ft",
  suamao: "nav.sub.suamao",
  campanha: "nav.sub.campanha",
  aprenda: "nav.sub.aprenda",
  anatomia: "tab.anatomia",
  ranges: "tab.ranges",
  icm: "tab.icm",
  importar: "tab.import",
  ranking: "tab.ranking",
  perfil: "nav.profile",
  missoes: "profile.challenges",
};

export function hubForView(view: AppView): Hub {
  return HUBS.find((h) => h.views.includes(view)) ?? HUBS[0];
}

export function BottomNav({
  view,
  setView,
  hidden,
}: {
  view: AppView;
  setView: (v: AppView) => void;
  hidden?: boolean;
}) {
  const { t } = useT();
  const activeHub = hubForView(view).id;
  return (
    <nav className={`bottom-nav${hidden ? " hidden" : ""}`} aria-label="Navegação principal">
      {HUBS.map((h) => (
        <button
          key={h.id}
          className={`bn-item${activeHub === h.id ? " on" : ""}`}
          onClick={() => setView(h.views[0])}
          aria-current={activeHub === h.id ? "page" : undefined}
        >
          <span className="bn-ic">{h.icon}</span>
          <span className="bn-l">{t(h.labelKey)}</span>
        </button>
      ))}
    </nav>
  );
}

export function HubSubNav({
  view,
  setView,
  info,
}: {
  view: AppView;
  setView: (v: AppView) => void;
  /** Faixa de status à direita (ex.: HUD do torneio no play), estilo GGPoker. */
  info?: ReactNode;
}) {
  const { t } = useT();
  const hub = hubForView(view);

  // Allan (16/08): Drill (e Rua por Rua) ficam atrás da senha de teste (rua2026).
  // Com a senha destravada no Perfil, os chips aparecem; caso contrário, ficam
  // invisíveis para o público.
  const testUnlocked = isDevUnlocked("rua2026");
  const hiddenViews: AppView[] = testUnlocked ? [] : ["drill", "street"];
  const hubViews = hub.views.filter((v) => !hiddenViews.includes(v));

  // Separa views principais (visíveis) das avançadas (escondidas atrás de "Mais")
  const primaryViews = hubViews.filter((v) => !ADVANCED_VIEWS.includes(v));
  const advancedViews = hubViews.filter((v) => ADVANCED_VIEWS.includes(v));

  if (hubViews.length < 2) return null; // destino sem irmãos: sem sub-nav
  return (
    <div className="hub-subnav">
      <div className="hub-chips">
        {primaryViews.map((v) => (
          <button
            key={v}
            className={`hub-chip${view === v ? " on" : ""}`}
            onClick={() => setView(v)}
          >
            {t(SUB_LABEL[v])}
          </button>
        ))}
        {advancedViews.length > 0 && (
          <button
            className={`hub-chip${advancedViews.includes(view) ? " on" : ""}`}
            onClick={() => {
              if (advancedViews.includes(view)) {
                setView(primaryViews[0]);
              } else {
                setView(advancedViews[0]);
              }
            }}
          >
            ⋯
          </button>
        )}
      </div>
      {info ? <div className="hub-info">{info}</div> : null}
    </div>
  );
}
