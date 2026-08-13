// ---------------------------------------------------------------------------
// Painel "Seus Pontos Fracos" (Treino Dirigido).
// Agrega o feedback de TODAS as mãos da sessão, roda o detector de vazamentos
// e mostra os maiores erros recorrentes com dica de correção — o professor
// pessoal apontando onde focar.
// ---------------------------------------------------------------------------
import { useMemo } from "react";
import type { HandHistory } from "../app/replay";
import type { FeedbackItem, Rating } from "../feedback/analyzer";
import { detectLeaks, type Leak } from "../feedback/leaks";

export function LeaksPanel({
  hands,
  onClose,
}: {
  hands: HandHistory[];
  onClose: () => void;
}) {
  const { leaks, total, aligned } = useMemo(() => {
    const items: FeedbackItem[] = [];
    for (const h of hands) if (h.handFeedback) items.push(...h.handFeedback);
    const counts: Record<Rating, number> = { boa: 0, ok: 0, imprecisa: 0, ruim: 0 };
    for (const it of items) counts[it.rating]++;
    const totalDec = items.length;
    return {
      leaks: detectLeaks(items),
      total: totalDec,
      aligned: totalDec > 0 ? Math.round(((counts.boa + counts.ok) / totalDec) * 100) : 0,
    };
  }, [hands]);

  return (
    <div className="overlay" onClick={onClose} style={{ zIndex: 9000 }}>
      <div
        className="replay"
        style={{ maxHeight: "90vh", overflowY: "auto", width: "min(95vw, 480px)", padding: "20px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ color: "#d4af37", margin: 0, fontSize: 22, fontFamily: "'Playfair Display', serif", letterSpacing: "-0.02em" }}>🎯 Seus Pontos Fracos</h2>
          <button className="btn" onClick={onClose} style={{ fontSize: 14, color: "#8a8a7a", background: "none", border: "none", cursor: "pointer" }}>✕</button>
        </div>

        {/* Barra de progresso — % alinhado com o ótimo */}
        {total > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#a8a898", marginBottom: 4 }}>
              <span>{total} decisões analisadas</span>
              <span style={{ color: aligned >= 70 ? "#5fb96a" : aligned >= 50 ? "#d4af37" : "#e06b6b", fontWeight: 600 }}>{aligned}% alinhado</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${aligned}%`,
                  borderRadius: 3,
                  background: aligned >= 70 ? "linear-gradient(90deg, #2d8b4a, #5fb96a)" : aligned >= 50 ? "linear-gradient(90deg, #b8962e, #d4af37)" : "linear-gradient(90deg, #c0392b, #e06b6b)",
                  transition: "width 0.5s ease",
                }}
              />
            </div>
          </div>
        )}

        {total < 5 ? (
          <div style={{ textAlign: "center", color: "#8a8a7a", padding: 32, fontSize: 14, lineHeight: 1.7 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🃏</div>
            Jogue algumas mãos que eu mapeio seus pontos fracos e mostro exatamente
            onde focar o treino.
          </div>
        ) : leaks.length === 0 ? (
          <div style={{ textAlign: "center", color: "#5fb96a", padding: 24, fontSize: 15, lineHeight: 1.6 }}>
            ✅ Nenhum vazamento recorrente até agora. Jogo limpo — continue assim!
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {leaks.map((leak, i) => (
              <LeakCard key={leak.id} leak={leak} rank={i + 1} />
            ))}
            <div style={{ fontSize: 11, color: "#8a8a7a", marginTop: 6, textAlign: "center" }}>
              Ordenado pela gravidade — o de cima é o que mais custa fichas.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LeakCard({ leak, rank }: { leak: Leak; rank: number }) {
  // Cor da faixa por gravidade: erros claros (badCount) puxam pro vermelho.
  const heavy = leak.badCount >= 2 || leak.severity >= 6;
  const accent = heavy ? "#e06b6b" : "#d4af37";
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 8,
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${accent}55`,
        borderLeft: `4px solid ${accent}`,
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 700, color: accent, minWidth: 22 }}>#{rank}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#ece7d5" }}>{leak.title}</div>
          <span
            style={{
              fontSize: 11,
              color: accent,
              border: `1px solid ${accent}`,
              borderRadius: 10,
              padding: "1px 8px",
              whiteSpace: "nowrap",
            }}
          >
            {leak.count}×{leak.badCount > 0 ? ` · ${leak.badCount} grave${leak.badCount > 1 ? "s" : ""}` : ""}
          </span>
        </div>
        <div style={{ fontSize: 12.5, color: "#a8a898", marginTop: 4, lineHeight: 1.5 }}>{leak.tip}</div>
      </div>
    </div>
  );
}
