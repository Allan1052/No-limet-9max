// ---------------------------------------------------------------------------
// Painel de XP + Achievements (modal com grid de conquistas).
// ---------------------------------------------------------------------------
import { useState } from "react";
import {
  getXpSummary,
  type AchievementDef,
} from "../app/achievements";

const CATEGORY_LABELS: Record<string, string> = {
  iniciante: "🌱 Iniciante",
  decisao: "🧠 Decisão",
  torneio: "🏆 Torneio",
  avancado: "⭐ Avançado",
};

export function AchievementsPanel({ onClose }: { onClose: () => void }) {
  const [filter, setFilter] = useState<string>("todos");
  const summary = getXpSummary();
  const xpPercent = ((summary.xp % 100) / 100) * 100;

  const filtered =
    filter === "todos"
      ? summary.achievements
      : summary.achievements.filter((a) => a.def.category === filter);

  return (
    <div className="overlay" onClick={onClose} style={{ zIndex: 9000 }}>
      <div
        className="replay"
        style={{
          maxHeight: "90vh",
          overflowY: "auto",
          width: "min(95vw, 480px)",
          padding: "20px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ color: "#d4af37", margin: 0, fontSize: 22 }}>🏆 Conquistas</h2>
          <button className="btn" onClick={onClose} style={{ fontSize: 14 }}>
            ✕
          </button>
        </div>

        {/* XP Bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "#d4af37" }}>
              Nível {summary.level} · {summary.xp} XP
            </span>
            <span style={{ color: "#8a8a7a" }}>
              {summary.xpForNext} XP p/ nível {summary.level + 1}
            </span>
          </div>
          <div style={{ background: "#1a1a1a", borderRadius: 8, height: 12, overflow: "hidden" }}>
            <div
              style={{
                width: `${xpPercent}%`,
                height: "100%",
                background: "linear-gradient(90deg, #d4af37, #e6c454)",
                borderRadius: 8,
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 4, color: "#8a8a7a" }}>
            <span>🔥 {summary.streakDays} dias seguidos</span>
            <span>🃏 {summary.handsPlayed} mãos</span>
            <span>{summary.unlockedCount}/{summary.totalCount} conquistas</span>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {["todos", "iniciante", "decisao", "torneio", "avancado"].map((cat) => (
            <button
              key={cat}
              className="btn"
              onClick={() => setFilter(cat)}
              style={{
                fontSize: 12,
                padding: "4px 10px",
                background: filter === cat ? "#d4af37" : "transparent",
                color: filter === cat ? "#0d0f0d" : "#ece7d5",
                border: `1px solid ${filter === cat ? "#d4af37" : "#3a3a3a"}`,
              }}
            >
              {cat === "todos" ? "Todos" : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Achievements grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(({ def, unlocked }) => (
            <AchievementCard key={def.id} def={def} unlocked={unlocked} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", color: "#8a8a7a", padding: 20, fontSize: 14 }}>
            Nenhuma conquista nesta categoria ainda.
          </div>
        )}
      </div>
    </div>
  );
}

function AchievementCard({ def, unlocked }: { def: AchievementDef; unlocked: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 8,
        background: unlocked ? "rgba(212,175,55,0.1)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${unlocked ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.08)"}`,
        opacity: unlocked ? 1 : 0.5,
        transition: "all 0.2s ease",
      }}
    >
      <span style={{ fontSize: 24 }}>{def.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: unlocked ? "#d4af37" : "#ece7d5" }}>
          {def.name}
          {unlocked && <span style={{ marginLeft: 6, fontSize: 12 }}>✓</span>}
        </div>
        <div style={{ fontSize: 12, color: "#8a8a7a", marginTop: 2 }}>{def.description}</div>
      </div>
      {!unlocked && <span style={{ fontSize: 16 }}>🔒</span>}
    </div>
  );
}
