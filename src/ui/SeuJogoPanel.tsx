// ---------------------------------------------------------------------------
// "SEU JOGO" — a prova de evolução (melhoria nº 1 da auditoria).
//
// Lê a base de progresso (train/progress) e mostra, por tipo de spot, o quanto
// o jogador acerta HOJE e se melhorou (seta ↑/↓ vs a janela anterior). Aponta a
// MAIOR OPORTUNIDADE e oferece treinar exatamente aquilo (melhoria nº 2).
//
// Honestidade: só mostra número quando há amostra suficiente (a lógica de
// corte mora no módulo puro). É tudo local, deste aparelho.
// ---------------------------------------------------------------------------
import { useMemo } from "react";
import { progressReport, biggestOpportunity, type BucketProgress } from "../train/progress";
import type { StageKey } from "../train/stage";

// Do balde da oportunidade → um spot representativo pra treinar no 1×1.
function specForBucket(b: BucketProgress): { stackBB: number; stage: StageKey } {
  const stackById: Record<string, number> = {
    stk_curto: 10,
    stk_1020: 15,
    stk_2040: 30,
    stk_fundo: 50,
  };
  if (b.family === "stack") return { stackBB: stackById[b.id] ?? 20, stage: "inicio" };
  if (b.family === "estagio") {
    const stage = b.id.replace("stg_", "") as StageKey;
    return { stackBB: 15, stage };
  }
  return { stackBB: 20, stage: "inicio" };
}

function trainBucket(b: BucketProgress): void {
  const { stackBB, stage } = specForBucket(b);
  try {
    localStorage.setItem(
      "cof-sua-mao-spec",
      JSON.stringify({
        heroPosition: "BB",
        villainPosition: "BTN",
        situation: "vsopen",
        stage,
        stackBB,
      }),
    );
  } catch {
    /* se falhar, abre o 1×1 vazio */
  }
  window.dispatchEvent(new CustomEvent("nav-to", { detail: "ultra" }));
  window.dispatchEvent(new CustomEvent("cof-open-ultra"));
}

function Bar({ pct }: { pct: number }) {
  return (
    <div className="sj-bar">
      <div className="sj-bar-fill" style={{ width: `${Math.round(pct * 100)}%` }} />
    </div>
  );
}

function DeltaTag({ delta }: { delta: number | null }) {
  if (delta === null || delta === 0) return null;
  const up = delta > 0;
  return (
    <span className={`sj-delta ${up ? "up" : "down"}`}>
      {up ? "▲" : "▼"} {up ? "+" : ""}{delta}
    </span>
  );
}

export function SeuJogoPanel() {
  const report = useMemo(() => progressReport(), []);
  const opp = useMemo(() => biggestOpportunity(), []);

  return (
    <div className="sj-panel">
      <div className="profile-section-title">📈 Seu jogo</div>

      {report.length === 0 ? (
        <p className="sj-empty">
          Jogue algumas mãos que eu começo a mostrar sua evolução aqui — por tipo
          de spot, com a sua % de acerto e se você está melhorando.
        </p>
      ) : (
        <>
          {opp ? (
            <div className="sj-opp">
              <div className="sj-opp-head">Sua maior chance de melhorar</div>
              <div className="sj-opp-body">
                <b>{opp.label}</b> — você acerta {Math.round(opp.accuracy * 100)}%.
              </div>
              <button className="btn primary sj-opp-btn" onClick={() => trainBucket(opp)}>
                🎯 Treinar isso agora
              </button>
            </div>
          ) : null}

          <div className="sj-list">
            {report.map((b) => (
              <div key={b.id} className="sj-row">
                <div className="sj-row-top">
                  <span className="sj-label">{b.label}</span>
                  <span className="sj-pct">
                    {Math.round(b.accuracy * 100)}% <DeltaTag delta={b.delta} />
                  </span>
                </div>
                <Bar pct={b.accuracy} />
              </div>
            ))}
          </div>

          <p className="sj-foot">Baseado nas suas decisões neste aparelho.</p>
        </>
      )}
    </div>
  );
}
