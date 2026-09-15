// Análise de fim de torneio: mostra como o herói jogou (resultado, estilo,
// qualidade das decisões e os erros a rever). Aparece quando o torneio termina.
//
// Aqui também acontece o registro no ranking: se o torneio foi uma etapa do
// Circuito e o jogador chegou ao dinheiro, os pontos são gravados no banco. Se
// foi Treino Livre, nada é gravado — mas mostramos quanto o resultado valeria,
// como convite honesto para o Circuito.
import "./soloScore.css";
import { useState, useEffect, useRef } from "react";
import type { TournamentSummary as Summary } from "../app/gameController";
import type { Rating } from "../feedback/analyzer";
import { submitTournamentResult, type TournamentSubmitResult } from "../lib/ranking";
import { getNickname } from "../lib/nickname";
import { circuitStage } from "../tournament/circuit";
import { anatomyFromDecisions, type AnatomyResult } from "../tournament/anatomy";
import { STAGES } from "../tournament/structure";
import { HandShareButton } from "./HandShareButton";
import type { HandShareData } from "../app/handShareCard";
import { PositionTendencyList } from "./PositionTendencyList";
import { compararComOPadrao, compararComESemDica } from "../tournament/comparativo";
import { reportFromRecords } from "../train/positionTendency";
import "./soloScore.css";

/**
 * Linha do tempo da mão final do torneio: uma entrada por rua (pré-flop→river),
 * com a ação do herói e se foi correta. Usa as decisões da última mão jogada
 * (as que têm street preenchida) para contar a história da mão decisiva.
 */
function buildTimelineFromSummary(summary: Summary): { street: string; action: string; correct: boolean }[] {
  const streeted = (summary.review ?? []).filter((d) => d.street && d.street !== "Resultado");
  if (streeted.length < 2) return [];

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
  onNewHand,
  sessaoSozinho,
}: {
  summary: Summary;
  onClose: () => void;
  onNewHand?: () => void;
  /** Decisões desta sessão jogadas SEM dica nenhuma (modo "Jogar sozinho"). */
  sessaoSozinho?: { total: number; certas: number };
}) {
  const champ = summary.result === "campeao";
  const virtualValue = (n: number) => `${Math.round(n).toLocaleString("pt-BR")} fichas simuladas`;
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
    if (isCircuit && !nickname) return;

    setSending(true);
    const detail = summary.decisionsDetail ?? [];
    const decisions = detail.length
      ? detail.map((d) => ({ hand: d.hand, action: d.action, position: d.position }))
      : [];
    submitTournamentResult({
      nickname: nickname || "",
      stage: summary.initialStage,
      entrants: summary.entrants,
      buyIn: summary.buyIn,
      finishPosition: summary.finishPlace,
      handsPlayed: summary.handsPlayed,
      handsCorrect: summary.ratings.boa + summary.ratings.ok,
      decisions,
      mode: summary.mode,
      circuitStage: summary.circuitStage,
    })
      .then(setRanking)
      .finally(() => setSending(false));
  }, [summary]);

  const stageInfo = summary.circuitStage ? circuitStage(summary.circuitStage) : undefined;
  const anatomy: AnatomyResult = anatomyFromDecisions(summary.decisions ?? []);
  const a = (n: number) => `${n}%`;

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
    tournamentInfo: `${modeLabel} ${stageLabel} · Faixa didática ${summary.buyIn} fichas · ${num(summary.entrants)} participantes`,
    tournamentResult: champ ? "🏆 CAMPEÃO" : `${summary.finishPlace}º de ${num(summary.entrants)}`,
    context: summary.inMoney ? `Resultado: ${virtualValue(summary.cash)}` : "Fora da faixa pontuável",
    position: "Mesa Final",
    stackBB: "—",
    stage: STAGES[summary.initialStage]?.label ?? "Torneio",
    decisions: buildTimelineFromSummary(summary),
  };

  const [filter, setFilter] = useState<Rating | null>(null);
  // VOCÊ × O PADRÃO, nas mesmas mãos. Quando a maior parte do torneio correu às
  // cegas, o recorte "sem dica" é o que interessa — é o jogo dele de verdade.
  const decisoes = summary.comparativo ?? [];
  const semDicaN = decisoes.filter((x) => x.semDica).length;
  const soCegas = semDicaN >= Math.max(20, decisoes.length * 0.6);
  const comp = compararComOPadrao(decisoes, soCegas ? { semDica: true } : undefined);
  const dicas = compararComESemDica(
    summary.semDica?.total ?? sessaoSozinho?.total ?? 0,
    summary.semDica?.certas ?? sessaoSozinho?.certas ?? 0,
    summary.comDica?.total ?? 0,
    summary.comDica?.certas ?? 0,
  );
  const shown = filter ? summary.review.filter((r) => r.rating === filter) : summary.mistakes;
  const toggle = (r: Rating) => setFilter((cur) => (cur === r ? null : r));

  return (
    <div className="overlay" onClick={onClose}>
      <div className="replay summary-modal" onClick={(e) => e.stopPropagation()}>
        {/* 🐞 14/09/2026: "4º de 100" — com prêmio — vinha no vermelho de
            eliminação. Terminar na faixa premiada não é derrota; a cor tem de
            dizer a mesma coisa que o número logo abaixo. */}
        <div className={`summary-banner ${champ ? "champ" : summary.inMoney ? "itm" : "out"}`}>
          {champ
            ? "🏆 Você venceu o torneio!"
            : `Você terminou em ${summary.finishPlace}º de ${num(summary.entrants)}`}
        </div>

        <div className="summary-finish">
          {summary.inMoney ? (
            <span className="itm">Resultado: {virtualValue(summary.cash)} · sem dinheiro real</span>
          ) : (
            <span className="oom">Fora da faixa pontuável desta vez — bola pra frente!</span>
          )}
        </div>

        {/* "JOGAR SOZINHO" — agora com os DOIS lados. Mostrar só "81 de 99"
            não dizia se o jogador vai melhor ou pior quando a dica some, que é
            a única pergunta que esse modo existe para responder (pedido do
            Allan, 14/09/2026). Quando falta amostra de um dos lados, o texto
            diz isso em vez de inventar uma comparação. */}
        {sessaoSozinho && sessaoSozinho.total > 0 ? (
          <div className="summary-solo">
            <span className="summary-solo-rot">🙈 Jogando sozinho nesta sessão</span>
            <b>
              {sessaoSozinho.certas} de {sessaoSozinho.total} decisões no padrão
              {dicas.semDica.total > 0 ? ` (${dicas.semDica.pct}%)` : ""}
            </b>
            {dicas.confiavel ? (
              <div className="solo-vs">
                <span className="solo-vs-lado">
                  <i>Às cegas</i>
                  <b>{dicas.semDica.pct}%</b>
                  <small>{dicas.semDica.total} decisões</small>
                </span>
                <span className="solo-vs-sep">×</span>
                <span className="solo-vs-lado">
                  <i>Com a dica</i>
                  <b>{dicas.comDica.pct}%</b>
                  <small>{dicas.comDica.total} decisões</small>
                </span>
              </div>
            ) : null}
            <span className="summary-solo-sub">{dicas.leitura}</span>
          </div>
        ) : null}

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
                Fora da faixa pontuável — sem pontos nesta. Nesta regra didática, só pontua quem{" "}
                chega ao top da etapa{" "}
                {ranking.paidPlaces != null
                  ? `(posições ${a(1)}–${a(ranking.paidPlaces)} nesta mesa)`
                  : "nesta mesa"}
                .{" "}
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
              /* 🐞 15/09/2026 — antes esta caixa dizia que os pontos "não foram
                 gravados" e mandava repetir a etapa: o jogador perdia um torneio
                 inteiro porque o 4G oscilou. Agora o resultado fica guardado no
                 aparelho e o app reenvia sozinho. */
              <div className="rank-none">
                {ranking.guardadoParaReenvio ? (
                  <>
                    <b>Seus {pts(ranking.points)} pontos estão guardados no aparelho.</b>
                    <div className="rank-none-sub">
                      Não consegui falar com o servidor do ranking agora. Não precisa
                      repetir a etapa: eu envio sozinho assim que a conexão voltar —
                      basta abrir o app ou o placar de novo.
                    </div>
                  </>
                ) : (
                  <>
                    Não consegui falar com o servidor do ranking. Seus{" "}
                    {pts(ranking.points)} pontos não foram gravados — dá pra repetir a
                    etapa.
                  </>
                )}
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

        <div className="anatomy-box">
          <div className="anatomy-title">Sua anatomia neste torneio</div>
          <div className="anatomy-sub">Em todas as mãos em que você tomou uma decisão:</div>
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
          {anatomy.counts.reRaises > 0 && (
            <div className="anatomy-ref">
              Você fez {anatomy.counts.reRaises} {anatomy.counts.reRaises === 1 ? "re-raise" : "re-raises"} neste torneio.
            </div>
          )}
          <div className="anatomy-note">{anatomy.note}</div>
          <div className="anatomy-fine">{anatomy.finePrint}</div>
        </div>

        {/* ===== VOCÊ × O PADRÃO ==================================================
            Pedido do Allan em 14/09/2026: "tinha que ter um comparativo da forma
            que eu joguei às cegas e da forma que o aplicativo pede. Colocar
            porcentagem." A anatomia acima diz o que ELE fez; sem o outro lado,
            "82% de fold" não responde se é muito ou pouco.
            ⚠️ O padrão aqui é a recomendação que o próprio motor deu, decisão a
            decisão, NAS MESMAS mãos — não uma tabela de fora. */}
        {comp.amostra > 0 ? (
          <div className="vsbox">
            <div className="vsbox-title">⚖️ Você × o padrão do app</div>
            <div className="vsbox-sub">
              {soCegas
                ? `Nas ${comp.amostra} decisões que você tomou ÀS CEGAS, lado a lado com o que o padrão pedia nas mesmas mãos:`
                : `Nas ${comp.amostra} decisões avaliadas, lado a lado com o que o padrão pedia nas mesmas mãos:`}
            </div>

            <div className="vs-head">
              <span className="vs-lbl" />
              <span className="vs-col-voce">Você</span>
              <span className="vs-col-padrao">Padrão</span>
              <span className="vs-col-dif">Dif.</span>
            </div>

            {comp.linhas.map((l) => (
              <div
                key={l.rotulo}
                className={`vs-row${comp.maiorGap?.rotulo === l.rotulo ? " destaque" : ""}`}
              >
                <span className="vs-lbl">{l.rotulo}</span>
                {/* ⚠️ Número primeiro, barra depois, dentro de um trilho de
                    largura fixa. Na primeira versão a barra tinha max-width e
                    81% e 94% saíam do MESMO tamanho — uma barra que mente é
                    pior do que barra nenhuma. */}
                <span className="vs-col-voce">
                  <b>{l.voce}%</b>
                  <span className="vs-track">
                    <span className="vs-bar voce" style={{ width: `${Math.max(l.voce, 2)}%` }} />
                  </span>
                </span>
                <span className="vs-col-padrao">
                  <b>{l.padrao}%</b>
                  <span className="vs-track">
                    <span className="vs-bar padrao" style={{ width: `${Math.max(l.padrao, 2)}%` }} />
                  </span>
                </span>
                <span className={`vs-col-dif ${l.diferenca > 0 ? "mais" : l.diferenca < 0 ? "menos" : ""}`}>
                  {l.diferenca > 0 ? "+" : ""}
                  {l.diferenca}
                </span>
              </div>
            ))}

            <div className="vsbox-note">{comp.leitura}</div>
            <div className="vsbox-fine">
              * "Padrão" é o que o motor do Call ou Fold recomendou em cada uma dessas
              mesmas mãos — mesmas cartas, mesma posição, mesmo stack. Não é uma tabela
              de fora nem promessa de solver.
            </div>
          </div>
        ) : null}

        <PositionTendencyList
          report={reportFromRecords(summary.positional ?? [])}
          title="📍 Sua tendência por posição neste torneio"
          emptyHint="Poucas mãos por posição pra apontar tendência neste torneio — jogue um pouco mais."
        />

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
                : summary.ratings.imprecisa + summary.ratings.ruim > shown.length
                  ? `Mãos para rever — as ${shown.length} mais graves de ${summary.ratings.imprecisa + summary.ratings.ruim}`
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

        <div style={{ marginTop: 14, textAlign: "center" }}>
          <HandShareButton
            data={shareData}
            label="📤 Compartilhar resultado"
            className="btn primary"
          />
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "center" }}>
          <button className="btn primary" onClick={onNewHand ?? onClose}>
            🃏 Jogar nova mão
          </button>
          <button className="btn" onClick={onClose}>
            Fechar e configurar novo torneio
          </button>
        </div>
      </div>
    </div>
  );
}
