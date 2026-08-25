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
  // Conversor "por fichas": a pessoa manda a mão em fichas + o valor do big
  // blind; o app calcula o stack em bb (15bb ≠ 20bb pode mudar a decisão).
  const [chipsStr, setChipsStr] = useState("");
  const [bbSizeStr, setBbSizeStr] = useState("");
  const applyChips = (chips: string, bbSize: string) => {
    setChipsStr(chips);
    setBbSizeStr(bbSize);
    const c = parseFloat(chips.replace(/[.,\s]/g, "")); // "15.000" → 15000
    const b = parseFloat(bbSize.replace(/[.,\s]/g, ""));
    if (Number.isFinite(c) && Number.isFinite(b) && b > 0) {
      setCustomBB(Math.max(1, Math.round(c / b)));
    }
  };
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
  // Stack EFETIVO do confronto = o menor dos dois. Se o vilão é mais curto, é o
  // stack dele que manda na ação (por isso digitar o vilão deixa mais verdadeiro).
  const effectiveBB = villainBB != null ? Math.min(stackBB, villainBB) : stackBB;

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
        stackBB: effectiveBB,
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

  const streetThisSpot = () => {
    if (!result) return;
    // O spot vira um treino rua por rua real: a SUA mão, a SUA posição e o spot
    // do vilão — o jogador escolhe o flop/turn/river e decide a cada street.
    // O spec (com hand, board e villainBetBB) é gravado no mesmo cof-sua-mao-spec
    // e o evento cof-open-street abre o StreetTrainer.
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
    localStorage.setItem("cof-sua-mao-spec", JSON.stringify({ ...result.spec }));
    window.dispatchEvent(new CustomEvent("cof-open-street"));
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
              onClick={() => {
                setCustomBB(bb);
                setChipsStr("");
                setBbSizeStr("");
              }}
            >
              {bb}bb
            </button>
          ))}
          {/* Campo pra DIGITAR o valor exato (ex.: 15bb) — destaque dourado. */}
          <input
            type="number"
            inputMode="numeric"
            min={1}
            className="hl-stack-input"
            placeholder={`${STAGE_BB[stage]}`}
            value={customBB ?? ""}
            onChange={(e) => {
              const v = Math.round(parseFloat(e.target.value));
              setCustomBB(Number.isFinite(v) && v > 0 ? v : null);
              setChipsStr("");
              setBbSizeStr("");
            }}
            style={{
              width: 72,
              padding: "8px 10px",
              borderRadius: 10,
              border: "2px solid #e6c454",
              background: "rgba(230,196,84,0.10)",
              color: "#f0e9d2",
              fontWeight: 800,
              fontSize: 15,
              textAlign: "center",
            }}
            aria-label="Digite o stack exato em bb"
          />
          <span className="hl-stack-note" style={{ color: "#e6c454" }}>
            ✍️ digite o valor exato em bb
          </span>
        </div>

        {/* Conversor por fichas: fichas ÷ big blind = stack em bb. */}
        <div
          className="hl-chips-row"
          style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 8 }}
        >
          <span style={{ color: "#b8b29a", fontSize: 13 }}>ou por fichas:</span>
          <input
            type="text"
            inputMode="numeric"
            className="hl-chips-input"
            placeholder="fichas"
            value={chipsStr}
            onChange={(e) => applyChips(e.target.value, bbSizeStr)}
            style={{ width: 96, padding: "8px 10px", borderRadius: 10, border: "1px solid #7a5f1e", background: "rgba(255,255,255,0.04)", color: "#f0e9d2", fontWeight: 700, textAlign: "center" }}
            aria-label="Quantidade de fichas"
          />
          <span style={{ color: "#b8b29a" }}>÷ BB</span>
          <input
            type="text"
            inputMode="numeric"
            className="hl-chips-input"
            placeholder="big blind"
            value={bbSizeStr}
            onChange={(e) => applyChips(chipsStr, e.target.value)}
            style={{ width: 96, padding: "8px 10px", borderRadius: 10, border: "1px solid #7a5f1e", background: "rgba(255,255,255,0.04)", color: "#f0e9d2", fontWeight: 700, textAlign: "center" }}
            aria-label="Valor do big blind em fichas"
          />
          {chipsStr && bbSizeStr && customBB ? (
            <span style={{ color: "#57b06a", fontWeight: 800 }}>= {customBB}bb</span>
          ) : null}
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
          {/* Campo pra DIGITAR o stack exato do vilão (deixa o spot verdadeiro). */}
          <input
            type="number"
            inputMode="numeric"
            min={1}
            className="hl-stack-input"
            placeholder="—"
            value={villainBB ?? ""}
            onChange={(e) => {
              const v = Math.round(parseFloat(e.target.value));
              setVillainBB(Number.isFinite(v) && v > 0 ? v : null);
            }}
            style={{
              width: 72,
              padding: "8px 10px",
              borderRadius: 10,
              border: "2px solid #e6c454",
              background: "rgba(230,196,84,0.10)",
              color: "#f0e9d2",
              fontWeight: 800,
              fontSize: 15,
              textAlign: "center",
            }}
            aria-label="Digite o stack do vilão em bb"
          />
          <span className="hl-stack-note" style={{ color: "#e6c454" }}>
            ✍️ digite o stack do vilão. O efetivo do confronto é o menor dos dois.
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
          <button
            className="btn primary hl-train-btn"
            style={{ marginTop: 8 }}
            onClick={streetThisSpot}
          >
            🛣️ Treinar rua por rua
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
