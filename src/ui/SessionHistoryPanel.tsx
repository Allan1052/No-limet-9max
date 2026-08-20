// ---------------------------------------------------------------------------
// Painel de Hand History com filtros.
// Permite revisar todas as mãos da sessão filtrando por decisão do herói,
// avaliação do coach (rating) e resultado da mão.
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import { rankOf, suitOf, RANKS, type Card } from "../engine/cards";
import type { HandHistory } from "../app/replay";
import type { FeedbackItem } from "../feedback/analyzer";

const SUIT_SYMBOL = ["♣", "♦", "♥", "♠"];
const SUIT_RED = [false, true, true, false];

export type HistoryFilter = "todos" | "fold" | "call" | "raise";
export type RatingFilter = "todos" | "boa" | "ok" | "imprecisa" | "ruim";

export function SessionHistoryPanel({
  hands,
  onClose,
  onSelectHand,
}: {
  hands: HandHistory[];
  onClose: () => void;
  onSelectHand: (idx: number) => void;
}) {
  const [decisionFilter, setDecisionFilter] = useState<HistoryFilter>("todos");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("todos");

  const filtered = useMemo(() => {
    return hands
      .map((h, idx) => ({ h, idx }))
      .filter(({ h }) => {
        // Filtrar por decisão do herói
        if (decisionFilter !== "todos") {
          const heroDecisions = (h.handFeedback ?? []).filter(
            (f) => matchesHeroDecision(f, decisionFilter),
          );
          if (heroDecisions.length === 0) return false;
          // Se o filtro é de rating também, garantir que a decisão filtrada tem o rating certo
          if (ratingFilter !== "todos") {
            if (!heroDecisions.some((f) => f.rating === ratingFilter)) return false;
          }
        } else if (ratingFilter !== "todos") {
          // Só filtro de rating
          if (!(h.handFeedback ?? []).some((f) => f.rating === ratingFilter)) return false;
        }
        return true;
      })
      .reverse(); // Mais recente primeiro
  }, [hands, decisionFilter, ratingFilter]);

  return (
    <div className="overlay" onClick={onClose} style={{ zIndex: 9000 }}>
      <div
        style={{
          background: "#0d0f0d",
          border: "1px solid #3a3a3a",
          borderRadius: 12,
          width: "min(95vw, 460px)",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: "16px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ color: "#d4af37", margin: 0, fontSize: 20 }}>📋 Histórico de Mãos</h2>
          <button className="btn" onClick={onClose} style={{ fontSize: 14, padding: "4px 10px" }}>✕</button>
        </div>

        {/* Filtros de decisão */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          {(["todos", "fold", "call", "raise"] as HistoryFilter[]).map((f) => (
            <button
              key={f}
              className="btn"
              onClick={() => setDecisionFilter(f)}
              style={{
                fontSize: 12,
                padding: "4px 10px",
                background: decisionFilter === f ? "#d4af37" : "transparent",
                color: decisionFilter === f ? "#0d0f0d" : "#ece7d5",
                border: `1px solid ${decisionFilter === f ? "#d4af37" : "#3a3a3a"}`,
              }}
            >
              {f === "todos" ? "Todas" : f === "fold" ? "Fold" : f === "call" ? "Call" : "Raise/Aggro"}
            </button>
          ))}
        </div>

        {/* Filtros de rating */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {(["todos", "boa", "ok", "imprecisa", "ruim"] as RatingFilter[]).map((r) => {
            const icons: Record<string, string> = { todos: "📊", boa: "✓", ok: "○", imprecisa: "⚠", ruim: "✗" };
            return (
              <button
                key={r}
                className="btn"
                onClick={() => setRatingFilter(r)}
                style={{
                  fontSize: 12,
                  padding: "4px 10px",
                  background: ratingFilter === r ? "#d4af37" : "transparent",
                  color: ratingFilter === r ? "#0d0f0d" : "#ece7d5",
                  border: `1px solid ${ratingFilter === r ? "#d4af37" : "#3a3a3a"}`,
                }}
              >
                {icons[r]} {r === "todos" ? "Todas" : r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            );
          })}
        </div>

        {/* Lista de mãos */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "#8a8a7a", padding: 20, fontSize: 14 }}>
            Nenhuma mão encontrada com esses filtros.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.map(({ h, idx }) => (
              <HandRow key={`${idx}-${h.events.length}`} h={h} onClick={() => onSelectHand(idx)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function matchesHeroDecision(f: FeedbackItem, filter: HistoryFilter): boolean {
  if (filter === "fold") return f.heroAction.toLowerCase() === "fold";
  if (filter === "call") return f.heroAction.toLowerCase() === "call";
  if (filter === "raise") return f.heroAction.toLowerCase().includes("raise") || f.heroAction.toLowerCase().includes("bet") || f.heroAction.toLowerCase().includes("jam") || f.heroAction.toLowerCase().includes("all");
  return true;
}

function HandRow({ h, onClick }: { h: HandHistory; onClick: () => void }) {
  const heroCards = h.holeCards[h.heroSeat] ?? [];
  const heroWin = h.result?.winningsBySeat[h.heroSeat] ?? 0;
  const lastHeroDecision = (h.handFeedback ?? [])
    .filter((f) => f.heroAction.toLowerCase() !== "check")
    .pop();

  const ratingColor: Record<string, string> = {
    boa: "#4ade80",
    ok: "#fbbf24",
    imprecisa: "#f97316",
    ruim: "#ef4444",
  };

  const ratingIcon: Record<string, string> = {
    boa: "✓",
    ok: "○",
    imprecisa: "⚠",
    ruim: "✗",
  };

  const boardStr = h.finalBoard.length > 0
    ? `${h.finalBoard.length} cartas`
    : "—";

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 8,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        cursor: "pointer",
        transition: "background 0.15s",
      }}
    >
      {/* Cartas do herói */}
      <div style={{ display: "flex", gap: 4, minWidth: 56 }}>
        {heroCards.length > 0 ? (
          heroCards.map((c, i) => (
            <span key={i} style={{ fontSize: 14, fontWeight: 800, color: cardColor(c) }}>
              {cardLabel(c)}
            </span>
          ))
        ) : (
          <span style={{ fontSize: 12, color: "#8a8a7a" }}>—</span>
        )}
      </div>

      {/* Decisão + Rating */}
      <div style={{ flex: 1 }}>
        {lastHeroDecision ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#ece7d5" }}>
              {lastHeroDecision.heroAction}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "1px 6px",
                borderRadius: 8,
                border: `1px solid ${ratingColor[lastHeroDecision.rating] ?? "#8a8a7a"}`,
                color: ratingColor[lastHeroDecision.rating] ?? "#8a8a7a",
                background: "transparent",
                lineHeight: "14px",
              }}
            >
              {ratingIcon[lastHeroDecision.rating]} {capitalize(lastHeroDecision.rating)}
            </span>
          </div>
        ) : (
          <span style={{ fontSize: 12, color: "#8a8a7a" }}>Sem decisão</span>
        )}
        <div style={{ fontSize: 11, color: "#8a8a7a", marginTop: 1 }}>
          Board: {boardStr} · {h.bigBlind}bb
          {heroWin > 0 && <span style={{ color: "#4ade80" }}> · Ganhou!</span>}
          {heroWin <= 0 && h.result && <span style={{ color: "#8a8a7a" }}> · Perdeu</span>}
        </div>
      </div>

      <span style={{ fontSize: 12, color: "#d4af37" }}>▶</span>
    </div>
  );
}

function cardLabel(card: Card): string {
  const r = rankOf(card);
  const s = suitOf(card);
  const rank = RANKS[r - 2];
  const suit = SUIT_SYMBOL[s];
  return `${rank}${suit}`;
}

function cardColor(card: Card): string {
  // Fundo escuro do painel (#0d0f0d): naipe preto NUNCA em preto (#1c1c1c
  // sumia do card = a "carta fantasma" que o Allan relatou). Off-white para
  // naipes pretos e vermelho vivo para os vermelhos.
  return SUIT_RED[suitOf(card)] ? "#e55b4f" : "#e8e4d4";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
