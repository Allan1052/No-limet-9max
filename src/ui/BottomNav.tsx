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
import "./bottomNavFocus.css";

export type AppView =
  | "hoje"
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

type Hub = {
  id: string;
  icon: string;
  labelKey?: TransKey;
  label?: string;
  views: AppView[];
};

const ADVANCED_VIEWS: AppView[] = ["icm", "drill", "ft"];

export const HUBS: Hub[] = [
  { id: "hoje", icon: "🏠", labelKey: "nav.today", views: ["hoje"] },
  // Rodada 4: Treinar abre primeiro a vitrine de treinos. A mesa continua disponível
  // como opção do hub, mas nunca captura o usuário automaticamente.
  { id: "treinar", icon: "🎯", labelKey: "nav.train", views: ["treino", "play", "torneio", "campanha", "ultra", "ft", "drill"] },
  { id: "estudar", icon: "📚", labelKey: "nav.study", views: ["suamao", "anatomia", "ranges", "aprenda", "icm"] },
  { id: "perfil", icon: "☰", label: "Perfil", views: ["perfil", "ranking", "missoes", "importar"] },
];

const SUB_LABEL: Record<AppView, TransKey> = {
  hoje: "nav.today",
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
          className={`bn-item${activeHub === h.id ? " on" : ""}${h.id === "hoje" ? " bn-primary" : ""}`}
          onClick={() => setView(h.views[0])}
          aria-current={activeHub === h.id ? "page" : undefined}
        >
          <span className="bn-ic">{h.icon}</span>
          <span className="bn-l">{h.label ?? t(h.labelKey!)}</span>
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
  info?: ReactNode;
}) {
  const { t } = useT();
  const hub = hubForView(view);
  const testUnlocked = isDevUnlocked("rua2026");
  const hiddenViews: AppView[] = testUnlocked ? [] : ["drill", "street"];
  const hubViews = hub.views.filter((v) => !hiddenViews.includes(v));
  const primaryViews = hubViews.filter((v) => !ADVANCED_VIEWS.includes(v));
  const advancedViews = hubViews.filter((v) => ADVANCED_VIEWS.includes(v));

  if (hubViews.length < 2) return null;
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
              if (advancedViews.includes(view)) setView(primaryViews[0]);
              else setView(advancedViews[0]);
            }}
          >
            <span className="hub-chip-adv-label">Mais </span>⋯
          </button>
        )}
      </div>
      {info ? <div className="hub-info">{info}</div> : null}
    </div>
  );
}
