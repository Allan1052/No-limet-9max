// Configuração de torneio + HUD de nível/estágio (com filtro clicável).
import { useState } from "react";
import {
  BUY_INS,
  BLIND_LEVELS,
  STAGES,
  prizePool,
  payoutLadder,
  type Stage,
} from "../tournament/structure";
import type { TournamentConfig, TournamentState } from "../app/gameController";

function usd(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

export function TournamentSetup({ onStart }: { onStart: (cfg: TournamentConfig) => void }) {
  const [buyIn, setBuyIn] = useState(11);
  const [entrants, setEntrants] = useState(500);
  const [stage, setStage] = useState<Stage>("mesa_final");
  const [handsPerLevel, setHandsPerLevel] = useState(10);

  const pool = prizePool(buyIn, Math.max(1, entrants));
  const ladder = payoutLadder(Math.max(1, entrants), pool);
  const stageInfo = STAGES[stage];
  const level = BLIND_LEVELS[stageInfo.levelIndex];
  const avgBB = stageInfo.avgBB;
  const icmLabel =
    stageInfo.icm === "final" ? "Mesa final (ICM cheio)"
      : stageInfo.icm === "bubble" ? "Bolha (pressão de ICM)"
      : "Sem ICM (longe do dinheiro)";

  return (
    <div className="tourney">
      <div className="panel">
        <h3>Montar torneio</h3>

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
          <label>Blinds sobem a cada</label>
          <input
            type="number"
            min={0}
            value={handsPerLevel}
            onChange={(e) => setHandsPerLevel(Number(e.target.value))}
            style={{ width: 70 }}
          />
          <span className="t-suffix">mãos (0 = fixo)</span>
        </div>

        <button
          className="btn primary"
          style={{ marginTop: 10 }}
          onClick={() => onStart({ buyIn, entrants: Math.max(2, entrants), stage, handsPerLevel })}
        >
          Iniciar torneio
        </button>
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
    </div>
  );
}

export function TournamentHUD({
  t,
  onSetLevel,
}: {
  t: TournamentState;
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
      <div className="hud-item">
        <span className="hud-lbl">Premiação</span>
        <span className="hud-val">{usd(t.prizePool)}</span>
      </div>
      <div className="hud-item">
        <span className="hud-lbl">Prêmios (1º/2º/3º)</span>
        <span className="hud-val">
          {usd(t.ladder[0] ?? 0)} / {usd(t.ladder[1] ?? 0)} / {usd(t.ladder[2] ?? 0)}
        </span>
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
