// Calculadora de ICM: digite stacks e prêmios, veja o valor de cada stack em $
// e a equity necessária para pagar um all-in perto da bolha.
import { useMemo, useState } from "react";
import { icmEquity, requiredEquityToCall, bubbleFactor } from "../ranges/icm";

export function IcmCalculator() {
  const [stacks, setStacks] = useState<number[]>([5000, 3000, 2000, 1000]);
  const [payouts, setPayouts] = useState<number[]>([50, 30, 20]);
  const [hero, setHero] = useState(3); // por padrão o short (na bolha)
  const [villain, setVillain] = useState(0); // contra o líder que o cobre

  const totalPrize = payouts.reduce((a, b) => a + b, 0);
  const totalChips = stacks.reduce((a, b) => a + b, 0);

  const values = useMemo(() => icmEquity(stacks, payouts), [stacks, payouts]);

  const safeHero = Math.min(hero, stacks.length - 1);
  const safeVillain = Math.min(villain, stacks.length - 1);
  const chips = Math.min(stacks[safeHero] ?? 0, stacks[safeVillain] ?? 0);
  const spot = { stacks, payouts, hero: safeHero, villain: safeVillain, chips };

  const reqEq = safeHero !== safeVillain && chips > 0 ? requiredEquityToCall(spot) : null;
  const bf = safeHero !== safeVillain && chips > 0 ? bubbleFactor(spot) : null;

  const setStack = (i: number, v: number) =>
    setStacks((s) => s.map((x, j) => (j === i ? Math.max(0, v || 0) : x)));
  const setPayout = (i: number, v: number) =>
    setPayouts((p) => p.map((x, j) => (j === i ? Math.max(0, v || 0) : x)));

  return (
    <div className="icm">
      <div className="icm-cols">
        {/* Entradas */}
        <div className="panel">
          <h3>Stacks (fichas)</h3>
          {stacks.map((s, i) => (
            <div className="icm-row" key={i}>
              <span className="icm-lbl">Jogador {i + 1}</span>
              <input
                type="number"
                value={s}
                min={0}
                onChange={(e) => setStack(i, Number(e.target.value))}
              />
              <button
                className="btn tiny"
                disabled={stacks.length <= 2}
                onClick={() => setStacks((a) => a.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            className="btn tiny"
            disabled={stacks.length >= 9}
            onClick={() => setStacks((a) => [...a, 1000])}
          >
            + jogador
          </button>
          <div className="icm-total">Total em fichas: {totalChips}</div>
        </div>

        <div className="panel">
          <h3>Prêmios ($)</h3>
          {payouts.map((p, i) => (
            <div className="icm-row" key={i}>
              <span className="icm-lbl">{i + 1}º lugar</span>
              <input
                type="number"
                value={p}
                min={0}
                onChange={(e) => setPayout(i, Number(e.target.value))}
              />
              <button
                className="btn tiny"
                disabled={payouts.length <= 1}
                onClick={() => setPayouts((a) => a.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            className="btn tiny"
            disabled={payouts.length >= stacks.length}
            onClick={() => setPayouts((a) => [...a, 10])}
          >
            + prêmio
          </button>
          <div className="icm-total">Premiação total: {totalPrize}</div>
        </div>
      </div>

      {/* Valor de cada stack em $ */}
      <div className="panel">
        <h3>Valor de cada stack (ICM)</h3>
        <table className="stats">
          <thead>
            <tr>
              <th>Jogador</th>
              <th>Fichas</th>
              <th>% fichas</th>
              <th>Valor $</th>
              <th>% do prêmio</th>
            </tr>
          </thead>
          <tbody>
            {stacks.map((s, i) => (
              <tr key={i}>
                <td className="pname">Jogador {i + 1}</td>
                <td>{s}</td>
                <td>{totalChips > 0 ? `${Math.round((s / totalChips) * 100)}%` : "—"}</td>
                <td>{values[i].toFixed(2)}</td>
                <td>{totalPrize > 0 ? `${Math.round((values[i] / totalPrize) * 100)}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="legend" style={{ marginTop: 8 }}>
          Repare: o stack maior vale, em %, <b>menos</b> que sua fatia de fichas —
          é o ICM em ação (fichas não valem linearmente).
        </div>
      </div>

      {/* Confronto de all-in / pressão de bolha */}
      <div className="panel">
        <h3>All-in: equity necessária para pagar</h3>
        <div className="icm-spot">
          <label>
            Herói:
            <select value={safeHero} onChange={(e) => setHero(Number(e.target.value))}>
              {stacks.map((_, i) => (
                <option key={i} value={i}>
                  Jogador {i + 1}
                </option>
              ))}
            </select>
          </label>
          <label>
            Vilão:
            <select value={safeVillain} onChange={(e) => setVillain(Number(e.target.value))}>
              {stacks.map((_, i) => (
                <option key={i} value={i}>
                  Jogador {i + 1}
                </option>
              ))}
            </select>
          </label>
          <span className="icm-lbl">Fichas em jogo: {chips}</span>
        </div>

        {reqEq !== null && bf !== null ? (
          <div className="icm-result">
            <div className="icm-big">{Math.round(reqEq * 100)}%</div>
            <div className="icm-desc">
              equity necessária para pagar este all-in (dobrar ou quebrar).
              <br />
              Bubble factor: <b>{bf.toFixed(2)}</b>{" "}
              {bf > 1.05
                ? "— há pressão de ICM: pague mais apertado que as pot odds sugeririam."
                : "— pouca ou nenhuma pressão de ICM aqui."}
            </div>
          </div>
        ) : (
          <div className="legend">Escolha herói e vilão diferentes (com fichas) para calcular.</div>
        )}
      </div>
    </div>
  );
}
