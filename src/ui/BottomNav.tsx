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

// Views avançadas que ficam escondidas atrás do botão "Mais" (pra não sobrecarregar o recreativo)
const ADVANCED_VIEWS: AppView[] = ["icm", "drill", "ft"];

// ⚠ REESTRUTURAÇÃO (decisão do Allan): as 5 abas viraram 3 + Perfil, com a home
// "Hoje" (Mão do dia) como porta de entrada. Fim do "empurra aba, aba, aba".
// Mapa completo: docs/REESTRUTURACAO-NAV.md. NADA foi apagado — só reorganizado.
//
// Estrutura ANTERIOR (5 abas), preservada pra reverter numa linha se preciso:
//   { id: "jogar",   icon: "🃏",  labelKey: "nav.play",       views: ["play", "torneio"] },
//   { id: "treinar", icon: "🎯",  labelKey: "nav.train",      views: ["treino", "ultra", "drill", "campanha", "ft"] },
//   { id: "suamao",  icon: "♠",   labelKey: "nav.sub.suamao", views: ["suamao"] },
//   { id: "estudar", icon: "📚",  labelKey: "nav.study",      views: ["anatomia", "ranges", "aprenda", "icm"] },
//   { id: "mais",    icon: "•••", label: "Mais",              views: ["importar", "ranking", "perfil", "missoes"] },
//
// ⚠ "street" (Rua por Rua) segue REMOVIDO da navegação (decisão do Allan, 15/08):
// o treino começa na "Sua Mão", que carrega mão/posição/stack reais do spot.
//
// Ordem = ordem na barra. O primeiro view de cada hub é o "destino padrão".
// Hoje (porta de entrada) → Treinar (pratica) → Estudar (entende) → Perfil.
export const HUBS: Hub[] = [
  { id: "hoje", icon: "🏠", labelKey: "nav.today", views: ["hoje"] },
  // Treinar: o Circuito (campanha) fica AQUI e VISÍVEL — o Allan gosta de jogar
  // pra treinar. Torneio 1×1 e treinos entram junto; ft/drill ficam em "Mais".
  { id: "treinar", icon: "🎯", labelKey: "nav.train", views: ["play", "torneio", "treino", "campanha", "ultra", "ft", "drill"] },
  { id: "estudar", icon: "📚", labelKey: "nav.study", views: ["suamao", "anatomia", "ranges", "aprenda", "icm"] },
  // Perfil (canto): ranking, missões e importar deixam de competir com a jornada.
  { id: "perfil", icon: "☰", label: "Perfil", views: ["perfil", "ranking", "missoes", "importar"] },
];

// Rótulo de cada sub-view (reaproveita as chaves tab.* onde faz sentido).
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
            <span className="hub-chip-adv-label">Mais </span>⋯
          </button>
        )}
      </div>
      {info ? <div className="hub-info">{info}</div> : null}
    </div>
  );
}
