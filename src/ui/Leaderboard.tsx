// ---------------------------------------------------------------------------
// Ranking — placar REAL com Supabase + anti-cheat (hash verification)
// Sem nomes de exemplo: se ninguém pontuou ainda, mostra o convite
// "seja o primeiro". Todo nome exibido aqui é jogador de verdade.
// ---------------------------------------------------------------------------
import { useState, useEffect } from "react";
import { useT } from "../i18n";
import {
  fetchTournamentLeaderboard,
  fetchMissionLeaderboard,
  getPlayerKey,
} from "../lib/ranking";

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

const AV = ["🦈", "🎩", "🧊", "👁️", "🌵", "🔥", "🌊", "🃏", "🎯", "🐺", "👑", "💀"];
const MEDAL = ["🥇", "🥈", "🥉"];

export function Leaderboard() {
  const { t: tr } = useT();
  const [activeTab, setActiveTab] = useState<"tourney" | "mission">("tourney");
  const [activeTier, setActiveTier] = useState<Tier>("micro");
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        let raw: Array<{ nickname: string; points: number; player_key: string }>;
        if (activeTab === "tourney") {
          const data = await fetchTournamentLeaderboard(activeTier, 50);
          raw = data.map((d) => ({ ...d, points: d.points }));
        } else {
          const data = await fetchMissionLeaderboard(50);
          raw = data.map((d) => ({ ...d, points: d.stages_cleared }));
        }

        if (cancelled) return;

        const myKey = getPlayerKey();
        setEntries(
          raw.map((d, i) => ({
            rank: i + 1,
            nickname: d.nickname,
            points: d.points,
            isHero: d.player_key === myKey,
          }))
        );
      } catch (err) {
        if (cancelled) return;
        console.error("Erro ao carregar ranking:", err);
        setError("Não consegui falar com o servidor do placar agora.");
        setEntries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [activeTab, activeTier]);

  const isEmpty = !loading && entries.length === 0;

  return (
    <div className="train-view">
      <div className="panel lb-panel">
        <div className="ultra-badge">🏆 {tr("tab.ranking")}</div>
        <h3>
          {activeTab === "tourney" ? tr("rank.tourneyTab") : tr("rank.missionTab")}
        </h3>
        <p className="ultra-sub">
          {activeTab === "tourney" ? tr("rank.tourneySub") : tr("rank.missionSub")}
        </p>

        {/* Selo: o placar agora é sempre real */}
        <div className="lb-seal-row">
          <span className="lb-verified">🛡️ {tr("rank.verified")}</span>
        </div>

        {error && <p className="lb-error">{error}</p>}

        {/* Tabs */}
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

        {/* Tiers (só para torneio) */}
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
        ) : isEmpty ? (
          <div className="lb-empty">
            <div className="lb-empty-icon">♠</div>
            <p className="lb-empty-title">{tr("rank.emptyTitle")}</p>
            <p className="lb-empty-body">{tr("rank.emptyBody")}</p>
            <div className="lb-empty-cta">{tr("rank.emptyCta")}</div>
          </div>
        ) : (
          <ol className="lb-list">
            {entries.map((e, i) => (
              <li key={`${e.nickname}-${i}`} className={`lb-row${e.isHero ? " me" : ""}`}>
                <span className="lb-pos">{e.rank <= 3 ? MEDAL[e.rank - 1] : e.rank}</span>
                <span className="lb-who">
                  <span className="lb-av">{AV[i % AV.length]}</span>
                  <span className="lb-nick">
                    {e.nickname}
                    {e.isHero && <small> ← Você</small>}
                  </span>
                </span>
                <span className="lb-pts">
                  {e.points.toLocaleString("pt-BR")}
                  <small>
                    {activeTab === "tourney" ? tr("rank.points") : tr("rank.stages")}
                  </small>
                </span>
              </li>
            ))}
          </ol>
        )}

        {/* Rodapé */}
        <div className="lb-foot">
          <p className="lb-quote">"{tr("rank.quote")}"</p>
          <div className="lb-seal">🔒 {tr("disclaimer")}</div>
          <div className="lb-anticheat">🛡️ {tr("rank.anticheat")}</div>
        </div>
      </div>
    </div>
  );
}
