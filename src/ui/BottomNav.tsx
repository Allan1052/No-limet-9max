// ---------------------------------------------------------------------------
// Navegação em 5 destinos: barra fixa embaixo (no alcance do polegar) + uma
// sub-nav contextual (os "irmãos" do destino atual). Substitui a barra de abas
// que rolava no topo. A barra some sozinha na vez do herói (auto-hide) pra os
// botões de ação ficarem com espaço total.
// ---------------------------------------------------------------------------
import type { ReactNode } from "react";
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
  | "suamao"
  | "campanha"
  | "ranking"
  | "anatomia"
  | "perfil"
  | "drill"
  | "street";

type Hub = { id: string; icon: string; labelKey: TransKey; views: AppView[] };

// Views avançadas que ficam escondidas atrás do botão "Mais" (pra não sobrecarregar o recreativo)
const ADVANCED_VIEWS: AppView[] = ["campanha", "icm", "importar", "drill"];

// Ordem = ordem na barra. O primeiro view de cada hub é o "destino padrão".
export const HUBS: Hub[] = [
  { id: "jogar", icon: "🃏", labelKey: "nav.play", views: ["play", "torneio"] },
  // ⚠ "street" (Rua por Rua) foi REMOVIDO da navegação (decisão do Allan, 15/08):
  // o treino sempre começa na aba "Sua Mão", que carrega a mão, a posição e o
  // stack reais do spot. O acesso solto pela sub-nav "zerava" o treino.
  { id: "treinar", icon: "🎯", labelKey: "nav.train", views: ["treino", "ultra", "drill", "suamao", "campanha"] },
  { id: "estudar", icon: "📚", labelKey: "nav.study", views: ["anatomia", "ranges", "icm", "importar"] },
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
  suamao: "nav.sub.suamao",
  campanha: "nav.sub.campanha",
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

  // Separa views principais (visíveis) das avançadas (escondidas atrás de "Mais")
  const primaryViews = hub.views.filter((v) => !ADVANCED_VIEWS.includes(v));
  const advancedViews = hub.views.filter((v) => ADVANCED_VIEWS.includes(v));

  if (hub.views.length < 2) return null; // destino sem irmãos: sem sub-nav
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
