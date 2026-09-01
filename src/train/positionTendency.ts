// ---------------------------------------------------------------------------
// TENDÊNCIA POR POSIÇÃO — "onde você perde mais ficha" + "qual é o seu erro".
//
// Pedido do Allan: além de acertar/errar, mostrar POR POSIÇÃO (UTG..BB) onde o
// jogador mais erra e, quando erra, se o erro é por AGRESSIVO demais (call/raise
// quando era fold) ou PASSIVO demais (fold quando era continuar). Aparece na
// revisão do torneio (aquele torneio) e no "Seu jogo" do Perfil (acumulado).
//
// Módulo PURO: recebe decisões {posição, acertou, família da sua ação, família
// da ação recomendada} e devolve o placar por posição. A família vem do motor
// (fold/check/call/aggro); a ordem de agressividade é fold<check<call<aggro.
// ---------------------------------------------------------------------------
export type Fam = "fold" | "check" | "call" | "aggro";

export interface PositionalRecord {
  position: string;
  correct: boolean;
  heroFam?: Fam;
  adviceFam?: Fam;
}

export type Tendency = "agressivo" | "passivo" | "equilibrado" | null;

export interface PositionReport {
  position: string;
  hands: number;
  /** Acerto (0..1) — só significativo com amostra mínima. */
  accuracy: number;
  aggressiveErrors: number;
  passiveErrors: number;
  /** Tendência dominante do ERRO nesta posição (null = erros de menos p/ dizer). */
  tendency: Tendency;
  /** Frase curta pro jogador ("dá call/raise demais" etc.). */
  leakLabel: string;
}

/** Ordem de exibição em mesa (early → late → blinds). */
export const POSITION_ORDER = ["UTG", "UTG1", "MP", "LJ", "HJ", "CO", "BTN", "SB", "BB"];

const MIN_HANDS = 4; // pra mostrar a % da posição (honestidade)
const MIN_ERRORS = 3; // pra afirmar uma tendência

function famRank(f?: Fam): number {
  switch (f) {
    case "fold": return 0;
    case "check": return 1;
    case "call": return 2;
    case "aggro": return 3;
    default: return -1;
  }
}

export function tendencyFromCounts(aggressive: number, passive: number): { tendency: Tendency; leakLabel: string } {
  const errors = aggressive + passive;
  if (errors < MIN_ERRORS) return { tendency: null, leakLabel: "" };
  const aggShare = aggressive / errors;
  const pasShare = passive / errors;
  if (aggShare >= 0.6) return { tendency: "agressivo", leakLabel: "seus erros são por dar call/raise demais" };
  if (pasShare >= 0.6) return { tendency: "passivo", leakLabel: "seus erros são por foldar/passar demais" };
  return { tendency: "equilibrado", leakLabel: "erros divididos entre agressivo e passivo" };
}

/** Constrói o relatório por posição a partir das decisões cruas. Ordenado da
 *  PIOR posição (menor acerto) pra melhor — o topo é "onde perde mais ficha". */
export function reportFromRecords(records: PositionalRecord[]): PositionReport[] {
  const byPos = new Map<string, PositionalRecord[]>();
  for (const r of records) {
    if (!r.position) continue;
    const arr = byPos.get(r.position) ?? [];
    arr.push(r);
    byPos.set(r.position, arr);
  }

  const out: PositionReport[] = [];
  for (const [position, recs] of byPos) {
    if (recs.length < MIN_HANDS) continue;
    const hands = recs.length;
    const correct = recs.filter((r) => r.correct).length;
    let aggressive = 0;
    let passive = 0;
    for (const r of recs) {
      if (r.correct) continue;
      const h = famRank(r.heroFam);
      const a = famRank(r.adviceFam);
      if (h < 0 || a < 0 || h === a) continue;
      if (h > a) aggressive++;
      else passive++;
    }
    const { tendency, leakLabel } = tendencyFromCounts(aggressive, passive);
    out.push({
      position,
      hands,
      accuracy: correct / hands,
      aggressiveErrors: aggressive,
      passiveErrors: passive,
      tendency,
      leakLabel,
    });
  }

  out.sort((a, b) => a.accuracy - b.accuracy || b.hands - a.hands);
  return out;
}

/** Constrói o relatório a partir de contadores acumulados (uso no Perfil). */
export interface PositionCounts {
  hands: number;
  correct: number;
  aggressive: number;
  passive: number;
}

export function reportFromCounts(byPosition: Record<string, PositionCounts>): PositionReport[] {
  const out: PositionReport[] = [];
  for (const [position, c] of Object.entries(byPosition)) {
    if (c.hands < MIN_HANDS) continue;
    const { tendency, leakLabel } = tendencyFromCounts(c.aggressive, c.passive);
    out.push({
      position,
      hands: c.hands,
      accuracy: c.correct / c.hands,
      aggressiveErrors: c.aggressive,
      passiveErrors: c.passive,
      tendency,
      leakLabel,
    });
  }
  out.sort((a, b) => a.accuracy - b.accuracy || b.hands - a.hands);
  return out;
}
