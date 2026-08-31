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
import { InstagramAnswerCardActions } from './InstagramAnswerCardActions';
import { HandLabReferenceShare } from "./HandLabReferenceShare";
import { useEffect, useMemo, useState } from "react";

import { POSITIONS, type Position } from "../ranges/types";
import { recordDecision } from "../train/decisionStats";
import { markActiveToday } from "../train/streak";
import { generateThreeFasesCard, generateAutoCard, isGenEnabled } from "../app/seriesGen";
import {
  analyzeHand,
  parseHand,
  RANK_OPTIONS,
  STAGE_BB,
  STAGE_LABEL,
  contextSeal,
  SITUATION_LABEL,
  SUIT_OPTIONS,
  phasePressureLabel,
  type SituationKey,
  type StageKey,
  type FinalTableSpec,
} from "../train/stage";
import { FinalTableSituation } from "./FinalTableSituation";

type Mode = "simple" | "technical";

const STACK_PRESETS = [10, 20, 40, 60, 100];

function cardText(rank: string, suit: string): string {
  return `${rank}${suit}`;
}

export function HandLab() {
  const [hero, setHero] = useState<Position>("BTN");
  const [villain, setVillain] = useState<Position>("CO");
  const [situation, setSituation] = useState<SituationKey>("vsopen");
  const [stage, setStage] = useState<StageKey>("inicio");
  // Ante ligado por padrão: MTT moderno quase sempre tem ante (dead money que
  // alarga o roubo). ~1bb de dead money representa o big blind ante padrão.
  const [withAnte, setWithAnte] = useState(true);
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
  const [showWhyNot, setShowWhyNot] = useState(false);
  const [showPhases, setShowPhases] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof analyzeHand> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // Situação real da mesa final/bolha (ICM do spot do jogador) — opcional.
  const [ftSit, setFtSit] = useState<FinalTableSpec | null>(null);
  // Gerador de cards ESCONDIDO (só ligado via URL secreta ?gen=allan).
  const [genMsg, setGenMsg] = useState<string | null>(null);

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
    setShowWhyNot(false);
    setShowPhases(false);
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
        // Stack real do vilão (quando informado) para estimar a largura do shove
        // pela profundidade dele, não pelo efetivo.
        villainStackBB: villainBB ?? undefined,
        hand,
        anteBB: withAnte ? 1 : 0,
        finalTable: (stage === "bolha" || stage === "mesa_final") ? ftSit ?? undefined : undefined,
      }),
    );
    markActiveToday();
  };

  const trainThisSpot = () => {
    if (!result) return;
    // O spot vira um treino 1×1 real: a decisão conta pro raio-x.
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

        {(stage === "bolha" || stage === "mesa_final") && (
          <FinalTableSituation value={ftSit} onChange={setFtSit} />
        )}

        <label className="hl-label">Ante (torneio)</label>
        <div className="hl-stage-row">
          <button
            className={`hl-stage-btn${withAnte ? " on" : ""}`}
            onClick={() => setWithAnte(true)}
          >
            Com ante
          </button>
          <button
            className={`hl-stage-btn${!withAnte ? " on" : ""}`}
            onClick={() => setWithAnte(false)}
          >
            Sem ante
          </button>
          <span className="hl-stack-note">
            Com ante o pote já tem fichas mortas — dá pra abrir/roubar um pouco
            mais largo.
          </span>
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
          <div
            style={{
              display: "inline-block",
              margin: "0 auto 10px",
              padding: "4px 12px",
              borderRadius: 20,
              border: "1px solid #7a5f1e",
              background: "rgba(230,196,84,0.08)",
              color: "#e6c454",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.3,
              textAlign: "center",
            }}
          >
            🎓 {contextSeal(result.spec)}
          </div>
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

          {mode === "simple" ? (
            <div className="hl-voice-card simple">
              <p className="hl-voice-title">Na voz de um amigo</p>
              <p className="hl-voice-body">{result.simple}</p>
            </div>
          ) : (
            <div className="hl-technical-breakdown" aria-label="Explicação técnica da decisão">
              <div className="hl-explain-block">
                <span className="hl-explain-kicker">1 · PREMISSA</span>
                <p>{result.handType} · {result.context}</p>
              </div>
              <div className="hl-explain-block hl-explain-action">
                <span className="hl-explain-kicker">2 · AÇÃO</span>
                <p>{result.verdict.text}</p>
              </div>
              <div className="hl-explain-block">
                <span className="hl-explain-kicker">3 · MOTIVO</span>
                <p>{result.technical}</p>
              </div>
              {result.whyNot ? (
                <div className="hl-explain-block hl-explain-alt">
                  <span className="hl-explain-kicker">4 · ALTERNATIVA</span>
                  <p><b>Por que não {result.whyNot.label}?</b> {result.whyNot.text}</p>
                </div>
              ) : null}
            </div>
          )}

          <p
            style={{
              margin: "10px 2px 0",
              color: "#b8b29a",
              fontSize: 13,
              fontStyle: "italic",
              lineHeight: 1.45,
            }}
          >
            {result.anchor}
          </p>

          {mode === "simple" && result.whyNot ? (
            <div style={{ margin: "10px 0 4px" }}>
              {!showWhyNot ? (
                <button
                  onClick={() => setShowWhyNot(true)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px dashed #7a5f1e",
                    background: "rgba(230,196,84,0.06)",
                    color: "#e6c454",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  🤔 Por que não {result.whyNot.label}?
                </button>
              ) : (
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid #7a5f1e",
                    background: "rgba(230,196,84,0.05)",
                  }}
                >
                  <p style={{ margin: 0, color: "#e6c454", fontWeight: 700, fontSize: 13 }}>
                    Por que não {result.whyNot.label}?
                  </p>
                  <p style={{ margin: "6px 0 0", color: "#efe9d8", fontSize: 14, lineHeight: 1.45 }}>
                    {result.whyNot.text}
                  </p>
                </div>
              )}
            </div>
          ) : null}

          <div style={{ margin: "10px 0 4px" }}>
            {!showPhases ? (
              <button
                onClick={() => setShowPhases(true)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px dashed #7a5f1e",
                  background: "rgba(230,196,84,0.06)",
                  color: "#e6c454",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                📊 A mesma mão nas 4 fases do torneio
              </button>
            ) : (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #7a5f1e",
                  background: "rgba(230,196,84,0.05)",
                }}
              >
                <p style={{ margin: "0 0 8px", color: "#e6c454", fontWeight: 700, fontSize: 13 }}>
                  {result.handType} · {result.spec.heroPosition} · {Math.round(result.spec.stackBB)}bb — nas 4 fases do torneio:
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  {([
                    { st: "inicio", label: "Início" },
                    { st: "meio", label: "Meio" },
                    { st: "bolha", label: "Bolha" },
                    { st: "mesa_final", label: "Mesa Final" },
                  ] as const).map(({ st, label }) => {
                    const a = analyzeHand({ ...result.spec, stage: st });
                    const act =
                      a.recommended === "allin" ? "ALL-IN"
                        : a.recommended === "raise" ? "RAISE"
                          : a.recommended.toUpperCase();
                    const col = a.recommended === "fold" ? "#e07b6b" : "#57b06a";
                    const pr = phasePressureLabel(st);
                    return (
                      <div
                        key={st}
                        style={{
                          flex: 1,
                          textAlign: "center",
                          padding: "8px 4px",
                          borderRadius: 10,
                          background: "rgba(0,0,0,0.25)",
                        }}
                      >
                        <div style={{ color: "#b8b29a", fontSize: 11, fontWeight: 700 }}>{label}</div>
                        <div style={{ color: col, fontSize: 15, fontWeight: 900, marginTop: 3 }}>{act}</div>
                        <div style={{ color: "#8a7f5a", fontSize: 9, marginTop: 3, lineHeight: 1.2 }}>{pr.tag}</div>
                      </div>
                    );
                  })}
                </div>
                <p style={{ margin: "8px 0 0", color: "#b8b29a", fontSize: 12, fontStyle: "italic" }}>
                  Mesma mão — o que muda é a pressão de premiação (ICM). No <b>Início/Meio</b> o preço é
                  em <b>fichas</b>; o ICM de verdade entra na <b>Bolha/Mesa Final</b> (ou quando você detalha a mesa).
                </p>
              </div>
            )}
          </div>

          <button className="btn primary hl-train-btn" onClick={trainThisSpot}>
            🎯 Treinar no 1×1
          </button>
          <div
            className="hl-coming-soon"
            role="note"
            style={{
              marginTop: 10,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px dashed rgba(230,196,84,0.35)",
              background: "rgba(230,196,84,0.05)",
              color: "#b8b29a",
              fontSize: 12.5,
              lineHeight: 1.45,
              textAlign: "center",
            }}
          >
            🛣️ <b style={{ color: "#e6c454" }}>Rua por Rua disponível em breve.</b> Estamos validando o acesso público; por enquanto, use o treino 1×1 e o replayer da mão.
          </div>
          {isGenEnabled() && (
            <div style={{ marginTop: 8 }}>
              <button
                className="btn"
                style={{ width: "100%", background: "#2a2416", border: "1px solid #7a5f1e", color: "#e6c454" }}
                onClick={async () => {
                  setGenMsg("Gerando…");
                  try {
                    const name = await generateThreeFasesCard(result.spec);
                    setGenMsg(`✅ ${name}`);
                  } catch (e) {
                    setGenMsg(`❌ ${e instanceof Error ? e.message : "erro"}`);
                  }
                }}
              >
                📸 Gerar card 3 Fases (privado)
              </button>
              <button
                className="btn"
                style={{ width: "100%", marginTop: 6, background: "#2a2416", border: "1px solid #7a5f1e", color: "#e6c454" }}
                onClick={async () => {
                  setGenMsg("Gerando…");
                  try {
                    const { name, kind } = await generateAutoCard(result.spec);
                    setGenMsg(`✅ ${kind === "fases" ? "4 fases" : "decisão única"}: ${name}`);
                  } catch (e) {
                    setGenMsg(`❌ ${e instanceof Error ? e.message : "erro"}`);
                  }
                }}
              >
                🏆 Gerar card RESPOSTA (automático)
              </button>
              {genMsg && (
                <p style={{ margin: "6px 0 0", color: "#b8b29a", fontSize: 12, textAlign: "center" }}>{genMsg}</p>
              )}
            </div>
          )}
          <InstagramAnswerCardActions spec={result.spec} />
          <HandLabReferenceShare analysis={result} />
        </section>
      )}
    </div>
  );
}
