// ---------------------------------------------------------------------------
// Top 10 Premiações — o "mural de troféus" do jogador. Lista os 10 maiores
// prêmios de torneio gravados no aparelho (diário de resultados / Trophy Room).
// Cada linha: colocação + campo, torneio/buy-in e prêmio. Sem servidor —
// é o histórico pessoal do jogador, no aparelho dele.
// ---------------------------------------------------------------------------
import { topPrizes, type TournamentResultRecord } from "../app/resultsLog";

const MEDAL = ["", "🥇", "🥈", "🥉"];

const num = (n: number) => Math.round(n).toLocaleString("en-US");
// FS = fichas simuladas (abreviado nos rótulos repetitivos; o termo por extenso
// segue no subtítulo do painel, pra não perder a clareza da honestidade).
const virtualValue = (n: number) => `${num(n)} FS`;

function recLabel(rec: TournamentResultRecord): string {
  const mode = rec.mode === "circuito" ? "Circuito" : "Treino Livre";
  const stage = rec.circuitStage ? ` · Et. ${rec.circuitStage}` : "";
  return `${mode}${stage} · ${num(rec.buyIn)} FS`;
}

function dateLabel(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function TopPrizesPanel() {
  const list = topPrizes(10);

  if (list.length === 0) {
    return (
      <div className="tp-empty">
        🏆 <b>Top 10 resultados de estudo</b>
        <div className="tp-empty-sub">
          Ainda não há resultados virtuais registrados. Jogue um torneio do Circuito
          e conquiste fichas simuladas — os seus 10 maiores aparecem aqui.
        </div>
      </div>
    );
  }

  const maxCash = Math.max(...list.map((r) => r.cash));

  return (
    <div className="tp-panel">
      <div className="tp-title">🏆 Top 10 resultados de estudo</div>
      <div className="tp-sub">Seus 10 maiores resultados em fichas simuladas</div>

      <div className="tp-list">
        {list.map((rec, i) => {
          const top = i === 0 && list.length > 1;
          const medal = MEDAL[i] ?? `${i + 1}º`;
          // barra de magnitude: o nº 1 = 100%, os outros proporcionais
          const pct = Math.max(6, Math.round((rec.cash / maxCash) * 100));
          const placeWord = rec.finishPlace === 1 ? "CAMPEÃO" : `${rec.finishPlace}º de ${num(rec.entrants)}`;

          return (
            <div key={`${rec.timestamp}-${i}`} className={`tp-row ${top ? "top" : ""}`}>
              <div className="tp-rank">{medal}</div>
              <div className="tp-body">
                <div className="tp-place">{placeWord}</div>
                <div className="tp-meta">{recLabel(rec)} · {dateLabel(rec.timestamp)}</div>
                <div className="tp-bar-wrap">
                  <div className="tp-bar" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className={`tp-cash ${top ? "gold" : ""}`}>{virtualValue(rec.cash)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
