// ---------------------------------------------------------------------------
// Navegação em 5 destinos: barra fixa embaixo (no alcance do polegar) + uma
// sub-nav contextual (os "irmãos" do destino atual). Substitui a barra de abas
// que rolava no topo. A barra some sozinha na vez do herói (auto-hide) pra os
// botões de ação ficarem com espaço total.
// ---------------------------------------------------------------------------
import { useT } from "../i18n";
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
  | "campanha"
  | "ranking"
  | "anatomia";

type Hub = { id: string; icon: string; labelKey: TransKey; views: AppView[] };

// Ordem = ordem na barra. O primeiro view de cada hub é o "destino padrão".
export const HUBS: Hub[] = [
  { id: "jogar", icon: "🃏", labelKey: "nav.play", views: ["play", "torneio"] },
  { id: "treinar", icon: "🎯", labelKey: "nav.train", views: ["treino", "ultra", "campanha"] },
  { id: "estudar", icon: "📚", labelKey: "nav.study", views: ["anatomia", "ranges", "icm", "importar"] },
  { id: "ranking", icon: "🏆", labelKey: "nav.ranking", views: ["ranking"] },
  { id: "perfil", icon: "👤", labelKey: "nav.profile", views: ["missoes"] },
];

// Rótulo de cada sub-view (reaproveita as chaves tab.* onde faz sentido).
const SUB_LABEL: Record<AppView, TransKey> = {
  play: "tab.play",
  torneio: "tab.tournament",
  treino: "tab.train",
  ultra: "nav.sub.ultra",
  campanha: "nav.sub.campanha",
  anatomia: "tab.anatomia",
  ranges: "tab.ranges",
  icm: "tab.icm",
  importar: "tab.import",
  ranking: "tab.ranking",
  missoes: "tab.missions",
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
}: {
  view: AppView;
  setView: (v: AppView) => void;
}) {
  const { t } = useT();
  const hub = hubForView(view);
  if (hub.views.length < 2) return null; // destino sem irmãos: sem sub-nav
  return (
    <div className="hub-subnav">
      {hub.views.map((v) => (
        <button
          key={v}
          className={`hub-chip${view === v ? " on" : ""}`}
          onClick={() => setView(v)}
        >
          {t(SUB_LABEL[v])}
        </button>
      ))}
    </div>
  );
}
