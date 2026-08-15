// ---------------------------------------------------------------------------
// STREET TRAINER — treino rua por rua com ranges dinâmicos (Fase 1).
//
// Módulo NOVO e isolado em UI (não toca o motor). Fluxo combinado:
//   1. Configura o spot (mesma tela do UltraTrainer + vilão)
//   2. Escolhe o board de cada rua (presets + aleatório)
//   3. Por rua: decide a ação · "Ver meu range" · "🔍 Range do vilão"
//   4. TOQUE NO JOGADOR: o assento do vilão e o seu assento são tocáveis —
//      tocar no jogador abre a grade do range dele/na hora, sem botões.
//      Cada célula da grade também é tocável: mostra a mão + frequência.
//   5. Timeline final com a linha da mão completa
//
// Usa o motor novo `src/train/streets/dynamicRanges` (só leitura dos motores).
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from "react";
import { CardView, CardBack } from "./Card";
import { useT } from "../i18n";
import type { TransKey } from "../i18n/translations";
import { comboToHandType, type Position } from "../ranges/types";
import { seededRng, makeCard, type Card } from "../engine/cards";
import { handRank } from "../ranges/handStrength";
import {
  analyzeBoard,
  boardNarration,
  continueVillainRange,
  describeBoard,
  heroBestAction,
  heroRecommendedGrid,
  preflopOpenRange,
  type BoardState,
  type StreetContext,
  type StreetName,
} from "../train/streets/dynamicRanges";
import type { HandLabSpec } from "../train/stage";
import { isDevUnlocked } from "../lib/devLock";

// ----------------------------- Legenda de cores -----------------------------

/** Legenda ao lado da grade — o novato vê na hora o que cada cor significa. */
export function RangeLegend({ mode }: { mode: "hero" | "villain" }) {
  const { t } = useT();
  const items =
    mode === "hero"
      ? [
          { color: "var(--gold, #e6c454)", label: t("street.legend.bet") },
          { color: "var(--blue, #4d8fe6)", label: t("street.legend.check") },
          { color: "#5c6b60", label: t("street.legend.fold") },
        ]
      : [
          { color: "var(--gold, #e6c454)", label: t("street.legend.likely") },
          { color: "var(--blue, #4d8fe6)", label: t("street.legend.continuing") },
          { color: "#5c6b60", label: t("street.legend.out") },
        ];
  return (
    <div className="street-legend" role="note" aria-label={t("street.legend.title" as TransKey)}>
      <span className="street-legend-title">{t("street.legend.title" as TransKey)}</span>
      <div className="street-legend-items">
        {items.map((it) => (
          <span key={it.label} className="street-legend-item">
            <span className="street-legend-swatch" style={{ background: it.color }} />
            {it.label}
          </span>
        ))}
        <span className="street-legend-item">
          <span className="street-legend-swatch street-legend-split" />
          {t("street.legend.mixed")}
        </span>
      </div>
    </div>
  );
}

// ----------------------------- Board presets -----------------------------

interface BoardPreset {
  id: string;
  label: string;
  cards: number[]; // 3 cards (flop) ou 1 (turn/river extra)
}

const FLOP_PRESETS: BoardPreset[] = [
  // makeCard usa o rank real do poker (2..14). A=14, K=13, Q=12, J=11, T=10...
  { id: "dryA", label: "A♠ 8♦ 6♣ · seco, alto", cards: [makeCard(14, 3), makeCard(8, 1), makeCard(6, 0)] },
  { id: "dryK", label: "K♥ 7♣ 3♦ · seco", cards: [makeCard(13, 2), makeCard(7, 0), makeCard(3, 1)] },
  { id: "wet", label: "8♠ 9♠ T♥ · molhado", cards: [makeCard(8, 3), makeCard(9, 3), makeCard(10, 2)] },
  { id: "flush", label: "K♠ 8♠ 2♠ · 3 do naipe", cards: [makeCard(13, 3), makeCard(8, 3), makeCard(2, 3)] },
  { id: "paired", label: "8♠ 8♦ K♣ · par no board", cards: [makeCard(8, 3), makeCard(8, 1), makeCard(13, 0)] },
  { id: "low", label: "5♦ 4♥ 2♣ · baixo", cards: [makeCard(5, 1), makeCard(4, 2), makeCard(2, 0)] },
];

const TURN_PRESETS: BoardPreset[] = [
  { id: "blank", label: "2♠ carta branca", cards: [makeCard(2, 3)] },
  { id: "over", label: "Q♣ carta alta", cards: [makeCard(12, 0)] },
  { id: "pair", label: "6♦ par no board", cards: [makeCard(6, 1)] },
  { id: "sweat", label: "J♠ completa draws", cards: [makeCard(11, 3)] },
];

const RIVER_PRESETS: BoardPreset[] = [
  { id: "blank", label: "3♣ carta branca", cards: [makeCard(3, 0)] },
  { id: "sweat", label: "9♥ completa draws", cards: [makeCard(9, 2)] },
  { id: "pair", label: "T♦ par no board", cards: [makeCard(10, 1)] },
  { id: "brick", label: "2♥ tijolo", cards: [makeCard(2, 2)] },
];

const EXTRA_PRESETS: Record<Exclude<StreetName, "flop">, BoardPreset[]> = {
  turn: TURN_PRESETS,
  river: RIVER_PRESETS,
};

// ----------------------------- Estado da sessão -----------------------------

interface StreetStep {
  street: StreetName;
  board: BoardState;
  heroAction: string | null; // a ação que você tomou
  villainAction: string | null; // ação do vilão (sorteada pelo perfil)
}

interface SavedHand {
  // mão do herói (2 cartas) + mão do vilão (para o showdown final)
  hero: number[];
  villain: number[];
}


// ----------------------------- Componente -----------------------------

export function StreetTrainer() {
  const { t } = useT();

  // Configuração do spot
  const [heroPos, setHeroPos] = useState<Position>("UTG");
  const [villainPos, setVillainPos] = useState<Position>("BTN");
  const [effBB, setEffBB] = useState(20);

  const [hand, setHand] = useState<SavedHand | null>(null);
  const [steps, setSteps] = useState<StreetStep[]>([]);
  const [current, setCurrent] = useState<StreetName>("flop");
  const [flopChoice, setFlopChoice] = useState<BoardPreset | null>(FLOP_PRESETS[0]);
  const [extraChoice, setExtraChoice] = useState<Record<Exclude<StreetName, "flop">, BoardPreset | null>>({ turn: null, river: null });
  const [showHeroRange, setShowHeroRange] = useState(false);
  const [showVillainRange, setShowVillainRange] = useState(false);
  const [streetDec, setStreetDec] = useState<Record<StreetName, { hero: string | null; villain: string | null }>>({ flop: { hero: null, villain: null }, turn: { hero: null, villain: null }, river: { hero: null, villain: null } });
  const [score, setScore] = useState(0);
  const [streetScoreTotal, setStreetScoreTotal] = useState(0);

  // Trocador de carta do turn/river (a carta já vem pré-escolhida; o jogador
  // pode trocar quantas vezes quiser ANTES de decidir a rua).
  const [swapMode, setSwapMode] = useState<Exclude<StreetName, "flop"> | null>(null);
  // Modo Estudo 🎬 — atrás da senha rua2026: o app joga a mão sozinho e mostra
  // as grades evoluindo (útil p/ gravar Reels e estudar sem pressão).
  const [studyMode, setStudyMode] = useState(false);

  const s = { heroPosition: heroPos, villainPosition: villainPos, effBB };
  const heroHandType = hand ? comboToHandType(hand.hero[0], hand.hero[1]) : null;
  const villainHandType = hand ? comboToHandType(hand.villain[0], hand.villain[1]) : null;

  // Contexto do spot (pote + aposta enfrentada) — DECLARADO ANTES dos hooks que o usam
  const ctxFor = (step: StreetStep, spec: typeof s): StreetContext => {
    const openBB = 2.3;
    const potAfterOpen = 1.5 + openBB;
    const stepIdx = ["flop", "turn", "river"].indexOf(step.street);
    // Pote cresce ~metade por street apostada; faced: betSmall=0.5×potPrev, betBig=0.75×potPrev
    let pot = potAfterOpen;
    let faced = 0;
    for (let i = 0; i <= stepIdx; i++) {
      const st = steps[i];
      if (!st) break;
      if (st.villainAction === "betSmall") faced = Math.round(pot * 0.5 * 10) / 10;
      else if (st.villainAction === "betBig") faced = Math.round(pot * 0.75 * 10) / 10;
      else faced = 0;
      if (st.heroAction === "call") pot = Math.round((pot + faced) * 10) / 10;
      else if (st.heroAction === "betSmall") pot = Math.round((pot + pot * 0.5) * 10) / 10;
      else if (st.heroAction === "betBig") pot = Math.round((pot + pot * 0.75) * 10) / 10;
      faced = 0;
    }
    return {
      heroPosition: spec.heroPosition,
      villainPosition: spec.villainPosition,
      heroStackBB: spec.effBB,
      villainStackBB: spec.effBB,
      potBB: pot,
      facedBetBB: faced,
    };
  };

  // Board corrente construído a partir das escolhas
  const boardSoFar = useMemo<BoardState>(() => {
    const cards: number[] = [];
    if (current === "flop" || current === "turn" || current === "river") {
      if (flopChoice) cards.push(...flopChoice.cards);
      else cards.push(...FLOP_PRESETS[0].cards);
    }
    if (current === "turn" || current === "river") {
      const turnPick = extraChoice.turn ?? TURN_PRESETS[0];
      cards.push(...turnPick.cards);
    }
    if (current === "river") {
      const riverPick = extraChoice.river ?? RIVER_PRESETS[0];
      cards.push(...riverPick.cards);
    }
    return { street: current, cards };
  }, [current, flopChoice, extraChoice]);

  const texture = useMemo(() => analyzeBoard(boardSoFar), [boardSoFar]);

  // Range do vilão evolui conforme os passos já dados
  const villainRange = useMemo(() => {
    const init = preflopOpenRange(villainPos, effBB);
    let prev = init;
    for (const step of steps) {
      if (step.villainAction) {
        prev = continueVillainRange(prev, step.villainAction as never, step.board, ctxFor(step, s)).range;
      }
    }
    return prev;
  }, [steps, villainPos, effBB, s]);

  // Grade recomendada do herói (memo para não recalcular a cada render)
  const heroGrid = useMemo(
    () => heroRecommendedGrid(boardSoFar, heroPos, villainPos, effBB, false, ctxNowPot()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [boardSoFar, heroPos, villainPos, effBB]
  );

  function ctxNowPot(): number {
    return ctxFor({ street: current, board: boardSoFar, heroAction: null, villainAction: null }, s).potBB;
  }

  // "Treinar rua por rua" da Sua Mão: o HandLab grava o spec do spot
  // (cof-sua-mao-spec) e dispara cof-open-street — aqui ele é capturado e a
  // sessão rua por rua começa já com a mão, posição e stack do jogador.
  const [prefill, setPrefill] = useState<{
    heroHand: Card[];
    heroPosition: Position;
    villainPosition: Position;
    effBB: number;
  } | null>(null);

  useEffect(() => {
    const readSpec = (): { heroHand: Card[]; heroPosition: Position; villainPosition: Position; effBB: number } | null => {
      const raw = localStorage.getItem("cof-sua-mao-spec");
      if (!raw) return null;
      try {
        const spec = JSON.parse(raw) as HandLabSpec;
        if (!spec.hand || spec.hand.length < 2) return null;
        return {
          heroHand: spec.hand.slice(0, 2),
          heroPosition: spec.heroPosition,
          villainPosition: spec.villainPosition,
          effBB: spec.stackBB,
        };
      } catch {
        return null;
      }
    };
    // ⚠ O spec NÃO é consumido aqui: o jogador pode fechar/reabrir a tela e o
    // spot continua salvo. Ele só é apagado ao começar o treino (start()).
    const existing = readSpec();
    if (existing) setPrefill(existing);
    const onOpenStreet = () => {
      const spec = readSpec();
      if (spec) setPrefill(spec);
    };
    window.addEventListener("cof-open-street", onOpenStreet);
    return () => window.removeEventListener("cof-open-street", onOpenStreet);
  }, []);

  useEffect(() => {
    if (!prefill) return;
    setHeroPos(prefill.heroPosition);
    setVillainPos(prefill.villainPosition);
    setEffBB(prefill.effBB);
    // Começa a sessão já com a mão e posição do jogador (sem sorteio).
    const rng = seededRng(Math.floor(Math.random() * 1e9));
    const villainIdx = Math.floor(rng() * 169);
    const ranks = "AKQJT98765432";
    const pickHand = (idx: number): number[] => {
      const ht = (() => {
        const ordered = Array.from({ length: 169 }, (_, i) => {
          const ii = Math.floor(i / 13);
          const jj = i % 13;
          if (ii === jj) return ranks[ii] + ranks[jj];
          if (ii < jj) return ranks[ii] + ranks[jj] + "s";
          return ranks[jj] + ranks[ii] + "o";
        }).sort((a, b) => handRank(a) - handRank(b));
        return ordered[idx % 169];
      })();
      const hi = ranks.indexOf(ht[0]);
      const lo = ht.length === 2 ? hi : ranks.indexOf(ht[1]);
      const suited = ht.endsWith("s");
      const suits = suited ? [0, 0] : [Math.floor(rng() * 4), Math.floor(rng() * 4)];
      return [makeCard(hi + 2, suits[0]), makeCard(lo + 2, suits[1])];
    };
    setHand({ hero: prefill.heroHand, villain: pickHand(villainIdx) });
    setSteps([]);
    setCurrent("flop");
    setFlopChoice(FLOP_PRESETS[0]);
    setExtraChoice({ turn: TURN_PRESETS[0], river: RIVER_PRESETS[0] });
    setShowHeroRange(false);
    setShowVillainRange(false);
    setSwapMode(null);
    setStreetDec({ flop: { hero: null, villain: null }, turn: { hero: null, villain: null }, river: { hero: null, villain: null } });
    setScore(0);
    setStreetScoreTotal(0);
    setPrefill(null);
  }, [prefill]);

  const start = () => {
    // O spec da Sua Mão é consumido só agora, ao começar o treino — assim o
    // spot sobrevive a fechadas/reabertas da tela.
    localStorage.removeItem("cof-sua-mao-spec");
    const rng = seededRng(Math.floor(Math.random() * 1e9));
    // Mão do herói: prefere mãos médias/fortes (mais divertidas pra treinar)
    const heroIdx = 4 + Math.floor(rng() * 24); // top 4..28 do ranking
    const villainIdx = Math.floor(rng() * 169);
    const pickHand = (idx: number): number[] => {
      const ranks = "AKQJT98765432";
      const ht = (() => {
        const ordered = Array.from({ length: 169 }, (_, i) => {
          const ii = Math.floor(i / 13);
          const jj = i % 13;
          if (ii === jj) return ranks[ii] + ranks[jj];
          if (ii < jj) return ranks[ii] + ranks[jj] + "s";
          return ranks[jj] + ranks[ii] + "o";
        }).sort((a, b) => handRank(a) - handRank(b));
        return ordered[idx % 169];
      })();
      const hi = ranks.indexOf(ht[0]);
      const lo = ht.length === 2 ? hi : ranks.indexOf(ht[1]);
      const suited = ht.endsWith("s");
      const suits = suited ? [0, 0] : [Math.floor(rng() * 4), Math.floor(rng() * 4)];
      return [makeCard(hi + 2, suits[0]), makeCard(lo + 2, suits[1])];
    };
    setHand({ hero: pickHand(heroIdx), villain: pickHand(villainIdx) });
    setSteps([]);
    setCurrent("flop");
    setFlopChoice(FLOP_PRESETS[0]);
    setExtraChoice({ turn: TURN_PRESETS[0], river: RIVER_PRESETS[0] });
    setShowHeroRange(false);
    setShowVillainRange(false);
    setSwapMode(null);
    setStreetDec({ flop: { hero: null, villain: null }, turn: { hero: null, villain: null }, river: { hero: null, villain: null } });
    setScore(0);
    setStreetScoreTotal(0);
  };


  // Ação do vilão reagindo à sua ação (perfil baseline: paga mais que folda com draw)
  const villainReaction = (your: string, _ctx: StreetContext): string => {
    const rng = seededRng(Math.floor(Math.random() * 1e9));
    const v = rng();
    if (your === "check") return v < 0.55 ? "check" : v < 0.85 ? "betSmall" : "betBig";
    if (your === "fold") return "fold";
    const tight = v < 0.15;
    if (your === "betSmall") return tight ? "fold" : v < 0.75 ? "call" : "betBig";
    return tight ? "fold" : v < 0.7 ? "call" : "raise";
  };

  // Modo Estudo 🎬: o engine decide pelo herói (a melhor ação), e o jogador
  // vê a grade ANTES — depois de decidir, a grade do vilão abre sozinha.
  const decideWithEngine = () => {
    if (!hand || !heroHandType || streetDec[current].hero) return;
    const best = heroBestAction(
      heroHandType,
      boardSoFar,
      ctxFor({ street: current, board: boardSoFar, heroAction: null, villainAction: null }, s).facedBetBB,
      ctxFor({ street: current, board: boardSoFar, heroAction: null, villainAction: null }, s).potBB,
      texture,
    );
    setShowHeroRange(true);
    setTimeout(() => decide(best.action), 40);
  };

  const decide = (action: string) => {
    if (!hand || streetDec[current].hero) return;
    const best = heroBestAction(heroHandType!, boardSoFar, ctxFor({ street: current, board: boardSoFar, heroAction: null, villainAction: null }, s).facedBetBB, ctxFor({ street: current, board: boardSoFar, heroAction: null, villainAction: null }, s).potBB, texture);
    const ok = action === "fold" && best.action === "fold"
      || action === "check" && best.action === "check"
      || action === "call" && (best.action === "call" || best.action === "raise")
      || action === "betSmall" && (best.action === "betSmall" || best.action === "raise")
      || action === "betBig" && best.action === "raise";
    const ctx = ctxFor({ street: current, board: boardSoFar, heroAction: action, villainAction: null }, s);
    const vReact = villainReaction(action, ctx);
    const reactLabel = vReact === "fold" ? "check" : vReact; // vilão não folda a sua aposta sem aposta prévia; simplificação
    setStreetDec((d) => ({ ...d, [current]: { hero: action, villain: reactLabel } }));
    if (ok) setScore((v) => v + 1);
    setStreetScoreTotal((v) => v + 1);
    setSteps((prev) => [
      ...prev,
      { street: current, board: boardSoFar, heroAction: action, villainAction: reactLabel },
    ]);

    // Avança de rua — TRAVADO: só sai do turn quando o turn termina, só sai
    // do river quando o river termina (a rua seguinte nunca é oferecida antes).
    if (current === "flop") setCurrent("turn");
    else if (current === "turn") setCurrent("river");
    setShowHeroRange(false);
    setShowVillainRange(false);
    setSwapMode(null);
  };

  const back = () => {
    // Volta para a aba "Sua Mão" SEM zerar o spot — o spec fica salvo no
    // localStorage (cof-sua-mao-spec) e a sessão reaparece intacta ao
    // tocar de novo em "Treinar rua por rua". (Decisão do Allan, 15/08.)
    window.dispatchEvent(new CustomEvent("nav-to", { detail: "suamao" }));
  };

  const streetLabel = (st: StreetName) => (st === "flop" ? "FLOP" : st === "turn" ? "TURN" : "RIVER");

  // ---------- Tela de configuração ----------
  // ⚠ Porta de entrada única (decisão do Allan, 15/08): o Rua por Rua SEMPRE
  // começa na aba "Sua Mão" (HandLab), que carrega a mão real, a posição e o
  // stack do spot. A tela de setup solto (que zerava tudo ao fechar) foi
  // substituída por esta porta acolhedora. O spec fica salvo no localStorage
  // até o jogador começar o treino — pode fechar e reabrir sem perder.
  if (!hand) {
    return (
      <div className="train-view">
        <div className="panel ultra-panel">
          <div className="ultra-badge">🛣️ {t("street.gate.title" as TransKey)}</div>
          <h3>{t("street.gate.title" as TransKey)}</h3>
          <p className="ultra-sub">{t("street.gate.body" as TransKey)}</p>
          <button
            className="btn primary ultra-start"
            onClick={() => window.dispatchEvent(new CustomEvent("nav-to", { detail: "suamao" }))}
          >
            {t("street.gate.btn" as TransKey)}
          </button>
        </div>
      </div>
    );
  }

  // ---------- Tela da rua ----------
  const ctxNow = ctxFor({ street: current, board: boardSoFar, heroAction: null, villainAction: null }, s);
  const isDone = current === "river" && streetDec.river.hero !== null;

  // Flop: escolhe o board inteiro. Turn/river: a carta JÁ vem pré-escolhida
  // (combo) e aparece como "Carta: X (trocar)" — troca livre antes de decidir.
  const flopPresetsVisible = current === "flop" && !streetDec.flop.hero;
  const isPostFlop = current === "turn" || current === "river";
  const postKey = current as Exclude<StreetName, "flop">;
  const postPick = isPostFlop ? (extraChoice[postKey] ?? EXTRA_PRESETS[postKey][0]) : null;

  const openRangeFor = (who: "hero" | "villain"): Record<string, number> =>
    who === "villain" ? villainRange : {};

  return (
    <div className="train-view">
      <div className="panel">
        <div className="ss-head">
          <button className="btn tiny" onClick={back}>{t("ultra.change")}</button>
          <span className="train-session">
            {t("street.score" as TransKey, { s: score, t: streetScoreTotal })}
          </span>
          {isDevUnlocked("rua2026") ? (
            <button
              className={`btn tiny ${studyMode ? "devlock-on" : "devlock-off"}`}
              onClick={() => setStudyMode((v) => !v)}
              aria-label={t("street.studyMode" as TransKey)}
            >
              🎬 {t("street.studyMode" as TransKey)}
            </button>
          ) : null}
        </div>

        {/* Barra de progresso da rua */}
        <div className="ss-progress">
          {(["flop", "turn", "river"] as StreetName[]).map((st) => {
            const done = streetDec[st].hero !== null;
            const active = st === current;
            return (
              <div key={st} className={`ss-progress-step ${done ? "done" : ""} ${active ? "active" : ""}`}>
                <span className="ss-progress-dot">{done ? "✓" : streetLabel(st).charAt(0)}</span>
                <span className="ss-progress-label">{streetLabel(st)}</span>
              </div>
            );
          })}
        </div>

        {/* Arena com a mesa e o board */}
        <div className="arena">
          <div className="arena-top">
            <span className="arena-title">🛣️ {t("street.streetTitle" as TransKey, { street: streetLabel(current) })}</span>
          </div>

          <div className="duel spotlight">
            {/* Assento do vilão — TOCÁVEL: abre o range dele na hora */}
            <div
              className="duel-seat villain ss-tap-seat"
              role="button"
              tabIndex={0}
              aria-label={t("street.tapVillain" as TransKey)}
              onClick={() => { setShowVillainRange((v) => !v); setShowHeroRange(false); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowVillainRange((v) => !v); setShowHeroRange(false); } }}
            >
              <div className="villain-av">
                <span className="villain-emoji">🦈</span>
                <span className="duel-pos vil">{villainPos}</span>
              </div>
              <div className="duel-cards">
                <CardBack small />
                <CardBack small />
              </div>
              <span className="ss-tap-hint">👆 {t("street.tapVillain" as TransKey)}</span>
            </div>

            <div className="duel-center">
              <div className="duel-chip" aria-hidden />
              <div className="duel-pot">{t("ultra.pot", { bb: ctxNow.potBB })}</div>
              <div className="street-board">
                {boardSoFar.cards.map((c, i) => (
                  <CardView key={i} card={c} small />
                ))}
                {Array.from({ length: 3 - boardSoFar.cards.length }, (_, i) => (
                  <CardBack key={`b${i}`} small />
                ))}
              </div>
              <div className="street-board-note">{boardNarration(boardSoFar, texture)}</div>
              <div className="duel-vs">VS</div>
            </div>

            {/* Seu assento — TOCÁVEL: abre o seu range na hora */}
            <div
              className="duel-seat hero ss-tap-seat"
              role="button"
              tabIndex={0}
              aria-label={t("street.tapHero" as TransKey)}
              onClick={() => { setShowHeroRange((v) => !v); setShowVillainRange(false); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowHeroRange((v) => !v); setShowVillainRange(false); } }}
            >
              <div className="duel-badge turn">{t("ultra.yourTurn")}</div>
              <div className="duel-cards big">
                {hand.hero.map((c, i) => (
                  <CardView key={i} card={c} />
                ))}
              </div>
              <div className="duel-name">
                <span className="duel-pos hero">{heroPos}</span>
                {t("ultra.you")} · {effBB}bb
              </div>
              <span className="ss-tap-hint">👆 {t("street.tapHero" as TransKey)}</span>
            </div>
          </div>
        </div>

        {/* Painel de range (aberto pelo toque no assento OU pelo botão) */}
        {(showHeroRange || showVillainRange) ? (
          <div className="train-result">
            <div className="street-reaction">
              {showVillainRange && streetDec[current].villain
                ? `🦈 ${t("street.reacted" as TransKey, { action: t((`street.act.${streetDec[current].villain}`) as TransKey) })}`
                : showVillainRange
                  ? "🦈 " + t("street.tapVillainOpen" as TransKey)
                  : "👀 " + t("street.myRangeOpen" as TransKey)}
            </div>

            {showHeroRange ? (
              <div className="street-grid-box">
                <div className="ultra-grid-title">{t("street.myRangeTitle" as TransKey)}</div>
                <StreetRangeGrid grid={heroGrid} highlight={heroHandType!} cellNote={t("street.myRangeNote" as TransKey)} />
                <RangeLegend mode="hero" />
              </div>
            ) : null}

            {showVillainRange ? (
              <div className="street-grid-box">
                <div className="ultra-grid-title">{t("street.villainRangeTitle" as TransKey)}</div>
                <VillainRangeGrid range={openRangeFor("villain")} cellNote={t("street.villainRangeNote" as TransKey)} />
                <RangeLegend mode="villain" />
              </div>
            ) : null}

            {/* Botões de range continuam como redundância acessível */}
            <div className="street-range-btns">
              <button className={`btn ${showHeroRange ? "primary" : "ghost"}`} onClick={() => { setShowHeroRange((v) => !v); setShowVillainRange(false); }}>
                👀 {t("street.myRange" as TransKey)}
              </button>
              <button className={`btn ${showVillainRange ? "primary" : "ghost"}`} onClick={() => { setShowVillainRange((v) => !v); setShowHeroRange(false); }}>
                🔍 {t("street.villainRange" as TransKey)}
              </button>
            </div>
          </div>
        ) : null}

        {/* Flop: escolhe o board inteiro (combinado: o jogador escolhe o flop). */}
        {flopPresetsVisible ? (
          <div className="street-pick">
            <span className="street-pick-label">🎲 {t("street.pickFlop" as TransKey)}</span>
            <div className="street-pick-opts">
              {FLOP_PRESETS.map((p) => (
                <button
                  key={p.id}
                  className={`btn size ${flopChoice?.id === p.id ? "primary" : ""}`}
                  onClick={() => setFlopChoice(p)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Turn/river: carta pré-escolhida + troca compacta (não trava o fluxo). */}
        {isPostFlop && !streetDec[current].hero ? (
          <div className="street-card-pick">
            <span className="street-card-pick-label">
              🃏 {t("street.cardChosen" as TransKey, { street: streetLabel(current), card: postPick ? postPick.label.split(" ")[0] : "—" })}
            </span>
            {swapMode === postKey ? (
              <div className="street-pick-opts">
                {EXTRA_PRESETS[postKey].map((p) => (
                  <button
                    key={p.id}
                    className={`btn size ${postPick?.id === p.id ? "primary" : ""}`}
                    onClick={() => { setExtraChoice((c) => ({ ...c, [postKey]: p })); setSwapMode(null); }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            ) : (
              <button className="btn ghost ss-swap-btn" onClick={() => setSwapMode(postKey)}>
                ⇄ {t("street.swapCard" as TransKey)}
              </button>
            )}
          </div>
        ) : null}

        {/* Modo Estudo 🎬: o app decide por você mostrando a grade antes */}
        {studyMode && !streetDec[current].hero ? (
          <div className="train-actions">
            <button
              className="btn ghost"
              style={{ flexBasis: "100%", maxWidth: "100%" }}
              onClick={() => decideWithEngine()}
            >
              🎬 {t("street.studyPlay" as TransKey)}
            </button>
          </div>
        ) : null}

        {/* Botões de ação da rua */}
        {!streetDec[current].hero && !studyMode ? (
          <div className="train-actions">
            <button className="btn primary" onClick={() => decide("fold")}>FOLD</button>
            <button className="btn primary" onClick={() => decide("check")}>CHECK</button>
            <button className="btn primary" onClick={() => decide("call")}>CALL</button>
            <button className="btn primary" onClick={() => decide("betSmall")}>APOSTA ½ POTE</button>
            <button className="btn primary" onClick={() => decide("betBig")}>APOSTA ¾ POTE</button>
          </div>
        ) : null}

        {/* Reação do vilão na rua atual */}
        {streetDec[current].villain && !isDone ? (
          <div className="street-reaction">
            🦈 {t("street.reacted" as TransKey, { action: t((`street.act.${streetDec[current].villain}`) as TransKey) })}
          </div>
        ) : null}

        {/* Fim: showdown + timeline */}
        {isDone ? (
          <div className="street-final">
            <div className="street-final-title">🏁 {t("street.final" as TransKey)}</div>
            <div className="street-final-cards">
              <div className="street-final-hand">
                <span>Você ({heroHandType})</span>
                <div className="street-final-deck">
                  {hand.hero.map((c, i) => <CardView key={i} card={c} />)}
                </div>
              </div>
              <div className="street-final-hand">
                <span>Vilão ({villainHandType})</span>
                <div className="street-final-deck">
                  {hand.villain.map((c, i) => <CardView key={i} card={c} />)}
                </div>
              </div>
            </div>
            <div className="street-timeline">
              {steps.map((st, i) => (
                <div key={i} className="street-tl-item">
                  <span className="street-tl-st">{streetLabel(st.street)}</span>
                  <span>{describeBoard(st.board)} — você {t((`street.act.${st.heroAction}`) as TransKey)}, vilão {t((`street.act.${st.villainAction}`) as TransKey)}</span>
                </div>
              ))}
            </div>
            <div className="street-final-score">{t("street.finalScore" as TransKey, { s: score, t: streetScoreTotal })}</div>
            <button className="btn primary train-next" onClick={start}>{t("street.playAgain" as TransKey)}</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ----------------------------- Grades da rua -----------------------------

const RANKS_GRID = "AKQJT98765432".split("");

function cellHand(i: number, j: number): string {
  if (i === j) return RANKS_GRID[i] + RANKS_GRID[i];
  if (i < j) return RANKS_GRID[i] + RANKS_GRID[j] + "s";
  return RANKS_GRID[j] + RANKS_GRID[i] + "o";
}

/** Célula selecionada da grade (mini-card: mão + frequência). */
function CellCard({ handType, freq, note }: { handType: string; freq: number | null; note: string | null }) {
  return (
    <div className="ss-cell-card">
      <span className="ss-cell-card-hand">{handType}</span>
      {freq !== null ? (
        <span className="ss-cell-card-freq">
          {note ? `${note} · ` : ""}{Math.round(freq * 100)}%
        </span>
      ) : (
        note ? <span className="ss-cell-card-freq">{note}</span> : null
      )}
    </div>
  );
}

/** Grade do range recomendado do herói (aposta=âmbar, check=azul, fold=cinza).
 *  Células tocáveis: mostra a mão + categoria da célula. */
function StreetRangeGrid({ grid, highlight, cellNote }: { grid: ReturnType<typeof heroRecommendedGrid>; highlight: string; cellNote?: string }) {
  const [cell, setCell] = useState<string | null>(null);
  return (
    <div className="rg-grid spot-grid">
      {Array.from({ length: 13 }, (_, i) =>
        Array.from({ length: 13 }, (_, j) => {
          const hand = cellHand(i, j);
          const c = grid.find((g) => g.handType === hand);
          const cat = c?.category ?? "fold";
          let bg = "#191c13";
          let fg = "#5f6350";
          if (cat === "bet") { bg = "rgba(212,175,55,0.85)"; fg = "#12140c"; }
          else if (cat === "check") { bg = "rgba(76,175,125,0.65)"; fg = "#0d1f16"; }
          const isHl = highlight === hand;
          const isSelected = cell === hand;
          return (
            <div
              key={`${i}-${j}`}
              className={`rg-cell ${i === j ? "pair" : ""} ${isHl ? "hl" : ""} ${isSelected ? "sel" : ""}`}
              style={{ background: bg, color: fg }}
              role="button"
              tabIndex={0}
              aria-label={hand}
              title={hand}
              onClick={() => setCell((v) => (v === hand ? null : hand))}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCell((v) => (v === hand ? null : hand)); } }}
            >
              {hand.replace("o", "").replace("s", "")}
              <span className="rg-suit">{hand.endsWith("s") ? "s" : hand.endsWith("o") ? "o" : ""}</span>
            </div>
          );
        }),
      )}
      {cell ? (
        <CellCard
          handType={cell}
          freq={null}
          note={(() => {
            const c = grid.find((g) => g.handType === cell);
            if (!c) return cellNote ?? null;
            if (c.category === "bet") return c.topPair ? "tope de par+ · apostar" : c.draw ? "projeto · semi-bluff" : "apostar (valor)";
            if (c.category === "check") return "check OK";
            return "fold (fora do range)";
          })()}
        />
      ) : null}
    </div>
  );
}

/** Grade do range do vilão: intensidade pela frequência (dourado=forte, azul=continua, cinza=saiu).
 *  Células tocáveis: mostra a mão + % de continuar no range. */
function VillainRangeGrid({ range, cellNote }: { range: Record<string, number>; cellNote?: string }) {
  const [cell, setCell] = useState<string | null>(null);
  return (
    <div className="rg-grid spot-grid">
      {Array.from({ length: 13 }, (_, i) =>
        Array.from({ length: 13 }, (_, j) => {
          const hand = cellHand(i, j);
          const freq = range[hand] ?? 0;
          const alpha = 0.12 + 0.85 * Math.min(1, freq * 2.5);
          let bg = "#191c13";
          let fg = "#5f6350";
          if (freq > 0.66) { bg = `rgba(212,175,55,${alpha})`; fg = "#12140c"; } // mãos fortes
          else if (freq > 0.25) { bg = `rgba(76,130,200,${alpha})`; fg = "#e6eaf2"; } // continua
          const isSelected = cell === hand;
          return (
            <div
              key={`${i}-${j}`}
              className={`rg-cell ${i === j ? "pair" : ""} ${isSelected ? "sel" : ""}`}
              style={{ background: bg, color: fg }}
              role="button"
              tabIndex={0}
              aria-label={`${hand} ${Math.round(freq * 100)}%`}
              title={`${hand} · ${Math.round(freq * 100)}%`}
              onClick={() => setCell((v) => (v === hand ? null : hand))}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCell((v) => (v === hand ? null : hand)); } }}
            >
              {hand.replace("o", "").replace("s", "")}
              <span className="rg-suit">{hand.endsWith("s") ? "s" : hand.endsWith("o") ? "o" : ""}</span>
            </div>
          );
        }),
      )}
      {cell ? (
        <CellCard handType={cell} freq={range[cell] ?? 0} note={cellNote ?? null} />
      ) : null}
    </div>
  );
}
