// ---------------------------------------------------------------------------
// TELA DE DIAGNÓSTICO DA SESSÃO — o "raio-x do treinador" ao fim da revisão.
// Mostra a NOTA da sessão, pontos fortes, pontos fracos e ajustes pra treinar.
// Visual preto/ouro da marca (self-contained) pra o Allan poder printar/postar.
// ---------------------------------------------------------------------------

import { buildSessionDiagnosis } from "../import/sessionDiagnosis";
import type { SessionReport } from "../import/analyzeSession";

const GOLD = "#e6c454";
const GOLD_SOFT = "#c9a227";
const CREAM = "#efe9d8";
const DIM = "#a89a72";
const GREEN = "#3fa66a";
const RED = "#e07b6b";

function scoreColor(score: number): string {
  if (score >= 80) return GREEN;
  if (score >= 55) return GOLD;
  return RED;
}

export function SessionDiagnosis({
  report,
  onReview,
  onTrain,
}: {
  report: SessionReport;
  onReview?: () => void;
  onTrain?: () => void;
}) {
  const d = buildSessionDiagnosis(report);
  const ring = scoreColor(d.score);
  // ângulo do anel de progresso (0–100 → 0–360°)
  const deg = Math.round((d.score / 100) * 360);

  return (
    <div
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "22px 18px 30px",
        color: CREAM,
        fontFamily: "Georgia, serif",
      }}
    >
      {/* Cabeçalho */}
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ letterSpacing: 6, fontSize: 13, fontWeight: 800, color: GOLD_SOFT }}>
          DIAGNÓSTICO DA SESSÃO
        </div>
        <div style={{ color: DIM, fontSize: 14, marginTop: 4 }}>
          {d.totalHands} mãos · {d.evaluated} avaliadas no pré-flop
        </div>
      </div>

      {/* Anel de nota */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <div
          style={{
            width: 168,
            height: 168,
            borderRadius: "50%",
            background: `conic-gradient(${ring} ${deg}deg, rgba(255,255,255,0.08) ${deg}deg)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 138,
              height: 138,
              borderRadius: "50%",
              background: "#0f0c07",
              border: "1px solid rgba(230,196,84,0.25)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ fontSize: 52, fontWeight: 900, color: ring, lineHeight: 1 }}>{d.score}</div>
            <div style={{ fontSize: 13, color: DIM, marginTop: 2 }}>de 100</div>
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center", marginBottom: 6, fontSize: 24, fontWeight: 900, color: GOLD }}>
        {d.emoji} {d.grade}
      </div>
      <div style={{ textAlign: "center", color: CREAM, fontSize: 16, lineHeight: 1.45, marginBottom: 20, padding: "0 8px" }}>
        {d.headline}
      </div>

      {/* Stats principais */}
      <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
        <MiniStat label="VPIP" value={`${d.vpip}%`} />
        <MiniStat label="PFR" value={`${d.pfr}%`} />
        <MiniStat label="Precisão" value={`${Math.round(d.accuracy * 100)}%`} />
      </div>

      <Section title="✅ Pontos fortes" color={GREEN} items={d.strengths} />
      {d.weaknesses.length > 0 ? (
        <Section title="⚠️ Pontos fracos" color={RED} items={d.weaknesses} />
      ) : null}
      <Section title="🎯 Ajustes pra treinar" color={GOLD} items={d.adjustments} />

      {/* Ações */}
      <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap", justifyContent: "center" }}>
        {onTrain ? (
          <button className="btn primary" onClick={onTrain}>
            🎯 Treinar meus pontos fracos
          </button>
        ) : null}
        {onReview ? (
          <button className="btn" onClick={onReview}>
            🔁 Revisar as mãos de novo
          </button>
        ) : null}
      </div>

      <div style={{ textAlign: "center", color: DIM, fontSize: 12.5, marginTop: 18, letterSpacing: 1 }}>
        calloufold.com.br · análise do seu jogo real · grátis
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        flex: "1 1 88px",
        minWidth: 88,
        background: "rgba(230,196,84,0.06)",
        border: "1px solid rgba(230,196,84,0.22)",
        borderRadius: 12,
        padding: "12px 8px",
        textAlign: "center",
        boxSizing: "border-box",
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 900, color: GOLD }}>{value}</div>
      <div style={{ fontSize: 12, color: DIM, letterSpacing: 1, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Section({ title, color, items }: { title: string; color: string; items?: string[] }) {
  const list = items ?? [];
  if (list.length === 0) return null;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map((it, i) => (
          <div
            key={i}
            style={{
              background: "rgba(0,0,0,0.28)",
              borderLeft: `3px solid ${color}`,
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 14.5,
              lineHeight: 1.4,
              color: CREAM,
            }}
          >
            {it}
          </div>
        ))}
      </div>
    </div>
  );
}
