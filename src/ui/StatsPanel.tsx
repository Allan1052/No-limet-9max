// Painel de estatísticas da sessão: VPIP, PFR, 3-bet% por jogador.
import type { StatRow } from "../feedback/stats";

export function StatsPanel({ rows, onReset }: { rows: StatRow[]; onReset: () => void }) {
  return (
    <div className="panel">
      <div className="stats-head">
        <h3>Estatísticas da sessão</h3>
        <button className="btn tiny" onClick={onReset}>
          zerar
        </button>
      </div>
      <table className="stats">
        <thead>
          <tr>
            <th>Jogador</th>
            <th title="Mãos">M</th>
            <th title="Voluntarily Put $ In Pot">VPIP</th>
            <th title="PreFlop Raise">PFR</th>
            <th title="Frequência de 3-bet">3B</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.seat} className={r.isHero ? "hero-row" : ""}>
              <td className="pname">{r.name}</td>
              <td>{r.hands}</td>
              <td>{r.hands > 0 ? `${r.vpip}%` : "—"}</td>
              <td>{r.hands > 0 ? `${r.pfr}%` : "—"}</td>
              <td>{r.threeBet > 0 || r.hands > 3 ? `${r.threeBet}%` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="legend" style={{ marginTop: 8 }}>
        VPIP = quanto entra em potes · PFR = quanto aumenta · 3B = quanto dá
        3-bet. Nit joga baixo; maníaco, alto.
      </div>
    </div>
  );
}
