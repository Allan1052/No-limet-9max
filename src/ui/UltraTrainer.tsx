// ---------------------------------------------------------------------------
// Ultra · Treino 1×1 personalizado.
//
// Você escolhe: sua posição, se abre ou enfrenta a abertura de um vilão (e de
// qual posição), e a média de fichas (stack em bb). O app sorteia uma mão,
// você decide, e recebe a nota + a GRADE de range daquele spot com a sua mão
// destacada. Reaproveita o mesmo motor do jogo — nada de regra nova.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from "react";
import { CardView, CardBack } from "./Card";
import { SpotRangeGrid } from "./SpotRangeGrid";
import { useT } from "../i18n";
import { HoodedFace, VILLAINS, pickVillain, type Villain } from "./UltraTrainerFaces";
import type { TransKey } from "../i18n/translations";
import { spotRangeGrid } from "../ranges/spotGrid";
import { buildStageIcm, STAGE_LABEL, type HandLabSpec } from "../train/stage";
import { BASELINE_PROFILE } from "../bots/profiles";
import { comboToHandType } from "../ranges/types";
import {
  buildScenarioFromSpec,
  evaluateChoice,
  isCorrect,
  type Scenario,
  type ScenarioSpec,
} from "../train/scenarios";
import { markActiveToday } from "../train/streak";
import { recordDecision } from "../train/decisionStats";
import { recordProgress } from "../train/progress";
import { drawSpotImage } from "../app/handImage";
import { shareSpot } from "../app/share";
import type { FeedbackItem } from "../feedback/analyzer";

// O "carrasco": o vilão que faz suas fichas sangrarem. Um é sorteado por sessão
// e vira o seu terror pessoal do heads-up. Só flavor — não muda a matemática.

export function UltraTrainer() {
  const { t } = useT();
  const [prefill, setPrefill] = useState<{ spec: ScenarioSpec; daily: boolean } | null>(null);

  // "Treinar esse spot" da Sua Mão / "Analisar minha mão" da Hoje: gravam o
  // spec do spot (cof-sua-mao-spec) e disparam cof-open-ultra — aqui ele é
  // capturado e a sessão 1×1 começa já configurada no spot. Quando vem da Mão
  // do dia (fromDaily), entra em "modo mão do dia".
  useEffect(() => {
    // O spec da Sua Mão é um HandLabSpec (da análise) — converte pra um
    // ScenarioSpec do Treino 1×1 (mesmos campos de posição/stack/abertura).
    const readSpec = (): { spec: ScenarioSpec; daily: boolean } | null => {
      const raw = localStorage.getItem("cof-sua-mao-spec");
      if (!raw) return null;
      try {
        const s = JSON.parse(raw) as HandLabSpec;
        const facingAllin = s.situation === "vsallin";
        const spec = {
          heroPosition: s.heroPosition,
          effectiveBB: s.stackBB,
          raiserPosition: s.situation === "open" ? undefined : s.villainPosition,
          openSizeBB: s.situation === "vsopen" ? 2.3 : s.situation === "vs3bet" ? 6 : facingAllin ? s.stackBB : undefined,
          // Abre o 1×1 JÁ com as cartas que o jogador montou + o nível de aposta,
          // pra mostrar a ação real DAQUELA mão (não uma aleatória).
          fixedHand: Array.isArray(s.hand) ? s.hand : undefined,
          betLevelFaced: s.situation === "vs3bet" ? 2 : facingAllin ? 1 : undefined,
          threeBet: s.situation === "vs3bet",
          facingAllin,
          // A fase escolhida na Sua Mão acompanha o treino; o ICM só é
          // aplicado quando a própria análise construiu esse contexto.
          stage: s.stage,
          icmSpot: buildStageIcm(s.stackBB, s.stage),
        } as ScenarioSpec;
        return { spec, daily: s.fromDaily === true };
      } catch {
        return null;
      }
    };
    // Se já veio de fora (link/navegação), aplica logo no mount.
    const existing = readSpec();
    if (existing) {
      localStorage.removeItem("cof-sua-mao-spec");
      setPrefill(existing);
    }
    const onOpenUltra = () => {
      const spec = readSpec();
      localStorage.removeItem("cof-sua-mao-spec");
      if (spec) setPrefill(spec);
    };
    window.addEventListener("cof-open-ultra", onOpenUltra);
    return () => window.removeEventListener("cof-open-ultra", onOpenUltra);
  }, []);

  const [scenario, setScenario] = useState<Scenario | null>(null);
  // Spot ativo (o que veio da "Sua Mão"): guardado pra as próximas mãos manterem
  // posição/stack/all-in/ICM — só a mão varia.
  const [activeSpec, setActiveSpec] = useState<ScenarioSpec | null>(null);
  const [result, setResult] = useState<FeedbackItem | null>(null);
  const [session, setSession] = useState({ correct: 0, total: 0 });
  const [villain, setVillain] = useState<Villain>(VILLAINS[0]);
  // "Modo mão do dia": a mesma mão do dia; o jogador já respondeu e agora pode
  // ver a explicação de CADA ação (Fold/Call/Raise/Re-raise) sem mexer no placar.
  const [daily, setDaily] = useState(false);
  // Ação que está sendo exibida no momento (a escolhida ou uma "espiada").
  const [viewedKey, setViewedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!prefill) return;
    setActiveSpec(prefill.spec);
    setDaily(prefill.daily);
    setVillain(pickVillain());
    setSession({ correct: 0, total: 0 });
    setResult(null);
    setViewedKey(null);
    // 1ª mão = a que o jogador montou (fixedHand); a decisão é a ação real.
    setScenario(buildScenarioFromSpec(prefill.spec, Math.random));
    setPrefill(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  const next = () => {
    setResult(null);
    setViewedKey(null);
    if (!activeSpec) return;
    // Próximas mãos: mesmo spot (posição/stack/all-in/ICM), mão nova.
    setScenario(buildScenarioFromSpec({ ...activeSpec, fixedHand: undefined }, Math.random));
  };
  const back = () => {
    setScenario(null);
    setResult(null);
    setViewedKey(null);
  };
  // Modo mão do dia: espia a explicação de OUTRA ação na MESMA mão, sem contar
  // no placar (não é uma nova resposta — é estudo da própria mão).
  const peekAction = (key: "fold" | "call" | "raise" | "allin") => {
    if (!scenario) return;
    setResult(evaluateChoice(scenario, key));
    setViewedKey(key);
  };
  const startExample = () => {
    const example: ScenarioSpec = {
      heroPosition: "BTN",
      effectiveBB: 40,
      raiserPosition: "CO",
      openSizeBB: 2.3,
      variant: "holdem",
      stage: "inicio",
    };
    setActiveSpec(example);
    setVillain(pickVillain());
    setSession({ correct: 0, total: 0 });
    setResult(null);
    setScenario(buildScenarioFromSpec(example, Math.random));
  };
  const appUrl =
    typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
  const onShareHit = async () => {
    if (!scenario) return;
    const sp = scenario.spec;
    const img = await drawSpotImage({
      hand: scenario.hand,
      title: t("share.hitTitle"),
      context: `${sp.heroPosition} · ${sp.effectiveBB}bb`,
      question: t("share.hitQuestion"),
      footer: t("share.hitFooter"),
    });
    await shareSpot(img, appUrl, t("share.hitText"), t("disclaimer"));
  };
  const choose = (key: "fold" | "call" | "raise" | "allin") => {
    if (!scenario || result) return;
    const item = evaluateChoice(scenario, key);
    const ok = isCorrect(item);
    setResult(item);
    setViewedKey(key);
    markActiveToday();
    recordDecision(key);
    // Base de EVOLUÇÃO ("Seu jogo"): o 1×1 e a mão do dia também contam.
    recordProgress({
      kind: "preflop",
      stage: scenario.spec.stage ?? "inicio",
      effectiveBB: scenario.spec.effectiveBB,
      correct: ok,
    });
    setSession((s) => ({ correct: s.correct + (ok ? 1 : 0), total: s.total + 1 }));
    // Errou = o carrasco leva o pote. Um tranco háptico pra doer de verdade.
    if (!isCorrect(item)) {
      try {
        navigator.vibrate?.([45, 35, 110]);
      } catch {
        /* sem vibração — segue só o visual */
      }
    }
  };

  // Fichas voando pro carrasco quando ele leva o pote (você errou).
  // Geradas por resultado: espalhamento, atraso e giro aleatórios, estáveis no render.
  const potChips = useMemo(() => {
    if (!result || isCorrect(result)) return [];
    const colors = ["red", "blue", "green", "black", "gold"];
    return Array.from({ length: 18 }, (_, i) => ({
      dx: Math.round((Math.random() - 0.5) * 140),
      delay: Math.round(Math.random() * 420),
      dur: 820 + Math.round(Math.random() * 560),
      rot: Math.round((Math.random() - 0.5) * 340),
      color: colors[i % colors.length],
    }));
  }, [result]);

  // Grade do spot (só depois de responder, pra não entregar a resposta antes).
  const cells = useMemo(() => {
    if (!scenario) return null;
    const s = scenario.spec;
    return spotRangeGrid({
      heroPosition: s.heroPosition,
      effectiveBB: s.effectiveBB,
      profile: BASELINE_PROFILE,
      raiserPosition: s.raiserPosition,
      openSizeBB: s.openSizeBB,
      icmSpot: s.icmSpot,
      threeBet: s.threeBet,
    });
  }, [scenario]);

  // ---------- Espera (dedicado à "Sua Mão") ----------
  // O 1×1 só entra em ação com a mão que o jogador monta na aba "Sua Mão"
  // (via "Treinar esse spot"). Sem uma mão vinda de lá, mostra o caminho —
  // nada de spot aleatório aqui.
  if (!scenario) {
    return (
      <div className="train-view">
        <div className="panel ultra-panel">
          <div className="ultra-badge">✨ {t("ultra.badge")}</div>
          <h3>{t("ultra.title")}</h3>
          <p className="ultra-sub" style={{ marginBottom: 18 }}>
            O 1×1 treina <b>a mão que você monta</b> na aba <b>Sua Mão</b>. Monte o
            spot lá (posição, cartas, stacks), toque em <b>Analisar minha mão</b> e
            depois em <b>🎯 Treinar no 1×1</b> — a mão abre aqui já com a ação real.
          </p>
          <div className="ultra-start-actions">
            <button
              className="btn primary ultra-start"
              onClick={() =>
                window.dispatchEvent(new CustomEvent("nav-to", { detail: "suamao" }))
              }
            >
              ✍️ Montar minha mão
            </button>
            <button className="btn ultra-example-start" onClick={startExample}>
              ▶ Começar com um spot de exemplo
            </button>
          </div>
          <p className="ultra-example-note">
            Exemplo rápido: BTN com 40bb contra abertura de CO. Você responde uma mão e vê o feedback na hora; depois pode montar o seu próprio spot.
          </p>
        </div>
      </div>
    );
  }

  // ---------- Spot em andamento ----------
  const s = scenario.spec;
  const handType = comboToHandType(scenario.hand[0], scenario.hand[1]);
  const openSize = s.openSizeBB ?? 2.3;
  // Pote na hora da decisão: blinds (SB 0.5 + BB 1) + a aberta do vilão, se houve.
  // Ninguém pagou ainda: no treino 1×1 a decisão do herói acontece logo após
  // a ação do vilão, sem callers — por isso o pote é só blinds + aberta.
  const potBB = Math.round((1.5 + (s.raiserPosition ? openSize : 0)) * 10) / 10;
  // Nota de contexto do pote: mostra o que compõe o valor exibido,
  // evitando a dúvida "cadê o call que faltou?".
  const potNote = s.facingAllin
    ? `Vilão deu all-in de ${Math.round(openSize)}bb — pague ou largue.`
    : s.raiserPosition
      ? t("ultra.potNote.raised", { size: openSize })
      : t("ultra.potNote.waiting");
  return (
    <div className="train-view">
      <div className="panel">
        <div className="ss-head">
          <button className="btn tiny" onClick={back}>{t("ultra.change")}</button>
          <span className="train-session">
            {t("train.session", {
              c: session.correct,
              t: session.total,
              correctLabel: t(session.correct === 1 ? "train.correct.one" : "train.correct.many"),
              answerLabel: t(session.total === 1 ? "train.answer.one" : "train.answer.many"),
            })}
          </span>
        </div>

        {/* Arena 1×1 — heads-up de Main Event contra o seu carrasco pessoal. */}
        <div className={`arena ${result ? (isCorrect(result) ? "won" : "lost") : ""}`}>
          <div className="arena-top">
            <span className="arena-title">
              {daily
                ? `📅 MÃO DO DIA${s.stage ? ` · ${STAGE_LABEL[s.stage]}` : ""}`
                : `🏆 ${s.stage ? `TREINO · ${STAGE_LABEL[s.stage]}` : t("ultra.mainEvent")}`}
            </span>
            <span className="arena-badges">
              <span className="arena-ring">{t("ultra.fullring")}</span>
              <span className="arena-headsup">{t("ultra.headsup")}</span>
            </span>
          </div>

          <div className="duel spotlight">
            <div className="duel-seat villain terror">
              <div className="villain-av">
                {"art" in villain ? (
                  <HoodedFace />
                ) : (
                  <span className="villain-emoji">{villain.emoji}</span>
                )}
                {s.raiserPosition ? <span className="duel-pos vil">{s.raiserPosition}</span> : null}
              </div>
              <div className="villain-name">{t(villain.nameKey)}</div>
              <div className="villain-taunt">
                {result
                  ? isCorrect(result)
                    ? t("ultra.survive")
                    : t("ultra.gloat")
                  : `“${t(villain.tauntKey)}”`}
              </div>
              <div className="duel-cards">
                <CardBack small />
                <CardBack small />
              </div>
              <div className={`duel-badge ${s.raiserPosition ? "aggro" : "wait"}`}>
                {s.facingAllin
                  ? `🔥 ALL-IN ${Math.round(openSize)}bb`
                  : s.raiserPosition
                    ? t("ultra.opened", { size: openSize })
                    : t("ultra.waiting")}
              </div>
            </div>

            <div className="duel-center">
              <div className="duel-chip" aria-hidden />
              <div className="duel-pot">{t("ultra.pot", { bb: potBB })}</div>
              <div className="duel-pot-note">{potNote}</div>
              <div className="duel-vs">VS</div>
            </div>

            <div className="duel-seat hero">
              <div className="duel-badge turn">{t("ultra.yourTurn")}</div>
              <div className="duel-cards big">
                {scenario.hand.map((c, i) => (
                  <CardView key={i} card={c} />
                ))}
              </div>
              <div className="duel-name">
                <span className="duel-pos hero">{s.heroPosition}</span>
                {t("ultra.you")} · {s.effectiveBB}bb
              </div>
            </div>

            {potChips.length > 0 ? (
              <div className="chips-fly" aria-hidden>
                {potChips.map((c, i) => (
                  <span
                    key={i}
                    className={`chip ${c.color}`}
                    style={
                      {
                        "--dx": `${c.dx}px`,
                        "--rot": `${c.rot}deg`,
                        animationDelay: `${c.delay}ms`,
                        animationDuration: `${c.dur}ms`,
                      } as React.CSSProperties
                    }
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {!result ? (
          <div className="train-actions">
            {scenario.actions.map((a) => (
              <button key={a.key} className="btn primary" onClick={() => choose(a.key)}>
                {t(a.labelKey as TransKey)}
              </button>
            ))}
          </div>
        ) : (
          <div className="train-result">
            <div className={`train-verdict ${isCorrect(result) ? "ok" : "bad"}`}>
              {daily
                ? isCorrect(result)
                  ? "✔ Essa é a jogada recomendada"
                  : "✘ Não é a melhor jogada aqui"
                : isCorrect(result)
                  ? t("train.correct")
                  : t("train.wrong")}
            </div>
            <div className={`fb-item ${result.rating}`}>
              <div className="fb-text">{result.text}</div>
            </div>
            {/* Mão do dia: espia a explicação de cada ação NA MESMA mão. Assim o
                Allan vê o porquê de Fold, Call, Raise e Re-raise sem trocar de mão. */}
            {daily ? (
              <div className="ultra-peek">
                <div className="ultra-peek-label">Toque pra ver cada jogada nesta mão:</div>
                <div className="ultra-peek-actions">
                  {scenario.actions.map((a) => (
                    <button
                      key={a.key}
                      className={`btn tiny ${viewedKey === a.key ? "primary" : ""}`}
                      onClick={() => peekAction(a.key)}
                    >
                      {t(a.labelKey as TransKey)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {!daily && isCorrect(result) ? (
              <button className="btn hit-share-btn" onClick={onShareHit}>
                📣 {t("share.hitBtn")}
              </button>
            ) : null}
            {cells ? (
              <details className="ultra-range-details">
                <summary>▦ {t("ultra.rangeToggle")}</summary>
                <div className="ultra-grid-title">{t("ultra.rangeTitle")}</div>
                <SpotRangeGrid cells={cells} highlight={handType} />
              </details>
            ) : null}
            <button className="btn primary train-next" onClick={next}>
              {t("ultra.newHand")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
