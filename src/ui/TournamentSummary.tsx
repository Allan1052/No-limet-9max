// Análise de fim de torneio: mostra como o herói jogou (resultado, estilo,
// qualidade das decisões e os erros a rever). Aparece quando o torneio termina.
//
// Aqui também acontece o registro no ranking: se o torneio foi uma etapa do
// Circuito e o jogador chegou ao dinheiro, os pontos são gravados no banco. Se
// foi Treino Livre, nada é gravado — mas mostramos quanto o resultado valeria,
// como convite honesto para o Circuito.
import { useState, useEffect, useRef } from "react";
import type { TournamentSummary as Summary } from "../app/gameController";
import type { Rating } from "../feedback/analyzer";
import { submitTournamentResult, type TournamentSubmitResult } from "../lib/ranking";
import { getNickname } from "../lib/nickname";
import { circuitStage } from "../tournament/circuit";

const RATING_LABEL: Record<string, string> = {
  boa: "Boa",
  ok: "Ok",
  imprecisa: "Imprecisa",
  ruim: "Ruim",
};

export function TournamentSummary({
  summary,
  onClose,
}: {
  summary: Summary;
  onClose: () => void;
}) {
  const champ = summary.result === "campeao";
  const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
  const num = (n: number) => Math.round(n).toLocaleString("en-US");
  const pts = (n: number) => Math.round(n).toLocaleString("pt-BR");

  // Registro no ranking: roda uma única vez por torneio encerrado.
  const [ranking, setRanking] = useState<TournamentSubmitResult | null>(null);
  const [sending, setSending] = useState(false);
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    const nickname = getNickname();
    const isCircuit = summary.mode === "circuito";

    // Sem apelido não dá para gravar no ranking (só acontece no Treino Livre).
    if (isCircuit && !nickname) return;

    setSending(true);
    submitTournamentResult({
      nickname: nickname || "",
      stage: summary.initialStage,
      entrants: summary.entrants,
      buyIn: summary.buyIn,
      finishPosition: summary.finishPlace,
      handsPlayed: summary.handsPlayed,
      handsCorrect: summary.ratings.boa + summary.ratings.ok,
      decisions: [],
      mode: summary.mode,
      circuitStage: summary.circuitStage,
    })
      .then(setRanking)
      .finally(() => setSending(false));
  }, [summary]);

  const stageInfo = summary.circuitStage ? circuitStage(summary.circuitStage) : undefined;

  // Filtro: clicar em Ok/Imprecisas/Ruins mostra as decisões daquela categoria.
  // Sem filtro (null), mostra as "mãos para rever" (imprecisa + ruim).
  const [filter, setFilter] = useState<Rating | null>(null);
  const shown = filter ? summary.review.filter((r) => r.rating === filter) : summary.mistakes;
  const toggle = (r: Rating) => setFilter((cur) => (cur === r ? null : r));

  return (
    <div className="overlay" onClick={onClose}>
      <div className="replay summary-modal" onClick={(e) => e.stopPropagation()}>
        <div className={`summary-banner ${champ ? "champ" : "out"}`}>
          {champ
            ? "🏆 Você venceu o torneio!"
            : `Você terminou em ${summary.finishPlace}º de ${num(summary.entrants)}`}
        </div>

        <div className="summary-finish">
          {summary.inMoney ? (
            <span className="itm">Prêmio: {usd(summary.cash)} 💰</span>
          ) : (
            <span className="oom">Fora do dinheiro desta vez — bola pra frente!</span>
          )}
        </div>

        {/* Painel do ranking: pontos ganhos, etapa cravada, ou o convite */}
        {summary.mode === "circuito" ? (
          <div className="rank-box">
            {sending ? (
              <div className="rank-wait">Registrando no ranking...</div>
            ) : ranking?.eligible && ranking.success ? (
              <>
                <div className="rank-pts">+{pts(ranking.points)}</div>
                <div className="rank-pts-lbl">
                  pontos no Circuito {stageInfo ? `· ${stageInfo.name}` : ""}
                </div>
                {ranking.circuitComplete ? (
                  <div className="rank-badge gold">
                    🏅 CIRCUITO COMPLETO — selo permanente no seu perfil
                  </div>
                ) : ranking.stageCleared ? (
                  <div className="rank-badge">
                    ✓ Etapa cravada — ela sai da sua lista. Próxima liberada.
                  </div>
                ) : (
                  <div className="rank-badge soft">
                    Etapa não cravada — pode tentar de novo quantas vezes quiser.
                  </div>
                )}
              </>
            ) : ranking?.reason === "no_cash" ? (
              <div className="rank-none">
                Fora do dinheiro — sem pontos nesta. Como na WSOP, só pontua quem
                chega ao dinheiro.
                <div className="rank-none-sub">
                  A etapa continua na sua lista. Tente de novo.
                </div>
              </div>
            ) : ranking && !ranking.success ? (
              <div className="rank-none">
                Não consegui falar com o servidor do ranking. Seus{" "}
                {pts(ranking.points)} pontos não foram gravados — dá pra repetir a
                etapa.
              </div>
            ) : null}
          </div>
        ) : ranking && ranking.wouldBeWorth > 0 ? (
          <div className="rank-box free">
            <div className="rank-free-lbl">Treino Livre — sem ranking</div>
            <div className="rank-free-pts">
              Esse resultado valeria <b>{pts(ranking.wouldBeWorth)} pontos</b> no
              Circuito.
            </div>
          </div>
        ) : null}

        <h3>Análise da sua jogada</h3>

        <div className="summary-stats">
          <div className="ss-item">
            <div className="ss-num">{summary.handsPlayed}</div>
            <div className="ss-lbl">mãos jogadas</div>
          </div>
          <div className="ss-item">
            <div className="ss-num">{summary.vpip}%</div>
            <div className="ss-lbl">VPIP</div>
          </div>
          <div className="ss-item">
            <div className="ss-num">{summary.pfr}%</div>
            <div className="ss-lbl">PFR</div>
          </div>
          <div className="ss-item">
            <div className="ss-num">{summary.threeBet}%</div>
            <div className="ss-lbl">3-bet</div>
          </div>
        </div>

        <div className="summary-note">
          <b>Estilo:</b> {summary.styleNote}
        </div>
        <div className="summary-note">
          <b>Decisões:</b> {summary.qualityNote}
        </div>

        <div className="summary-ratings">
          <span className="pill boa" title="As boas não são detalhadas">
            Boas {summary.ratings.boa}
          </span>
          <button
            className={`pill ok clickable ${filter === "ok" ? "active" : ""}`}
            onClick={() => toggle("ok")}
          >
            Ok {summary.ratings.ok}
          </button>
          <button
            className={`pill imprecisa clickable ${filter === "imprecisa" ? "active" : ""}`}
            onClick={() => toggle("imprecisa")}
          >
            Imprecisas {summary.ratings.imprecisa}
          </button>
          <button
            className={`pill ruim clickable ${filter === "ruim" ? "active" : ""}`}
            onClick={() => toggle("ruim")}
          >
            Ruins {summary.ratings.ruim}
          </button>
        </div>
        <div className="summary-hint">👆 toque em Ok, Imprecisas ou Ruins para ver as decisões</div>

        {shown.length > 0 ? (
          <>
            <h4>
              {filter
                ? `Decisões "${RATING_LABEL[filter]}" (${shown.length})`
                : `Mãos para rever (${shown.length})`}
            </h4>
            {shown.map((it, i) => (
              <div key={i} className={`fb-item ${it.rating}`}>
                <div className="fb-head">
                  <span>
                    {it.street}: {it.heroAction} (padrão: {it.advice})
                  </span>
                  <span className="tag">{RATING_LABEL[it.rating]}</span>
                </div>
                <div className="fb-text">{it.text}</div>
              </div>
            ))}
          </>
        ) : (
          <div className="summary-note">
            {filter
              ? `Nenhuma decisão "${RATING_LABEL[filter]}" neste torneio. 👍`
              : "Sem erros claros de EV para revisar — jogo consistente. 👏"}
          </div>
        )}

        <button className="btn primary" onClick={onClose}>
          Fechar e configurar novo torneio
        </button>
      </div>
    </div>
  );
}
