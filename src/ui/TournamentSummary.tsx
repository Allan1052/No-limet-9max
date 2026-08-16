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
import { anatomyFromDecisions, type AnatomyResult } from "../tournament/anatomy";
import { STAGES } from "../tournament/structure";
import { HandShareButton } from "./HandShareButton";
import { TrophyShareButton } from "./TrophyShareButton";
import type { HandShareData, TrophyShareData } from "../app/handShareCard";

/**
 * Linha do tempo da mão final do torneio: uma entrada por rua (pré-flop→river),
 * com a ação do herói e se foi correta. Usa as decisões da última mão jogada
 * (as que têm street preenchida) para contar a história da mão decisiva.
 */
function buildTimelineFromSummary(summary: Summary): { street: string; action: string; correct: boolean }[] {
  // Pega as decisões com street preenchida (só decisões pós-feedback têm street)
  const streeted = (summary.review ?? []).filter((d) => d.street && d.street !== "Resultado");
  if (streeted.length < 2) return []; // precisa de 2+ ruas pra mostrar a timeline

  // Dedupe por rua: pega a última decisão de cada rua (na ordem do torneio)
  const byStreet = new Map<string, (typeof streeted)[0]>();
  for (const d of streeted) byStreet.set(d.street, d);

  return [...byStreet.values()].map((d) => ({
    street: d.street,
    action: d.heroAction,
    correct: d.rating === "boa" || d.rating === "ok",
  }));
}

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
  const anatomy: AnatomyResult = anatomyFromDecisions(summary.decisions ?? []);
  const a = (n: number) => `${n}%`;

  // Dados para o Hand Share Card do resultado do torneio.
  const totalRated = summary.ratings.boa + summary.ratings.ok + summary.ratings.imprecisa + summary.ratings.ruim;
  const correctPct = totalRated > 0 ? Math.round(((summary.ratings.boa + summary.ratings.ok) / totalRated) * 100) : 0;
  const modeLabel = summary.mode === "circuito" ? "Circuito" : "Treino Livre";
  const stageLabel = summary.circuitStage ? `E${summary.circuitStage}` : "";
  const shareData: HandShareData = {
    heroCards: [],
    board: [],
    heroAction: champ ? "CAMPEÃO" : `🏆 ${summary.finishPlace}º LUGAR`,
    coachAction: "PARABÉNS",
    rating: "boa",
    coachTip: `${summary.handsPlayed} mãos · ${correctPct}% decisões corretas · VPIP ${summary.vpip}% · PFR ${summary.pfr}%`,
    street: "Resultado",
    tournamentInfo: `${modeLabel} ${stageLabel} · Buy-in $${summary.buyIn} · ${num(summary.entrants)} inscritos`,
    tournamentResult: champ ? "🏆 CAMPEÃO" : `${summary.finishPlace}º de ${num(summary.entrants)}`, 
    context: summary.inMoney ? `Prêmio: $${Math.round(summary.cash)}` : "Fora do dinheiro",
    // NOVOS campos (para o card compartilhado):
    position: "Mesa Final", // resultado do torneio — sem posição específica
    stackBB: "—",
    stage: STAGES[summary.initialStage]?.label ?? "Torneio",
    // Linha do tempo da mão decisiva: as ruas com feedback do replay final,
    // usando a última mão da lista de mãos jogadas no torneio.
    decisions: buildTimelineFromSummary(summary),
  };

  // Dados para o Card de Conquista (troféu): compartilhável quando chega ao
  // dinheiro ou vence — prova social da conquista do jogador.
  const trophyData: TrophyShareData = {
    tournamentInfo: summary.mode === "circuito"
      ? (summary.circuitStage ? `Circuito · Etapa ${summary.circuitStage}` : "Circuito") + ` — Buy-in $${summary.buyIn}`
      : `Treino Livre · Buy-in $${summary.buyIn}`,
    finishPlace: summary.finishPlace,
    entrants: summary.entrants,
    cash: summary.cash,
    inMoney: summary.inMoney,
  };

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
                Fora do dinheiro — sem pontos nesta. Como na WSOP, só pontua quem{' '}
                chega ao ITM{' '}
                {ranking.paidPlaces != null
                  ? `(posições ${a(1)}–${a(ranking.paidPlaces)} nesta mesa)`
                  : "nesta mesa"}
                .{' '}
                {ranking.wouldBeWorth > 0 ? (
                  <span className="rank-wouldbe">
                    Este resultado valeria {pts(ranking.wouldBeWorth)} pontos — faltou
                    um pouco pro pódio.
                  </span>
                ) : (
                  <span className="rank-wouldbe">Faltou um pouco pro pódio.</span>
                )}
                <div className="rank-none-sub">
                  A etapa continua na sua lista. Na próxima, o ITM é seu.
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
            <div className="ss-lbl">mãos disputadas</div>
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

        {/* Anatomia do torneio — o raio-X Fold/Call/Raise/Re-raise. */}
        <div className="anatomy-box">
          <div className="anatomy-title">Sua anatomia neste torneio</div>
          <div className="anatomy-sub">Quando você decidiu, o que você fez:</div>
          <div className="anatomy-bars">
            <div className="an-row">
              <span className="an-lbl">Fold</span>
              <div className="an-track">
                <div className="an-fill fold" style={{ width: `${Math.max(anatomy.foldPct, 2)}%` }} />
              </div>
              <span className="an-num">{a(anatomy.foldPct)}</span>
            </div>
            <div className="an-row">
              <span className="an-lbl">Call</span>
              <div className="an-track">
                <div className="an-fill call" style={{ width: `${Math.max(anatomy.callPct, 2)}%` }} />
              </div>
              <span className="an-num">{a(anatomy.callPct)}</span>
            </div>
            <div className="an-row">
              <span className="an-lbl">Raise</span>
              <div className="an-track">
                <div className="an-fill raise" style={{ width: `${Math.max(anatomy.raisePct, 2)}%` }} />
                {anatomy.counts.reRaises > 0 && (
                  <div className="an-reraise" title={`${anatomy.counts.reRaises} re-raises`}>↕ {anatomy.counts.reRaises}</div>
                )}
              </div>
              <span className="an-num">{a(anatomy.raisePct)}</span>
            </div>
          </div>
          <div className="anatomy-ref">
            Padrão de torneio: Fold {anatomy.ref.fold}% · Call {anatomy.ref.call}% · Raise {anatomy.ref.raise}%
            {anatomy.counts.reRaises > 0 && ` · Você fez ${anatomy.counts.reRaises} re-raise`}
          </div>
          <div className="anatomy-note">{anatomy.note}</div>
          <div className="anatomy-fine">{anatomy.finePrint}</div>
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

        {/* Compartilhar resultado do torneio */}
        <div style={{ marginTop: 14, textAlign: "center" }}>
          <HandShareButton
            data={shareData}
            label="📤 Compartilhar resultado"
            className="btn primary"
          />
        </div>

        {/* Card de Conquista (troféu): só quando chega ao dinheiro ou vence */}
        {summary.inMoney && (
          <div style={{ marginTop: 8, textAlign: "center" }}>
            <TrophyShareButton
              data={trophyData}
              label={champ ? "🏆 Compartilhar conquista" : "🏆 Compartilhar resultado"}
              className="btn primary"
            />
          </div>
        )}

        <button className="btn primary" onClick={onClose} style={{ marginTop: 10 }}>
          Fechar e configurar novo torneio
        </button>
      </div>
    </div>
  );
}
