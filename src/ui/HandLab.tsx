// ---------------------------------------------------------------------------
// Aba "Sua Mão" — Monte sua mão real.
//
// O jogador reconstrói o spot que viveu (ou que viu): sua posição, situação,
// posição do vilão, as DUAS CARTAS na mão, estágio do torneio e stack. O app
// calcula a decisão correta com o motor de torneio e explica em duas vozes:
//
//   SIMPLES  🟡 — a voz de um amigo recreativo (sem jargão)
//   TÉCNICO  ⚫ — o vocabulário dos grandes (range, equity, ICM, shove-or-fold)
//
// Botão "Treinar esse spot" → leva ao Treino 1×1 já configurado na mesma
// situação (via localStorage cof-sua-mao-spec, lido pelo UltraTrainer).
// ---------------------------------------------------------------------------
import { cardsToString } from '../engine/cards';
import { TrainingShareButton } from './TrainingShareButton';
import { useEffect, useMemo, useState } from "react";

import { POSITIONS, type Position } from "../ranges/types";
import { recordDecision } from "../train/decisionStats";
import { markActiveToday } from "../train/streak";
import {
  analyzeHand,
  parseHand,
  RANK_OPTIONS,
  STAGE_BB,
  STAGE_LABEL,
  SITUATION_LABEL,
  SUIT_OPTIONS,
  type SituationKey,
  type StageKey,
} from "../train/stage";

type Mode = "simple" | "technical";

const STACK_PRESETS = [10, 20, 40, 60, 100];

function cardText(rank: string, suit: string): string {
  return `${rank}${suit}`;
}

export function HandLab() {
  const [hero, setHero] = useState<Position>("BTN");
  const [villain, setVillain] = useState<Position>("CO");
  const [situation, setSituation] = useState<SituationKey>("vsopen");
  const [stage, setStage] = useState<StageKey>("early");
  const [customBB, setCustomBB] = useState<number | null>(null);
  const [villainBB, setVillainBB] = useState<number | null>(null);
  const [rank1, setRank1] = useState("K");
  const [suit1, setSuit1] = useState("s");
  const [rank2, setRank2] = useState("Q");
  const [suit2, setSuit2] = useState("h");
  const [mode, setMode] = useState<Mode>("simple");
  const [result, setResult] = useState<ReturnType<typeof analyzeHand> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Ao montar, lê um spec que veio do botão "Treinar esse spot" do resultado.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("cof-sua-mao-spec");
      if (raw) {
        const s = JSON.parse(raw);
        localStorage.removeItem("cof-sua-mao-spec");
        if (s?.heroPosition && s?.villainPosition && s?.situation && s?.stage && s?.stackBB) {
          setHero(s.heroPosition);
          setVillain(s.villainPosition);
          setSituation(s.situation);
          setStage(s.stage);
          setCustomBB(s.stackBB);
          if (s.villainStackBB) setVillainBB(s.villainStackBB);
        }
      }
    } catch {
      /* ignora */
    }
  }, []);

  const hand = useMemo(
    () => parseHand(cardText(rank1, suit1) + cardText(rank2, suit2)),
    [rank1, suit1, rank2, suit2],
  );
  const stackBB = customBB ?? STAGE_BB[stage];

  const analyze = () => {
    setErr(null);
    setResult(null);
    if (!hand) {
      setErr("Cartas inválidas — escolha duas cartas diferentes.");
      return;
    }
    setResult(
      analyzeHand({
        heroPosition: hero,
        villainPosition: villain,
        situation,
        stage,
        stackBB,
        hand,
      }),
    );
    markActiveToday();
  };

  const trainThisSpot = () => {
    if (!result) return;
    // O spot vira um treino 1×1 real: a decisão conta pro raio-x e f arma áurea.
    const key =
      result.recommended === "fold"
        ? "fold"
        : result.recommended === "call"
          ? "call"
          : result.recommended === "allin"
            ? "allin"
            : "raise";
    recordDecision(key);
    markActiveToday();
    localStorage.setItem(
      "cof-sua-mao-spec",
      JSON.stringify({ ...result.spec }),
    );
    window.dispatchEvent(new CustomEvent("cof-open-ultra"));
  };

  return (
    <div className="handlab">
      <header className="handlab-head">
        <h2 className="handlab-title">Monte sua mão real</h2>
        <p className="handlab-sub">
          Reconstrói o spot que te tirou do torneio — o app te mostra o que era,
          na voz de um amigo e na voz de um pro.
        </p>
      </header>

      <section className="handlab-form">
        <label className="hl-label">Sua posição</label>
        <select
          className="hl-select"
          value={hero}
          onChange={(e) => setHero(e.target.value as Position)}
        >
          {POSITIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <label className="hl-label">Situação</label>
        <select
          className="hl-select"
          value={situation}
          onChange={(e) => setSituation(e.target.value as SituationKey)}
        >
          {Object.entries(SITUATION_LABEL).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>

        {situation !== "open" && (
          <>
            <label className="hl-label">Posição do vilão</label>
            <select
              className="hl-select"
              value={villain}
              onChange={(e) => setVillain(e.target.value as Position)}
            >
              {POSITIONS.filter((p) => p !== hero).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </>
        )}

        <label className="hl-label">Estágio do torneio</label>
        <div className="hl-stage-row">
          {(Object.keys(STAGE_LABEL) as StageKey[]).map((s) => (
            <button
              key={s}
              className={`hl-stage-btn${stage === s ? " on" : ""}`}
              onClick={() => {
                setStage(s);
                setCustomBB(null);
              }}
            >
              {STAGE_LABEL[s]}
            </button>
          ))}
        </div>

        <label className="hl-label">Suas cartas</label>
        <div className="hl-hand-grid">
          {([
            { r: rank1, s: suit1, setR: setRank1, setS: setSuit1, n: 1 },
            { r: rank2, s: suit2, setR: setRank2, setS: setSuit2, n: 2 },
          ] as const).map((c) => (
            <div key={c.n} className="hl-card-picker">
              <select
                className="hl-select hl-select-rank"
                value={c.r}
                onChange={(e) => c.setR(e.target.value)}
              >
                {RANK_OPTIONS.map((rk) => (
                  <option key={rk} value={rk}>
                    {rk}
                  </option>
                ))}
              </select>
              <select
                className="hl-select hl-select-suit"
                value={c.s}
                onChange={(e) => c.setS(e.target.value)}
              >
                {SUIT_OPTIONS.map((su) => (
                  <option key={su.key} value={su.key}>
                    {su.symbol} {su.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <label className="hl-label">Stack efetivo (bb)</label>
        <div className="hl-stack-row">
          {STACK_PRESETS.map((bb) => (
            <button
              key={bb}
              className={`hl-stack-btn${customBB === bb ? " on" : ""}`}
              onClick={() => setCustomBB(bb)}
            >
              {bb}bb
            </button>
          ))}
          <span className="hl-stack-note">
            O estágio define o padrão ({stackBB}bb). Escolha um valor fixo para
            ajustar.
          </span>
        </div>

        <label className="hl-label">Stack do vilão (bb)</label>
        <div className="hl-stack-row">
          {STACK_PRESETS.map((bb) => (
            <button
              key={bb}
              className={`hl-stack-btn${villainBB === bb ? " on" : ""}`}
              onClick={() => setVillainBB(bb)}
            >
              {bb}bb
            </button>
          ))}
          <span className="hl-stack-note">
            Informativo — aparece no resumo do spot. O stack efetivo do confronto
            já é calculado pelo menor dos dois stacks.
          </span>
        </div>

        <button className="btn primary hl-analyze-btn" onClick={analyze}>
          ANALISAR MINHA MÃO
        </button>
        {err && <p className="hl-err">{err}</p>}
      </section>

      {result && (
        <section className="hl-result">
          <div className="hl-verdict">
            <span className="hl-verdict-tag">
              {result.recommended === "allin"
                ? "ALL-IN"
                : result.recommended === "fold"
                  ? "FOLD"
                  : result.recommended === "call"
                    ? "CALL"
                    : "RAISE"}
            </span>
            <p className="hl-verdict-ctx">
              {result.handType} · {result.context}
            </p>
            <p className="hl-verdict-note">{result.verdict.text}</p>
          </div>

          <div className="hl-mode-row">
            <button
              className={`hl-mode-btn${mode === "simple" ? " on simple" : ""}`}
              onClick={() => setMode("simple")}
            >
              🟡 Simples
            </button>
            <button
              className={`hl-mode-btn${mode === "technical" ? " on tech" : ""}`}
              onClick={() => setMode("technical")}
            >
              ⚫ Técnico
            </button>
          </div>

          <div className={`hl-voice-card ${mode}`}>
            <p className="hl-voice-title">
              {mode === "simple" ? "Na voz de um amigo" : "No vocabulário de pro"}
            </p>
            <p className="hl-voice-body">
              {mode === "simple" ? result.simple : result.technical}
            </p>
          </div>

          <button className="btn primary hl-train-btn" onClick={trainThisSpot}>
            🎯 Treinar esse spot
          </button>
                  {/* Compartilhar resultado */}
          <div className="mt-4">
            <TrainingShareButton
              data={{
                trainingType: "Hand Lab",
                spot: `${result.spec.heroPosition} vs ${result.spec.villainPosition} · ${result.spec.stackBB}bb${villainBB ? ` (vilão ${villainBB}bb)` : ""}`,
                score: result.recommended.toUpperCase(),
                accuracy: "—",
                rating: result.handType,
                heroCards: cardsToString(result.spec.hand),
              }}
              label="📤 Compartilhar análise"
            />
          </div>
        </section>
      )}
    </div>
  );
}
