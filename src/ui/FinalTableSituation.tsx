// ---------------------------------------------------------------------------
// "Situação da mesa final" — inputs opcionais que deixam o ICM ser do SEU spot
// real (não uma mesa final genérica). Pedido do Allan: ser 3º de 6 com curtos
// atrás muda o call (você ladrilha o prêmio quando eles quebram). O motor já
// sabe calcular isso (buildFinalTableIcm); aqui é só a coleta dos dados.
// Aparece só quando o estágio é Bolha ou Mesa Final.
// ---------------------------------------------------------------------------
import type { FinalTableSpec } from "../train/stage";

const DEFAULT: FinalTableSpec = { players: 6, heroRank: 3, shape: "escalonado" };

export function FinalTableSituation({
  value,
  onChange,
}: {
  value: FinalTableSpec | null;
  onChange: (v: FinalTableSpec | null) => void;
}) {
  const on = value != null;
  const v = value ?? DEFAULT;
  const set = (patch: Partial<FinalTableSpec>) => {
    const next = { ...v, ...patch };
    // posição não pode passar do nº de jogadores
    next.heroRank = Math.max(1, Math.min(next.players, next.heroRank));
    onChange(next);
  };

  const chip = (active: boolean): React.CSSProperties => ({
    padding: "6px 12px",
    borderRadius: 10,
    border: `1px solid ${active ? "#e6c454" : "#4a3d17"}`,
    background: active ? "rgba(230,196,84,0.14)" : "rgba(0,0,0,0.2)",
    color: active ? "#e6c454" : "#b8b29a",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
  });

  return (
    <div style={{ margin: "10px 0 4px", border: "1px solid #4a3d17", borderRadius: 12, padding: "12px 14px", background: "rgba(230,196,84,0.03)" }}>
      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "#e6c454", fontWeight: 700, fontSize: 14 }}>
        <input type="checkbox" checked={on} onChange={() => onChange(on ? null : DEFAULT)} />
        🏆 Detalhar minha situação na mesa (ICM do seu spot)
      </label>

      {on && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ color: "#b8b29a", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Jogadores na mesa</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button key={n} style={chip(v.players === n)} onClick={() => set({ players: n })}>{n}</button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ color: "#b8b29a", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Sua posição em fichas (1º = líder)</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Array.from({ length: v.players }, (_, i) => i + 1).map((r) => (
                <button key={r} style={chip(v.heroRank === r)} onClick={() => set({ heroRank: r })}>{r}º</button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ color: "#b8b29a", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Formato dos stacks</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={chip(v.shape === "equilibrado")} onClick={() => set({ shape: "equilibrado" })}>⚖️ Parecidos</button>
              <button style={chip(v.shape === "escalonado")} onClick={() => set({ shape: "escalonado" })}>📉 Tem curtos</button>
            </div>
          </div>

          <p style={{ margin: 0, color: "#8a7f5a", fontSize: 12, fontStyle: "italic", lineHeight: 1.4 }}>
            Curtos atrás de você = aperta o call (eles quebram e você sobe no prêmio de graça). Se
            <b> você</b> é o curto, afrouxa (é obrigado a gambar).
          </p>
        </div>
      )}
    </div>
  );
}
