// ---------------------------------------------------------------------------
// STREET TRAINER — treino rua por rua com ranges dinâmicos (Fase 1).
//
// Módulo NOVO e isolado em UI (não toca o motor). Fluxo:
//   1. Configura o spot (mesma tela do UltraTrainer + vilão)
//   2. Escolhe o board de cada rua (presets + aleatório)
//   3. Por rua: decide a ação · "Ver meu range" · "🔍 Range do vilão"
//   4. Timeline final com a linha da mão completa
//
// Usa o motor novo `src/train/streets/dynamicRanges` (só leitura dos motores).
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from "react";
import { CardView, CardBack } from "./Card";
import { useT } from "../i18n";
import type { TransKey } from "../i18n/translations";
import { POSITIONS, comboToHandType, type Position } from "../ranges/types";
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
        const s = JSON.parse(raw) as HandLabSpec;
        if (!s.hand || s.hand.length < 2) return null;
        return {
          heroHand: s.hand.slice(0, 2),
          heroPosition: s.heroPosition,
          villainPosition: s.villainPosition,
          effBB: s.stackBB,
        };
      } catch {
        return null;
      }
    };
    const existing = readSpec();
    if (existing) {
      localStorage.removeItem("cof-sua-mao-spec");
      setPrefill(existing);
    }
    const onOpenStreet = () => {
      const spec = readSpec();
      localStorage.removeItem("cof-sua-mao-spec");
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
    setFlopChoice(flopChoice ?? FLOP_PRESETS[0]);
    setExtraChoice({ turn: TURN_PRESETS[0], river: RIVER_PRESETS[0] });
    setShowHeroRange(false);
    setShowVillainRange(false);
    setStreetDec({ flop: { hero: null, villain: null }, turn: { hero: null, villain: null }, river: { hero: null, villain: null } });
    setScore(0);
    setStreetScoreTotal(0);
    setPrefill(null);
  }, [prefill]);

  const start = () => {
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
    setFlopChoice(flopChoice ?? FLOP_PRESETS[0]);
    setExtraChoice({ turn: TURN_PRESETS[0], river: RIVER_PRESETS[0] });
    setShowHeroRange(false);
    setShowVillainRange(false);
    setStreetDec({ flop: { hero: null, villain: null }, turn: { hero: null, villain: null }, river: { hero: null, villain: null } });
    setScore(0);
    setStreetScoreTotal(0);
  };

  const reset = () => {
    setHand(null);
    setSteps([]);
    setShowHeroRange(false);
    setShowVillainRange(false);
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

    // Avança de rua
    if (current === "flop") setCurrent("turn");
    else if (current === "turn") setCurrent("river");
    setShowHeroRange(false);
    setShowVillainRange(false);
  };

  const back = () => {
    reset();
  };

  const streetLabel = (st: StreetName) => (st === "flop" ? "FLOP" : st === "turn" ? "TURN" : "RIVER");

  // ---------- Tela de configuração ----------
  if (!hand) {
    return (
      <div className="train-view">
        <div className="panel ultra-panel">
          <div className="ultra-badge">🛣️ {t("street.badge" as TransKey)}</div>
          <h3>{t("street.title" as TransKey)}</h3>
          <p className="ultra-sub">{t("street.subtitle" as TransKey)}</p>

          <label className="ultra-field">
            <span>{t("ultra.heroPos")}</span>
            <select value={heroPos} onChange={(e) => setHeroPos(e.target.value as Position)}>
              {POSITIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>

          <label className="ultra-field">
            <span>{t("ultra.villainPos")}</span>
            <select value={villainPos} onChange={(e) => setVillainPos(e.target.value as Position)}>
              {POSITIONS.filter((p) => p !== "BB").map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>

          <div className="ultra-field">
            <span>{t("street.effStack" as TransKey, { bb: effBB })}</span>
            <div className="ultra-stacks">
              {[10, 20, 40, 60, 100].map((v) => (
                <button key={v} className={`btn size ${effBB === v ? "primary" : ""}`} onClick={() => setEffBB(v)}>
                  {v}bb
                </button>
              ))}
            </div>
          </div>

          <button className="btn primary ultra-start" onClick={start}>
            {t("street.start" as TransKey)}
          </button>
        </div>
      </div>
    );
  }

  // ---------- Tela da rua ----------
  const ctxNow = ctxFor({ street: current, board: boardSoFar, heroAction: null, villainAction: null }, s);
  const isDone = current === "river" && streetDec.river.hero !== null;

  const presets = current === "flop" ? FLOP_PRESETS : EXTRA_PRESETS[current as Exclude<StreetName, "flop">];
  const choice = current === "flop" ? flopChoice : extraChoice[current as Exclude<StreetName, "flop">];
  const setChoice = current === "flop"
    ? (p: BoardPreset) => setFlopChoice(p)
    : (p: BoardPreset) => setExtraChoice((c) => ({ ...c, [current]: p }));

  return (
    <div className="train-view">
      <div className="panel">
        <div className="ss-head">
          <button className="btn tiny" onClick={back}>{t("ultra.change")}</button>
          <span className="train-session">
            {t("street.score" as TransKey, { s: score, t: streetScoreTotal })}
          </span>
        </div>

        {/* Arena com a mesa e o board */}
        <div className="arena">
          <div className="arena-top">
            <span className="arena-title">🛣️ {t("street.streetTitle" as TransKey, { street: streetLabel(current) })}</span>
          </div>

          <div className="duel spotlight">
            <div className="duel-seat villain">
              <div className="villain-av">
                <span className="villain-emoji">🦈</span>
                <span className="duel-pos vil">{villainPos}</span>
              </div>
              <div className="duel-cards">
                <CardBack small />
                <CardBack small />
              </div>
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

            <div className="duel-seat hero">
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
            </div>
          </div>
        </div>

        {/* Escolha do board (antes de decidir) */}
        {!streetDec[current].hero ? (
          <>
            <div className="street-pick">
              <span className="street-pick-label">🎲 {t("street.pickBoard" as TransKey, { street: streetLabel(current) })}</span>
              <div className="street-pick-opts">
                {presets.map((p) => (
                  <button
                    key={p.id}
                    className={`btn size ${choice?.id === p.id ? "primary" : ""}`}
                    onClick={() => setChoice(p)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {choice ? (
              <div className="train-actions">
                <button className="btn primary" onClick={() => decide("fold")}>FOLD</button>
                <button className="btn primary" onClick={() => decide("check")}>CHECK</button>
                <button className="btn primary" onClick={() => decide("call")}>CALL</button>
                <button className="btn primary" onClick={() => decide("betSmall")}>APOSTA ½ POTE</button>
                <button className="btn primary" onClick={() => decide("betBig")}>APOSTA ¾ POTE</button>
              </div>
            ) : null}
          </>
        ) : (
          // Decidiu: feedback + ranges
          <div className="train-result">
            <div className="street-reaction">
              🦈 {t("street.reacted" as TransKey, { action: t((`street.act.${streetDec[current].villain ?? "check"}`) as TransKey) })}
            </div>

            <div className="street-range-btns">
              <button className="btn primary" onClick={() => { setShowHeroRange((v) => !v); setShowVillainRange(false); }}>
                👀 {t("street.myRange" as TransKey)}
              </button>
              <button className="btn primary" onClick={() => { setShowVillainRange((v) => !v); setShowHeroRange(false); }}>
                🔍 {t("street.villainRange" as TransKey)}
              </button>
            </div>

            {showHeroRange ? (
              <div className="street-grid-box">
                <div className="ultra-grid-title">{t("street.myRangeTitle" as TransKey)}</div>
                <StreetRangeGrid grid={heroRecommendedGrid(boardSoFar, heroPos, villainPos, effBB, false, ctxNow.potBB)} highlight={heroHandType!} />
                <div className="rg-note">{t("street.myRangeNote" as TransKey)}</div>
              </div>
            ) : null}

            {showVillainRange ? (
              <div className="street-grid-box">
                <div className="ultra-grid-title">{t("street.villainRangeTitle" as TransKey)}</div>
                <VillainRangeGrid range={villainRange} />
                <div className="rg-note">{t("street.villainRangeNote" as TransKey)}</div>
              </div>
            ) : null}
          </div>
        )}

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

/** Grade do range recomendado do herói (aposta=âmbar, check=azul, fold=cinza). */
function StreetRangeGrid({ grid, highlight }: { grid: ReturnType<typeof heroRecommendedGrid>; highlight: string }) {
  return (
    <div className="rg-grid spot-grid">
      {Array.from({ length: 13 }, (_, i) =>
        Array.from({ length: 13 }, (_, j) => {
          const hand = cellHand(i, j);
          const cell = grid.find((c) => c.handType === hand);
          const cat = cell?.category ?? "fold";
          let bg = "#191c13";
          let fg = "#5f6350";
          if (cat === "bet") { bg = "rgba(212,175,55,0.85)"; fg = "#12140c"; }
          else if (cat === "check") { bg = "rgba(76,175,125,0.65)"; fg = "#0d1f16"; }
          const isHl = highlight === hand;
          return (
            <div
              key={`${i}-${j}`}
              className={`rg-cell ${i === j ? "pair" : ""} ${isHl ? "hl" : ""}`}
              style={{ background: bg, color: fg }}
              title={hand}
            >
              {hand.replace("o", "").replace("s", "")}
              <span className="rg-suit">{hand.endsWith("s") ? "s" : hand.endsWith("o") ? "o" : ""}</span>
            </div>
          );
        }),
      )}
    </div>
  );
}

/** Grade do range do vilão: intensidade pela frequência (dourado=forte, azul=continua, cinza=saiu). */
function VillainRangeGrid({ range }: { range: Record<string, number> }) {
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
          return (
            <div
              key={`${i}-${j}`}
              className={`rg-cell ${i === j ? "pair" : ""}`}
              style={{ background: bg, color: fg }}
              title={`${hand} · ${Math.round(freq * 100)}%`}
            >
              {hand.replace("o", "").replace("s", "")}
              <span className="rg-suit">{hand.endsWith("s") ? "s" : hand.endsWith("o") ? "o" : ""}</span>
            </div>
          );
        }),
      )}
    </div>
  );
}
