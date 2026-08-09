// Configuração de torneio + HUD de nível/estágio (com filtro clicável).
//
// DOIS MODOS, NADA TRAVADO:
//   - Treino Livre: exatamente como sempre foi. Qualquer nº de inscritos,
//     qualquer estágio, quantas vezes quiser. Não pontua no ranking.
//   - Circuito: 10 etapas fixas, só a partir do início, valendo ranking.
// Os dois convivem: dá pra estar no meio do circuito e treinar do mesmo jeito.
import { useState, useEffect } from "react";
import {
  BUY_INS,
  BLIND_LEVELS,
  STAGES,
  SPEED_HANDS,
  prizePool,
  payoutLadder,
  type Stage,
  type Speed,
} from "../tournament/structure";
import type { TournamentConfig, TournamentState } from "../app/gameController";
import type { FieldStatus } from "../tournament/field";
import type { SlotMeta } from "../app/tournamentSlots";
import { CircuitPicker } from "./CircuitPicker";
import { NicknamePrompt } from "./NicknamePrompt";
import { getNickname, restoreNickname } from "../lib/nickname";
import { computePoyPoints } from "../tournament/poyPoints";

export type PlayMode = "livre" | "circuito";

function usd(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function num(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

const SPEED_LABEL: Record<Speed, string> = { turbo: "Turbo", normal: "Normal", deep: "Deep" };

export function TournamentSetup({
  onStart,
  saved = [],
  onResume,
  onDiscard,
}: {
  onStart: (cfg: TournamentConfig) => void;
  saved?: SlotMeta[];
  onResume?: (buyIn: number) => void;
  onDiscard?: (buyIn: number) => void;
}) {
  const [buyIn, setBuyIn] = useState(11);
  const [entrants, setEntrants] = useState(500);
  const [stage, setStage] = useState<Stage>("inicio");
  const [speed, setSpeed] = useState<Speed>("normal");
  const [gameType, setGameType] = useState<"nlhe" | "plo">("nlhe");
  const [omahaUnlocked, setOmahaUnlocked] = useState<boolean>(() => {
    return localStorage.getItem("omaha_dev_unlock") === "true";
  });

  // Modo de jogo: Treino Livre (padrão, tudo liberado) ou Circuito (vale ranking).
  const [playMode, setPlayMode] = useState<PlayMode>("livre");
  const [nickname, setNickname] = useState<string | null>(() => getNickname());
  const [askNickname, setAskNickname] = useState(false);
  /** Etapa escolhida no circuito, guardada enquanto o apelido é definido. */
  const [pendingStage, setPendingStage] = useState<{ index: number; entrants: number } | null>(null);

  // Se o jogador limpou o navegador mas a chave dele existe, recupera o apelido.
  useEffect(() => {
    let alive = true;
    if (!nickname) {
      restoreNickname().then((n) => {
        if (alive && n) setNickname(n);
      });
    }
    return () => {
      alive = false;
    };
  }, [nickname]);

  /** Inicia uma etapa do circuito: sempre do início, inscritos fixos. */
  function startCircuitStage(stageIndex: number, stageEntrants: number) {
    onStart({
      buyIn,
      entrants: stageEntrants,
      stage: "inicio",
      handsPerLevel: SPEED_HANDS[speed],
      variant: "holdem",
      mode: "circuito",
      circuitStage: stageIndex,
    });
  }

  /** Clique numa etapa: pede o apelido primeiro, se ainda não existir. */
  function handlePickStage(stageIndex: number, stageEntrants: number) {
    if (!nickname) {
      setPendingStage({ index: stageIndex, entrants: stageEntrants });
      setAskNickname(true);
      return;
    }
    startCircuitStage(stageIndex, stageEntrants);
  }

  const pool = prizePool(buyIn, Math.max(1, entrants));
  const ladder = payoutLadder(Math.max(1, entrants), pool);
  const stageInfo = STAGES[stage];
  const level = BLIND_LEVELS[stageInfo.levelIndex];
  const avgBB = stageInfo.avgBB;
  const savedBuyIns = new Set(saved.map((s) => s.buyIn));
  const icmLabel =
    stageInfo.icm === "final" ? "Mesa final (ICM cheio)"
      : stageInfo.icm === "bubble" ? "Bolha (pressão de ICM)"
      : "Sem ICM (longe do dinheiro)";

  return (
    <div className="tourney">
      {/* Modo: Treino Livre (tudo liberado) ou Circuito (vale ranking). */}
      <div className="mode-switch">
        <button
          className={`mode-btn ${playMode === "livre" ? "on" : ""}`}
          onClick={() => setPlayMode("livre")}
        >
          <span className="mode-icon">🎯</span>
          <span className="mode-name">Treino Livre</span>
          <span className="mode-desc">Jogue como quiser</span>
        </button>
        <button
          className={`mode-btn ${playMode === "circuito" ? "on" : ""}`}
          onClick={() => setPlayMode("circuito")}
        >
          <span className="mode-icon">🏆</span>
          <span className="mode-name">Circuito</span>
          <span className="mode-desc">Vale ranking</span>
        </button>
      </div>

      {playMode === "circuito" ? (
        <div className="circuit-col">
          <div className="t-field circuit-buyin panel">
            <label>Faixa de buy-in</label>
            <div className="t-btns">
              {BUY_INS.map((b) => (
                <button
                  key={b.value}
                  className={`tab ${buyIn === b.value ? "active" : ""}`}
                  onClick={() => setBuyIn(b.value)}
                >
                  {b.label}
                </button>
              ))}
            </div>
            <span className="t-suffix">
              Cada faixa tem o próprio circuito e o próprio ranking.
            </span>
          </div>

          <CircuitPicker buyIn={buyIn} nickname={nickname} onPick={handlePickStage} />

          <div className="panel circuit-freehint">
            Quer treinar antes de encarar uma etapa? O{" "}
            <button className="link-btn" onClick={() => setPlayMode("livre")}>
              Treino Livre
            </button>{" "}
            continua liberado, com qualquer nº de inscritos e qualquer estágio.
            Estar no circuito não trava nada.
          </div>

          {askNickname ? (
            <NicknamePrompt
              onDone={(nick) => {
                setNickname(nick);
                setAskNickname(false);
                const pend = pendingStage;
                setPendingStage(null);
                if (pend) startCircuitStage(pend.index, pend.entrants);
              }}
              onCancel={() => {
                setAskNickname(false);
                setPendingStage(null);
              }}
            />
          ) : null}
        </div>
      ) : (
        <>
      {saved.length > 0 ? (
        <div className="panel saved-panel">
          <h3>Torneios salvos ({saved.length})</h3>
          <div className="legend" style={{ marginBottom: 8 }}>
            Um save por faixa de buy-in — volte a qualquer um de onde parou.
          </div>
          {saved.map((s) => (
            <div key={s.buyIn} className="saved-row">
              <div className="saved-info">
                <b>${s.buyIn}</b> · {STAGES[s.stage].label} · {Math.round(s.heroStack / s.bb)}bb
                <br />
                <small>
                  {s.fieldRemaining.toLocaleString("en-US")} / {s.entrants.toLocaleString("en-US")} vivos
                </small>
              </div>
              <div className="saved-actions">
                <button className="btn primary" onClick={() => onResume?.(s.buyIn)}>
                  Continuar
                </button>
                <button className="btn tiny" onClick={() => onDiscard?.(s.buyIn)}>
                  descartar
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="panel">
        <h3>Montar torneio</h3>

        <div className="t-field">
          <label>Modalidade</label>
          <div className="t-btns">
            <button
              className={`tab ${gameType === "nlhe" ? "active" : ""}`}
              onClick={() => setGameType("nlhe")}
            >
              NL Hold'em
            </button>
            <button
              className={`tab ${gameType === "plo" ? "active" : ""}`}
              onClick={() => {
                if (omahaUnlocked) {
                  setGameType("plo");
                } else {
                  const code = prompt("🔒");
                  if (code === "omaha2026") {
                    localStorage.setItem("omaha_dev_unlock", "true");
                    setOmahaUnlocked(true);
                    setGameType("plo");
                  } else {
                    alert("Omaha (PLO) em desenvolvimento. Disponível em breve!");
                  }
                }
              }}
              title={omahaUnlocked ? "Omaha (PLO)" : "Em breve — Omaha (PLO)"}
              style={omahaUnlocked ? {} : { opacity: 0.5, cursor: "not-allowed" }}
            >
              {omahaUnlocked ? "Omaha" : "Omaha 🔒"}
            </button>
          </div>
        </div>

        <div className="t-field">
          <label>Buy-in</label>
          <div className="t-btns">
            {BUY_INS.map((b) => (
              <button
                key={b.value}
                className={`tab ${buyIn === b.value ? "active" : ""}`}
                onClick={() => setBuyIn(b.value)}
              >
                {b.label}
                {savedBuyIns.has(b.value) ? " 💾" : ""}
              </button>
            ))}
          </div>
        </div>

        <div className="t-field">
          <label>Inscritos</label>
          <input
            type="number"
            min={2}
            value={entrants}
            onChange={(e) => setEntrants(Number(e.target.value))}
          />
        </div>

        <div className="t-field">
          <label>Estágio</label>
          <div className="t-btns">
            {(Object.keys(STAGES) as Stage[]).map((s) => (
              <button
                key={s}
                className={`tab ${stage === s ? "active" : ""}`}
                onClick={() => setStage(s)}
              >
                {STAGES[s].label}
              </button>
            ))}
          </div>
        </div>

        <div className="t-field">
          <label>Velocidade</label>
          <div className="t-btns">
            {(Object.keys(SPEED_HANDS) as Speed[]).map((s) => (
              <button
                key={s}
                className={`tab ${speed === s ? "active" : ""}`}
                onClick={() => setSpeed(s)}
                title={`Blinds sobem a cada ${SPEED_HANDS[s]} mãos`}
              >
                {SPEED_LABEL[s]}
              </button>
            ))}
          </div>
          <span className="t-suffix">blinds a cada {SPEED_HANDS[speed]} mãos</span>
        </div>

        {savedBuyIns.has(buyIn) ? (
          <div className="legend" style={{ color: "var(--warn)", marginBottom: 6 }}>
            ⚠ Você já tem um torneio de ${buyIn} salvo — iniciar um novo vai substituí-lo.
          </div>
        ) : null}

        <button
          className="btn primary"
          style={{ marginTop: 10 }}
          onClick={() =>
            onStart({
              buyIn,
              entrants: Math.max(2, entrants),
              stage,
              handsPerLevel: SPEED_HANDS[speed],
              variant: gameType === "plo" ? "omaha" : "holdem",
              mode: "livre",
            })
          }
        >
          Iniciar torneio
        </button>

        <div className="free-note">
          🎯 <b>Treino Livre</b> — sem ranking, sem limite. Jogue quantas vezes
          quiser, em qualquer estágio.
          {stage === "inicio" ? (
            <>
              {" "}Vencer este torneio valeria{" "}
              <b>
                {num(
                  computePoyPoints({
                    stage: "inicio",
                    entrants: Math.max(2, entrants),
                    buyIn,
                    finishPosition: 1,
                  }).points,
                )}{" "}
                pontos
              </b>{" "}
              no Circuito.
            </>
          ) : null}
        </div>
      </div>

      {/* Prévia */}
      <div className="panel">
        <h3>Prévia</h3>
        <div className="t-preview">
          <div className="t-prize">{usd(pool)}</div>
          <div className="t-prize-lbl">premiação estimada · {icmLabel}</div>
        </div>
        <table className="stats" style={{ marginTop: 8 }}>
          <tbody>
            <tr><td className="pname">1º lugar</td><td>{usd(ladder[0] ?? 0)}</td></tr>
            <tr><td className="pname">2º lugar</td><td>{usd(ladder[1] ?? 0)}</td></tr>
            <tr><td className="pname">3º lugar</td><td>{usd(ladder[2] ?? 0)}</td></tr>
            <tr><td className="pname">Mínima (min-cash)</td><td>{usd(ladder[ladder.length - 1] ?? 0)}</td></tr>
            <tr><td className="pname">Nível de blind</td><td>{level.sb}/{level.bb}</td></tr>
            <tr><td className="pname">Stack médio</td><td>~{avgBB}bb</td></tr>
          </tbody>
        </table>
        <div className="legend" style={{ marginTop: 8 }}>
          Os stacks são <b>desiguais</b> (como no real): há chip leaders e curtos.
          Perto da bolha/mesa final, os bots apertam por ICM.
        </div>
      </div>
        </>
      )}
    </div>
  );
}

export function TournamentHUD({
  t,
  field,
  onSetLevel,
}: {
  t: TournamentState;
  field?: FieldStatus | null;
  onSetLevel: (idx: number) => void;
}) {
  const level = BLIND_LEVELS[t.levelIndex];
  const stageLabel = STAGES[t.stage].label;
  return (
    <div className="hud">
      <div className="hud-item">
        <span className="hud-lbl">Estágio</span>
        <span className="hud-val">{stageLabel}</span>
      </div>
      {field ? (
        <>
          <div className="hud-item">
            <span className="hud-lbl">Jogadores</span>
            <span className="hud-val">
              {num(field.remaining)} / {num(field.entrants)}
            </span>
          </div>
          <div className="hud-item">
            <span className="hud-lbl">Sua posição</span>
            <span className="hud-val">
              {field.heroRank}º{" "}
              <small className="hud-sub">
                {field.inMoney
                  ? `· ITM ${usd(field.currentCash)} 💰`
                  : `· ${num(field.toBubble)} até a bolha`}
              </small>
            </span>
          </div>
        </>
      ) : null}
      <div className="hud-item">
        <span className="hud-lbl">Premiação</span>
        <span className="hud-val">{usd(t.prizePool)}</span>
      </div>
      <div className="hud-item hud-levels">
        <span className="hud-lbl">Nível (clique p/ mudar) · blinds {level.sb}/{level.bb}</span>
        <div className="t-btns">
          {BLIND_LEVELS.map((l, i) => (
            <button
              key={l.level}
              className={`lvl ${i === t.levelIndex ? "active" : ""}`}
              onClick={() => onSetLevel(i)}
              title={`${l.sb}/${l.bb}`}
            >
              {l.level}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
