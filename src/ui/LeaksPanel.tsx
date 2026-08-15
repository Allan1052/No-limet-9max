// ---------------------------------------------------------------------------
// Painel "Seus Pontos Fracos" (Treino Dirigido).
// Agrega o feedback de TODAS as mãos da sessão, roda o detector de vazamentos
// e mostra os maiores erros recorrentes — cada vazamento EXPANDE e lista os
// erros INDIVIDUAIS (carta + posição + o que você jogou × o que era), com o
// Simples/Técnico de cada lance no toque. O professor pessoal mostrando o
// padrão E cada erro específico.
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import { CardView } from "./Card";
import { HandTipsModal } from "./HandTipsModal";
import type { HandHistory } from "../app/replay";
import type { FeedbackItem, Rating } from "../feedback/analyzer";
import { detectLeaksFromPairs, type Leak, type LeakOccurrence } from "../feedback/leaks";
import { heroBBBefore } from "./handDepth";

/** Índice do evento no replay que corresponde ao FeedbackItem da mão. */
function itemEventIndex(hand: HandHistory, item: FeedbackItem): number {
  const target = item.street ?? "";
  for (let i = 0; i < hand.events.length; i++) {
    if (hand.events[i].street === target && hand.events[i].isHero) return i;
  }
  return hand.events.length;
}

const FAM_LABEL: Record<string, string> = {
  fold: "Fold",
  check: "Check",
  call: "Call",
  aggro: "Raise",
};

export function LeaksPanel({
  hands,
  onClose,
}: {
  hands: HandHistory[];
  onClose: () => void;
}) {
  const { leaks, total, aligned } = useMemo(() => {
    // Pares item+mão: cada erro fica ligado à mão em que aconteceu — carta,
    // posição e análise individual.
    const pairs: { item: FeedbackItem; hand?: HandHistory }[] = [];
    for (const h of hands)
      for (const item of h.handFeedback ?? []) pairs.push({ item, hand: h });
    const counts: Record<Rating, number> = { boa: 0, ok: 0, imprecisa: 0, ruim: 0 };
    for (const p of pairs) counts[p.item.rating]++;
    const totalDec = pairs.length;
    return {
      leaks: detectLeaksFromPairs(pairs),
      total: totalDec,
      aligned: totalDec > 0 ? Math.round(((counts.boa + counts.ok) / totalDec) * 100) : 0,
    };
  }, [hands]);

  const [openLeaks, setOpenLeaks] = useState<Set<string>>(new Set());
  const [selOcc, setSelOcc] = useState<LeakOccurrence | null>(null);
  const toggle = (id: string) => {
    setOpenLeaks((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
              <LeakCard
                key={leak.id}
                leak={leak}
                rank={i + 1}
                open={openLeaks.has(leak.id)}
                onToggle={() => toggle(leak.id)}
                onSelectOcc={(occ) => setSelOcc(occ)}
              />
            ))}
            <div style={{ fontSize: 11, color: "#8a8a7a", marginTop: 6, textAlign: "center" }}>
              Ordenado pela gravidade — o de cima é o que mais custa fichas.
              <br />
              Toque em cada vazamento pra ver cada mão errada.
            </div>
          </div>
        )}
      </div>

      {/* Modal Simples/Técnico do lance individual */}
      {selOcc ? (
        <HandTipsModal
          items={[selOcc.item]}
          onClose={() => setSelOcc(null)}
          heroHand={selOcc.hand?.holeCards?.[selOcc.hand.heroSeat] ?? []}
          board={selOcc.hand?.finalBoard ?? []}
          userSubscriptionLevel={"free" as never}
          heroPosition={selOcc.hand?.heroPosition}
          heroBB={
            selOcc.hand
              ? (heroBBBefore(selOcc.hand, itemEventIndex(selOcc.hand, selOcc.item)) ?? undefined)
              : undefined
          }
        />
      ) : null}
    </div>
  );
}

function LeakCard({
  leak,
  rank,
  open,
  onToggle,
  onSelectOcc,
}: {
  leak: Leak;
  rank: number;
  open: boolean;
  onToggle: () => void;
  onSelectOcc: (occ: LeakOccurrence) => void;
}) {
  // Cor da faixa por gravidade: erros claros (badCount) puxam pro vermelho.
  const heavy = leak.badCount >= 2 || leak.severity >= 6;
  const accent = heavy ? "#e06b6b" : "#d4af37";
  const ratingColor: Record<string, string> = {
    boa: "#5fb96a",
    ok: "#8f9c6e",
    imprecisa: "#d4af37",
    ruim: "#e06b6b",
  };
  return (
    <div
      className="leak-card"
      style={{
        borderRadius: 8,
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${accent}55`,
        borderLeft: `4px solid ${accent}`,
        overflow: "hidden",
      }}
    >
      {/* Cabeçalho do vazamento — toca pra expandir */}
      <button
        type="button"
        onClick={onToggle}
        className="leak-head"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "12px 14px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: accent, minWidth: 20 }}>#{rank}</div>
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
        <span style={{ fontSize: 12, color: "#8a8a7a", transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>▸</span>
      </button>

      {/* Erros individuais — cada mão com carta, posição e análise */}
      {open && leak.occurrences.length > 0 ? (
        <div className="leak-rows">
          {leak.occurrences.map((occ, idx) => (
            <OccurrenceRow
              key={idx}
              occ={occ}
              onSelect={() => onSelectOcc(occ)}
              ratingColor={ratingColor[occ.item.rating] ?? "#a8a898"}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function OccurrenceRow({
  occ,
  onSelect,
  ratingColor,
}: {
  occ: LeakOccurrence;
  onSelect: () => void;
  ratingColor: string;
}) {
  const { item, hand } = occ;
  const heroCards: number[] = hand?.holeCards?.[hand.heroSeat] ?? [];
  const pos = hand?.heroPosition;
  const bb =
    hand?.startingStacks?.[hand.heroSeat] && hand.bigBlind
      ? Math.round(hand.startingStacks[hand.heroSeat] / hand.bigBlind)
      : undefined;
  const what = FAM_LABEL[item.heroFam ?? ""] ?? item.heroAction;
  const era = FAM_LABEL[item.adviceFam ?? ""] ?? item.advice;
  return (
    <button
      type="button"
      onClick={onSelect}
      className="leak-row"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "8px 10px",
        borderRadius: 6,
        border: "1px solid #2a2f1c",
        background: "#12140d",
        cursor: "pointer",
        textAlign: "left",
      }}
      title="Ver análise Simples/Técnico desta jogada"
    >
      {/* Cartas do herói */}
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        {heroCards.length >= 2 ? (
          heroCards.slice(0, 2).map((c, i) => <CardView key={i} card={c} small />)
        ) : (
          <span style={{ fontSize: 11, color: "#8a8a7a", minWidth: 44, textAlign: "center" }}>—</span>
        )}
      </div>
      {/* Contexto: posição + stack */}
      <div style={{ fontSize: 11, color: "#8a8a7a", minWidth: 44, whiteSpace: "nowrap" }}>
        {pos ? `${pos}${bb !== undefined ? ` · ${bb}bb` : ""}` : bb !== undefined ? `${bb}bb` : "—"}
      </div>
      {/* O que jogou × o que era */}
      <div style={{ flex: 1, fontSize: 12, color: "#a8a898", lineHeight: 1.3 }}>
        você <span style={{ color: "#e06b6b", fontWeight: 700 }}>{what}</span> · era{" "}
        <span style={{ color: "#5fb96a", fontWeight: 700 }}>{era}</span>
      </div>
      {/* Nota do erro */}
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: ratingColor,
          border: `1px solid ${ratingColor}88`,
          borderRadius: 8,
          padding: "1px 7px",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {item.rating === "ruim" ? "Erro" : "Impreciso"}
      </span>
      <span style={{ fontSize: 11, color: "#6e7a5e", flexShrink: 0 }}>👁</span>
    </button>
  );
}
