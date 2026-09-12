// Modal com as DICAS COMPLETAS da mão — abre pelo botão no centro da mesa
// depois do river/showdown. Reúne o resumo e cada decisão sua avaliada.
import { useState, type ReactNode } from "react";
import { summarize, mixText, type FeedbackItem } from "../feedback/analyzer";
import { useT } from "../i18n";
import type { TransKey } from "../i18n/translations";
import { findBlockers } from "../bots/blockers";
import { useMemo } from "react";
import { runCalibration } from "../ranges/_calibration/gtoBenchmark";
import { runExternalBenchmark } from "../ranges/_calibration/externalBenchmark";
import type { Card } from "../engine/cards";
import { UserSubscriptionLevel } from "../app/gameController";
import { buildCoachV2PostHandDecision } from "./coachV2PostHand";
import { ExploitPanel } from "./ExploitPanel";
import { vilaoPrincipalDaMao } from "../bots/vilaoPrincipal";
import { compararResultadoEDecisao } from "../feedback/resultadoVsDecisao";
import { percursoDaMao } from "../feedback/percursoDaMao";
import "./percursoDaMao.css";
import type { HandHistory } from "../app/replay";

type TipsMode = "free" | "technical";

export function HandTipsModal({
  items,
  itemsFree,
  itemsTechnical,
  onClose,
  heroHand = [],
  board = [],
  userSubscriptionLevel,
  heroPosition: _heroPosition,
  heroBB: _heroBB,
  icmPhase: _icmPhase,
  actions,
  hand,
  netBB,
}: {
  items: FeedbackItem[];
  itemsFree?: FeedbackItem[];
  itemsTechnical?: FeedbackItem[];
  onClose: () => void;
  /** Ações de fim de mão (Nova mão, Rever, Compartilhar, Evolução…) — as mesmas
   *  que ficam embaixo da mesa, agora também dentro do modal. */
  actions?: ReactNode;
  heroHand?: Card[];
  board?: Card[];
  userSubscriptionLevel: UserSubscriptionLevel;
  /** Posição do herói no spot (ex.: UTG, BTN) — mantida por compatibilidade da API. */
  heroPosition?: string;
  /** Stack do herói em big blinds — mantido por compatibilidade da API. */
  heroBB?: number;
  /** Fase ICM do torneio — mantida por compatibilidade da API. */
  icmPhase?: "early" | "bubble" | "itm";
  /** A mão que acabou — usada só para descobrir contra QUEM ela foi. */
  hand?: HandHistory | null;
  /** Ganho líquido do herói na mão, em bb. Para a faixa resultado × decisão. */
  netBB?: number | null;
}) {
  const { t } = useT();
  const ratingLabel = (r: string) => t(`rating.${r}` as TransKey);
  const [tipsMode, setTipsMode] = useState<TipsMode>("free");

  const displayItems =
    tipsMode === "free" && itemsFree && itemsFree.length > 0
      ? itemsFree
      : tipsMode === "technical" && itemsTechnical && itemsTechnical.length > 0
        ? itemsTechnical
        : items;
  const tecnico = tipsMode === "technical";
  // O RESUMO do topo segue a ABA escolhida (Simples/Técnico), não o nível global
  // do app — antes ele ficava igual nas duas abas (o Allan percebeu que "técnico
  // = simples"). Ultra continua ultra; a aba só alterna entre simples e técnico.
  const summaryLevel: UserSubscriptionLevel =
    userSubscriptionLevel === "ultra" ? "ultra" : tecnico ? "technical" : "free";

  // Leitura complementar do board (só no modo técnico). Aqui ficam apenas
  // bloqueadores realmente observáveis; sizing vem exclusivamente do feedback
  // calculado pelo Motor V2 em cada decisão.
  const hasBoard = board.length >= 3;
  const blockers = tecnico && hasBoard ? findBlockers(heroHand, board) : [];

  // "COMO BATER ESTE VILÃO" — o app já sabia disso (deriva dos parâmetros reais
  // do bot), mas só aparecia se você tocasse no assento dele. Aqui ele encontra
  // quem lê as dicas. Em mão importada de gente de verdade não há perfil, e o
  // painel corretamente não aparece.
  const vilao = useMemo(() => vilaoPrincipalDaMao(hand), [hand]);

  // RESULTADO ≠ DECISÃO e ONDE A MÃO SAIU DO CAMINHO. Os dois leem os mesmos
  // FeedbackItems que a lista abaixo já mostra — nada é recalculado aqui.
  const confronto = useMemo(
    () => compararResultadoEDecisao(displayItems, { netBB: netBB ?? undefined }),
    [displayItems, netBB],
  );
  const percurso = useMemo(() => percursoDaMao(displayItems), [displayItems]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="replay tips-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ss-head">
          <h3>💡 {t("tips.title")}</h3>
          <button className="btn tiny" onClick={onClose}>
            fechar ✕
          </button>
        </div>
        <GtoSealChip />

        {/* Abas Simples / Técnico */}
        <div className="tips-mode-tabs">
          <button
            className={`tips-tab ${tipsMode === "free" ? "active" : ""}`}
            onClick={() => setTipsMode("free")}
          >
            💬 Simples
          </button>
          <button
            className={`tips-tab ${tipsMode === "technical" ? "active" : ""}`}
            onClick={() => setTipsMode("technical")}
          >
            🔢 Técnico
          </button>
        </div>

        {confronto ? (
          <section className={`rvd rvd-${confronto.veredito}`} aria-label="Resultado e decisão">
            <div className="rvd-linhas">
              <div className="rvd-col">
                <span className="rvd-rot">Resultado</span>
                <b className={confronto.ganhou ? "rvd-pos" : "rvd-neg"}>{confronto.linhaResultado}</b>
              </div>
              <div className="rvd-col">
                <span className="rvd-rot">Decisão</span>
                <b className={confronto.decisaoOk ? "rvd-pos" : "rvd-neg"}>
                  {confronto.decisaoOk ? "No padrão" : "Saiu do padrão"}
                </b>
              </div>
            </div>
            <p className="rvd-texto">{confronto.texto}</p>
          </section>
        ) : null}
        {percurso ? (
          <section className="pcm" aria-label="Percurso da mão">
            <div className="pcm-ruas">
              {percurso.ruas.map((r, i) => (
                <span
                  key={r.rua}
                  className={`pcm-rua pcm-${r.nota}${percurso.piorIdx === i ? " pcm-aqui" : ""}`}
                >
                  <b>{r.label}</b>
                  <i>
                    {r.nota === "semDecisao"
                      ? "sem decisão"
                      : r.nota === "boa" || r.nota === "ok"
                        ? "✓"
                        : "✗"}
                  </i>
                </span>
              ))}
            </div>
            {percurso.ondeSaiu ? (
              <p className="pcm-onde">
                <b>Onde a mão saiu do caminho</b>
                {percurso.ondeSaiu}
              </p>
            ) : null}
          </section>
        ) : null}
        <div className="summary">{summarize(displayItems, summaryLevel)}</div>
        {hasBoard ? (
          <div className="board-read">
            <div className="br-head">🧠 {t("tips.boardRead")}</div>
            {blockers.length > 0 ? (
              <ul className="br-blockers">
                {blockers.map((b, i) => (
                  <li key={i}>{t(`blocker.${b.kind}` as TransKey, { c: b.label })}</li>
                ))}
              </ul>
            ) : (
              <div className="br-none">{t("tips.noBlockers")}</div>
            )}
          </div>
        ) : null}
        {displayItems.length === 0 ? (
          <div className="legend">{t("tips.empty")}</div>
        ) : (
          displayItems.map((it, i) => {
            const view = buildCoachV2PostHandDecision(it, tecnico ? "technical" : "simple");
            return (
              <div key={i} className={`fb-item ${it.rating}`}>
                <div className="fb-head">
                  <span>{it.street}</span>
                  <span className="tag">{ratingLabel(it.rating)}</span>
                </div>
                <div className="fb-text">
                  {/* Ordem pedagógica: 1) decisão 2) motivo 3) a leitura
                      4) a conta 5) o resto da matemática. As camadas 3 e 4
                      passaram a existir nos DOIS modos em 11/09 — antes o
                      recreativo (modo simples, que é o padrão) não via nenhuma
                      delas, e era justamente a parte que o Allan sentia falta. */}
                  <div className="fb-decision">{view.decisionLine}</div>
                  <div>{view.reason}</div>
                </div>
                {view.leitura ? (
                  <div className="fb-camada">
                    <b>A leitura</b>
                    {view.leitura}
                  </div>
                ) : null}
                {view.topoRange ? (
                  <div className="fb-camada">
                    <b>O topo do range dele</b>
                    {view.topoRange}
                  </div>
                ) : null}
                {view.conta ? (
                  <div className="fb-camada">
                    <b>A conta</b>
                    {view.conta}
                  </div>
                ) : null}
                {view.pesoDaBolha ? (
                  <div className="fb-camada">
                    <b>O peso da bolha</b>
                    {view.pesoDaBolha}
                  </div>
                ) : null}
                {view.oQueMudaria ? (
                  <div className="fb-camada">
                    <b>O que mudaria</b>
                    {view.oQueMudaria}
                  </div>
                ) : null}
                {view.cartasSalvadoras ? (
                  <div className="fb-camada">
                    <b>Cartas que te salvavam</b>
                    {view.cartasSalvadoras}
                  </div>
                ) : null}
                {view.metrics.length > 0 ? (
                  <div className="fb-mix">{view.metrics.join(" · ")}</div>
                ) : null}
                {tecnico && mixText(it.mix) ? (
                  <div className="fb-mix">
                    {t("panel.strategyLabel")}: {mixText(it.mix)}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
        {vilao ? (
          <ExploitPanel profile={vilao.profile} titulo={`Como bater ${vilao.nome}`} />
        ) : null}
        {actions ? (
          <div className="tips-actions controls action-row">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Selo de confiança. Número sempre dinâmico — nunca escrito à mão.
//
// 11/09/2026: o selo dizia só "61 spots", que é o banco INTERNO. Auditando,
// medimos que existe também um banco EXTERNO com 554 spots comparados contra
// referência independente — ou seja, o selo prometia MENOS do que o app
// entrega. Agora soma os dois.
//
// Mostramos a FRAÇÃO (612 de 615), não a porcentagem: 99,51% arredonda para
// 100% e afirmaria acerto total, quando há 3 divergências conhecidas e
// documentadas no banco externo. Honestidade: é controle de qualidade nosso,
// NÃO certificação externa de GTO nem promessa de solver.
// ---------------------------------------------------------------------------
export function GtoSealChip() {
  const cal = useMemo(() => runCalibration(), []);
  const ext = useMemo(() => runExternalBenchmark(), []);
  const totalSpots = cal.total + ext.total;
  const totalOk = cal.matched + ext.matched;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        margin: "-4px 12px 6px",
        fontSize: 11,
        color: "#7ec58a",
        border: "1px solid #3c5f44",
        background: "rgba(80,160,95,0.08)",
        borderRadius: 20,
        padding: "3px 12px",
        textAlign: "center",
      }}
    >
      ✓ Bate com a referência em {totalOk} de {totalSpots} spots · teste próprio
    </div>
  );
}
