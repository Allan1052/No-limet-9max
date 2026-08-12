// ---------------------------------------------------------------------------
// RANKING — placar REAL, no estilo Player of the Year da WSOP.
//
// Nada de nome de exemplo: todo apelido aqui é jogador de verdade. Se ninguém
// pontuou ainda, o placar convida a ser o primeiro.
//
// Duas janelas:
//   - MENSAL: só os resultados deste mês. Zera no dia 1º.
//   - ANUAL: os 10 melhores do ANO inteiro (não a soma dos melhores de cada mês).
//     É a leitura mais justa — premia desempenho, não presença.
//
// Cada faixa de buy-in tem o próprio ranking, para que quem joga micro dispute
// com quem joga micro.
// ---------------------------------------------------------------------------
import { useState, useEffect } from "react";
import { useT } from "../i18n";
import {
  fetchTournamentLeaderboard,
  fetchMissionLeaderboard,
  fetchPlayerTitles,
  getPlayerKey,
  type RankingPeriod,
} from "../lib/ranking";
import { BEST_RESULTS_COUNT, MIN_RESULTS_TO_QUALIFY } from "../tournament/poyPoints";
import { seasonLabel, currentSeason, currentSeasonYear } from "../tournament/circuit";

type Tier = "micro" | "baixa" | "media" | "alta";

interface LeaderboardEntry {
  nickname: string;
  points: number;
  events?: number;
  qualified?: boolean;
  isHero?: boolean;
  rank: number;
}

const TIERS: { id: Tier; label: string; buyin: string }[] = [
  { id: "micro", label: "Micro", buyin: "$5" },
  { id: "baixa", label: "Baixa", buyin: "$11" },
  { id: "media", label: "Média", buyin: "$22 e $55" },
  { id: "alta", label: "Alta", buyin: "$109" },
];

const AV = ["🦈", "🎩", "🧊", "👁️", "🌵", "🔥", "🌊", "🃏", "🎯", "🐺", "👑", "💀"];
const MEDAL = ["🥇", "🥈", "🥉"];

export function Leaderboard() {
  const { t: tr } = useT();
  const [activeTab, setActiveTab] = useState<"tourney" | "mission">("tourney");
  const [activeTier, setActiveTier] = useState<Tier>("micro");
  const [period, setPeriod] = useState<RankingPeriod>("mensal");
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [titles, setTitles] = useState<
    Array<{ title_type: string; tier: string | null; season: string | null }>
  >([]);

  useEffect(() => {
    fetchPlayerTitles().then(setTitles);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        let raw: Array<{
          nickname: string;
          points: number;
          player_key: string;
          events?: number;
          qualified?: boolean;
        }>;

        if (activeTab === "tourney") {
          raw = await fetchTournamentLeaderboard(activeTier, 50, period);
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
            events: d.events,
            qualified: d.qualified,
            isHero: d.player_key === myKey,
          })),
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
  }, [activeTab, activeTier, period]);

  const isEmpty = !loading && entries.length === 0;
  const periodLabel =
    period === "mensal" ? seasonLabel(currentSeason()) : String(currentSeasonYear());

  return (
    <div className="train-view">
      <div className="panel lb-panel">
        <div className="ultra-badge">🏆 {tr("tab.ranking")}</div>
        <h3>
          {activeTab === "tourney" ? "Ranking do Circuito" : tr("rank.missionTab")}
        </h3>
        <p className="ultra-sub">
          {activeTab === "tourney"
            ? `Seus ${BEST_RESULTS_COUNT} melhores resultados · ${periodLabel}`
            : tr("rank.missionSub")}
        </p>

        {/* Selo: o placar agora é sempre real */}
        <div className="lb-seal-row">
          <span className="lb-verified">🛡️ {tr("rank.verified")}</span>
        </div>

        {/* Selos permanentes conquistados */}
        {titles.length > 0 ? (
          <div className="lb-titles">
            {titles.map((t, i) => (
              <span key={i} className="lb-title-seal">
                🏅 Circuito {t.tier ? t.tier : ""}{" "}
                {t.season ? seasonLabel(t.season) : ""}
              </span>
            ))}
          </div>
        ) : null}

        {error && <p className="lb-error">{error}</p>}

        {/* Tabs */}
        <div className="lb-tabs">
          <button
            className={`lb-tab ${activeTab === "tourney" ? "on" : ""}`}
            onClick={() => setActiveTab("tourney")}
          >
            🏆 Circuito
          </button>
          <button
            className={`lb-tab ${activeTab === "mission" ? "on" : ""}`}
            onClick={() => setActiveTab("mission")}
          >
            🎯 {tr("rank.missionTab")}
          </button>
        </div>

        {activeTab === "tourney" ? (
          <>
            {/* Mensal / Anual */}
            <div className="lb-period">
              <button
                className={`lb-per ${period === "mensal" ? "on" : ""}`}
                onClick={() => setPeriod("mensal")}
              >
                Mensal
                <span className="lb-per-sub">{seasonLabel(currentSeason())}</span>
              </button>
              <button
                className={`lb-per ${period === "anual" ? "on" : ""}`}
                onClick={() => setPeriod("anual")}
              >
                Anual
                <span className="lb-per-sub">{currentSeasonYear()}</span>
              </button>
            </div>

            {/* Faixas de buy-in */}
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
          </>
        ) : null}

        {loading ? (
          <div className="lb-loading">{tr("rank.loading")}</div>
        ) : isEmpty ? (
          <div className="lb-empty">
            {/* Podio vazio estilizado — elegante em vez de lista crua */}
            <div className="lb-podium">
              <div className="lb-podium-step lb-podium-2">
                <div className="lb-podium-slot">🥈</div>
                <div className="lb-podium-name">...</div>
              </div>
              <div className="lb-podium-step lb-podium-1">
                <div className="lb-podium-slot">🥇</div>
                <div className="lb-podium-name">Seu nome</div>
              </div>
              <div className="lb-podium-step lb-podium-3">
                <div className="lb-podium-slot">🥉</div>
                <div className="lb-podium-name">...</div>
              </div>
            </div>
            <div className="lb-empty-icon">♠</div>
            <p className="lb-empty-title">
              {period === "anual" && activeTab === "tourney"
                ? `Nenhum resultado em ${currentSeasonYear()} nesta faixa`
                : "Seja um dos primeiros — o placar está começando"}
            </p>
            <p className="lb-empty-body">
              O Circuito é real: cada resultado seu entra aqui na hora. Dispute desde o início e veja seu nome subir.
            </p>
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
                    {e.events ? (
                      <small className="lb-events">
                        {e.events} {e.events === 1 ? "torneio" : "torneios"}
                        {activeTab === "tourney" && e.qualified === false ? (
                          <span className="lb-unqualified">
                            {" "}· faltam {MIN_RESULTS_TO_QUALIFY - e.events} p/ valer o título
                          </span>
                        ) : null}
                      </small>
                    ) : null}
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

        {/* Como funciona — evita a sensação de placar arbitrário */}
        {activeTab === "tourney" ? (
          <div className="lb-rules">
            <button className="lb-rules-toggle" onClick={() => setRulesOpen((v) => !v)}>
              {rulesOpen ? "▾" : "▸"} Como a pontuação funciona
            </button>
            {rulesOpen ? (
              <div className="lb-rules-body">
                <p>
                  A escala é a mesma do <b>Player of the Year da WSOP</b>: os pontos
                  saem de três fatores — posição final, número de{" "}
                  <b>inscritos</b> e buy-in.
                </p>
                <ul>
                  <li>
                    <b>Só o Circuito pontua.</b> Treino Livre é para treinar sem
                    pressão — e continua liberado, com qualquer nº de inscritos e
                    qualquer estágio.
                  </li>
                  <li>
                    <b>Só torneio jogado desde o início.</b> Começar na mesa final é
                    treino, não conquista.
                  </li>
                  <li>
                    <b>Só pontua quem chega ao dinheiro</b> (os 15% melhores),
                    exatamente como na WSOP.
                  </li>
                  <li>
                    <b>Vencer vale 20× o mínimo pago</b> — a razão que a WSOP fixou
                    a partir de 2018.
                  </li>
                  <li>
                    <b>Contam seus {BEST_RESULTS_COUNT} melhores resultados</b>, para
                    que ninguém vença só por jogar mais que os outros.
                  </li>
                  <li>
                    <b>Precisa de {MIN_RESULTS_TO_QUALIFY} resultados para valer o
                    título</b> — a mesma exigência da WSOP. Você joga e pontua desde
                    já; o selo de qualificado chega no {MIN_RESULTS_TO_QUALIFY}º.
                  </li>
                  <li>
                    <b>Buy-in conta, mas não domina.</b> Como na WSOP, o peso do
                    buy-in é amortecido: um torneio caro vale mais, mas longe de
                    valer "vezes o preço".
                  </li>
                  <li>
                    <b>Mensal zera no dia 1º.</b> O Anual guarda os{" "}
                    {BEST_RESULTS_COUNT} melhores do ano inteiro.
                  </li>
                  <li>
                    <b>Cada faixa tem o próprio ranking</b>, para micro disputar com
                    micro.
                  </li>
                </ul>
                <p className="lb-rules-foot">
                  Ninguém consegue apagar nem editar um resultado — nem nós. O
                  placar só aceita inclusão.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

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
