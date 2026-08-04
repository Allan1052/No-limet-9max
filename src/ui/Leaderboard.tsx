// ---------------------------------------------------------------------------
// Ranking — placar de torneios (por faixa) e da Missão 1×1.
// Reescrito no estilo do app (theme.css) pra ficar na cara da marca. Mantém a
// lógica do Supabase + fallback de exemplo com selo honesto de "prévia".
// ---------------------------------------------------------------------------
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useT } from "../i18n";

type Tier = "micro" | "baixa" | "media" | "alta";

interface LeaderboardEntry {
  nickname: string;
  points: number;
  isHero?: boolean;
  rank: number;
}

const TIERS: { id: Tier; label: string; buyin: string }[] = [
  { id: "micro", label: "Micro", buyin: "até R$5" },
  { id: "baixa", label: "Baixa", buyin: "R$5–25" },
  { id: "media", label: "Média", buyin: "R$25–100" },
  { id: "alta", label: "Alta", buyin: "R$100+" },
];

const AV = ["🦈", "🎩", "🧊", "👁️", "🌵", "🔥", "🌊", "🃏", "🎯", "🐺"];
const MEDAL = ["🥇", "🥈", "🥉"];

export function Leaderboard() {
  const { t: tr } = useT();
  const [activeTab, setActiveTab] = useState<"tourney" | "mission">("tourney");
  const [activeTier, setActiveTier] = useState<Tier>("micro");
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  // Verdadeiro quando o placar mostra dados de exemplo (sem backend real ainda).
  const [isPreview, setIsPreview] = useState(false);

  // Dados de exemplo (fallback) baseados na landing page.
  const mockEntries: Record<string, LeaderboardEntry[]> = {
    tourney: [
      { rank: 1, nickname: "Muralha_99", points: 1250 },
      { rank: 2, nickname: "PokerKing", points: 980 },
      { rank: 3, nickname: "FoldMaster", points: 870 },
      { rank: 4, nickname: "AllInMind", points: 720 },
      { rank: 5, nickname: "Bluff_BR", points: 610 },
    ],
    mission: [
      { rank: 1, nickname: "ReaperHunter", points: 9 },
      { rank: 2, nickname: "GhostFace", points: 7 },
      { rank: 3, nickname: "AceHigh", points: 6 },
      { rank: 4, nickname: "GrinderPT", points: 4 },
      { rank: 5, nickname: "NoLimit_Joe", points: 3 },
    ],
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // @ts-ignore - verificando se o supabaseUrl existe no objeto cliente
        if (!supabase.supabaseUrl) {
          setEntries(mockEntries[activeTab]);
          setIsPreview(true);
          setLoading(false);
          return;
        }

        if (activeTab === "tourney") {
          const { data, error } = await supabase
            .from("tournament_scores")
            .select(`points, players (nickname)`)
            .eq("tier", activeTier)
            .order("points", { ascending: false })
            .limit(10);
          if (error) throw error;
          const formatted = data.map((d: any, i: number) => ({
            rank: i + 1,
            nickname: d.players?.nickname || "Jogador Anonimo",
            points: d.points,
          }));
          setEntries(formatted.length > 0 ? formatted : mockEntries.tourney);
          setIsPreview(formatted.length === 0);
        } else {
          const { data, error } = await supabase
            .from("mission_progress")
            .select(`stages_cleared, players (nickname)`)
            .order("stages_cleared", { ascending: false })
            .limit(10);
          if (error) throw error;
          const formatted = data.map((d: any, i: number) => ({
            rank: i + 1,
            nickname: d.players?.nickname || "Jogador Anonimo",
            points: d.stages_cleared,
          }));
          setEntries(formatted.length > 0 ? formatted : mockEntries.mission);
          setIsPreview(formatted.length === 0);
        }
      } catch (err) {
        console.error("Erro ao carregar ranking:", err);
        setEntries(mockEntries[activeTab]);
        setIsPreview(true);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [activeTab, activeTier]);

  return (
    <div className="train-view">
      <div className="panel lb-panel">
        <div className="ultra-badge">🏆 {tr("tab.ranking")}</div>
        <h3>{activeTab === "tourney" ? tr("rank.tourneyTab") : tr("rank.missionTab")}</h3>
        <p className="ultra-sub">
          {activeTab === "tourney" ? tr("rank.tourneySub") : tr("rank.missionSub")}
        </p>

        {isPreview ? (
          <div className="lb-preview">
            <span className="lb-preview-badge">◔ {tr("rank.previewBadge")}</span>
            <span className="lb-preview-note">{tr("rank.previewNote")}</span>
          </div>
        ) : null}

        <div className="lb-tabs">
          <button
            className={`lb-tab ${activeTab === "tourney" ? "on" : ""}`}
            onClick={() => setActiveTab("tourney")}
          >
            🏆 {tr("rank.tourneyTab")}
          </button>
          <button
            className={`lb-tab ${activeTab === "mission" ? "on" : ""}`}
            onClick={() => setActiveTab("mission")}
          >
            🎯 {tr("rank.missionTab")}
          </button>
        </div>

        {activeTab === "tourney" ? (
          <div className="lb-tiers">
            {TIERS.map((t) => (
              <button
                key={t.id}
                className={`lb-tier ${activeTier === t.id ? "on" : ""}`}
                onClick={() => setActiveTier(t.id)}
              >
                {t.label}
                <span className="lb-tier-buyin">{t.buyin}</span>
              </button>
            ))}
          </div>
        ) : null}

        {loading ? (
          <div className="lb-loading">{tr("rank.loading")}</div>
        ) : (
          <ol className="lb-list">
            {entries.map((e, i) => (
              <li key={`${e.nickname}-${i}`} className={`lb-row${e.isHero ? " me" : ""}`}>
                <span className="lb-pos">{e.rank <= 3 ? MEDAL[e.rank - 1] : e.rank}</span>
                <span className="lb-who">
                  <span className="lb-av">{AV[i % AV.length]}</span>
                  <span className="lb-nick">
                    {e.nickname}
                    <small>{tr("rank.recPlayer")}</small>
                  </span>
                </span>
                <span className="lb-pts">
                  {e.points.toLocaleString("pt-BR")}
                  <small>{activeTab === "tourney" ? tr("rank.points") : tr("rank.stages")}</small>
                </span>
              </li>
            ))}
          </ol>
        )}

        <div className="lb-foot">
          <p className="lb-quote">“{tr("rank.quote")}”</p>
          <div className="lb-seal">🔒 {tr("disclaimer")}</div>
        </div>
      </div>
    </div>
  );
}
