// ---------------------------------------------------------------------------
// EVOLUÇÃO ("Seu jogo") — a base de dados que prova que o jogador melhora.
//
// Pedido da auditoria (melhorias nº 1 e nº 2): o app não deve mostrar só XP —
// deve mostrar PROGRESSO PERCEBIDO: "há 2 semanas você acertava 46% dos spots
// de 10–20bb; hoje acerta 67%". E apontar a MAIOR OPORTUNIDADE (o balde mais
// fraco) para virar treino dirigido.
//
// Este módulo é PURO e local (localStorage, sem backend). Ele só GUARDA e LÊ:
//   - a cada decisão, grava em quais "baldes" ela cai e se foi certa;
//   - lê de volta o placar por balde, comparando a janela recente com a
//     anterior (pra mostrar a seta ↑/↓ de evolução).
//
// Um mesmo lance cai em VÁRIOS baldes ao mesmo tempo (rua, faixa de stack e
// estágio) — igual ao mockup da auditoria, em que a mesma mão conta pra
// "Pré-flop", "10–20BB" e "Mesa final". Assim cada decisão alimenta várias
// barras de evolução de uma vez.
// ---------------------------------------------------------------------------
import type { StageKey } from "./stage";

const KEY = "cof-progress-v1";
// Teto de registros guardados (o mais antigo é descartado). ~4000 decisões
// cobrem meses de estudo sem inchar o localStorage.
const MAX_RECORDS = 4000;

/** Contexto de uma decisão, no momento em que ela é avaliada. */
export interface ProgressContext {
  kind: "preflop" | "postflop";
  stage: StageKey;
  /** Stack efetivo do confronto em big blinds. */
  effectiveBB: number;
  /** A decisão foi boa? (rating "boa" ou "ok" = true). */
  correct: boolean;
}

/** Um registro cru: dia (nº de dias desde a época), balde e acerto (0/1). */
interface RawRecord {
  d: number;
  b: string;
  c: 0 | 1;
}

export interface BucketProgress {
  id: string;
  label: string;
  /** Família do balde: "rua", "stack" ou "estagio" (pra a UI agrupar/ordenar). */
  family: "rua" | "stack" | "estagio";
  /** Acerto atual (%) na janela recente — ou no total, se ainda há poucos dados. */
  accuracy: number;
  /** Total de decisões já registradas neste balde. */
  total: number;
  /** Evolução em pontos percentuais (recente − anterior); null se dados de menos. */
  delta: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const today = (): number => Math.floor(Date.now() / DAY_MS);

// Janela de comparação: os últimos WINDOW lances vs os WINDOW anteriores.
const WINDOW = 25;
// Mínimos pra não mostrar número/seta com amostra ridícula (honestidade).
const MIN_SHOW = 5; // pra mostrar o % atual do balde
const MIN_DELTA = 8; // pra mostrar a seta de evolução (cada lado da janela)

// ---------------------------------------------------------------------------
// Baldes: um lance cai em até 3 (rua + faixa de stack + estágio).
// ---------------------------------------------------------------------------
const STAGE_LABEL: Record<StageKey, string> = {
  inicio: "Início do torneio",
  meio: "Meio do torneio",
  bolha: "Perto da bolha",
  mesa_final: "Mesa final",
};

function stackBucket(bb: number): { id: string; label: string } {
  if (bb <= 12) return { id: "stk_curto", label: "Stack curto (≤12bb)" };
  if (bb <= 20) return { id: "stk_1020", label: "Decisões de 12–20bb" };
  if (bb <= 40) return { id: "stk_2040", label: "Stack médio (20–40bb)" };
  return { id: "stk_fundo", label: "Stack fundo (40bb+)" };
}

/** Todos os baldes em que uma decisão se encaixa (com rótulo legível). */
export function bucketsFor(ctx: ProgressContext): { id: string; label: string; family: BucketProgress["family"] }[] {
  const out: { id: string; label: string; family: BucketProgress["family"] }[] = [];
  out.push(
    ctx.kind === "preflop"
      ? { id: "rua_pre", label: "Pré-flop", family: "rua" }
      : { id: "rua_pos", label: "Pós-flop", family: "rua" },
  );
  const s = stackBucket(ctx.effectiveBB);
  out.push({ id: s.id, label: s.label, family: "stack" });
  out.push({ id: `stg_${ctx.stage}`, label: STAGE_LABEL[ctx.stage], family: "estagio" });
  return out;
}

// ---------------------------------------------------------------------------
// Gravação
// ---------------------------------------------------------------------------
function load(): RawRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((r) => r && typeof r.b === "string");
  } catch {
    return [];
  }
}

function save(records: RawRecord[]): void {
  try {
    const trimmed = records.length > MAX_RECORDS ? records.slice(records.length - MAX_RECORDS) : records;
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
}

/** Grava uma decisão avaliada em todos os baldes a que ela pertence. */
export function recordProgress(ctx: ProgressContext): void {
  const records = load();
  const d = today();
  const c: 0 | 1 = ctx.correct ? 1 : 0;
  for (const b of bucketsFor(ctx)) records.push({ d, b: b.id, c });
  save(records);
}

// ---------------------------------------------------------------------------
// Leitura / relatório
// ---------------------------------------------------------------------------
function labelOf(id: string): { label: string; family: BucketProgress["family"] } {
  if (id === "rua_pre") return { label: "Pré-flop", family: "rua" };
  if (id === "rua_pos") return { label: "Pós-flop", family: "rua" };
  if (id.startsWith("stk_")) {
    // Reconstrói o rótulo a partir do id (independe da faixa exata).
    const map: Record<string, string> = {
      stk_curto: "Stack curto (≤12bb)",
      stk_1020: "Decisões de 12–20bb",
      stk_2040: "Stack médio (20–40bb)",
      stk_fundo: "Stack fundo (40bb+)",
    };
    return { label: map[id] ?? id, family: "stack" };
  }
  const stage = id.replace("stg_", "") as StageKey;
  return { label: STAGE_LABEL[stage] ?? id, family: "estagio" };
}

function acc(records: RawRecord[]): number {
  if (records.length === 0) return 0;
  const hits = records.reduce((n, r) => n + r.c, 0);
  return hits / records.length;
}

/**
 * Placar por balde: acerto atual e a evolução (recente vs janela anterior).
 * Só entram baldes com pelo menos MIN_SHOW decisões. Ordenado do maior total
 * pro menor (os que o jogador mais praticou aparecem primeiro).
 */
export function progressReport(): BucketProgress[] {
  const records = load();
  const byBucket = new Map<string, RawRecord[]>();
  for (const r of records) {
    const arr = byBucket.get(r.b) ?? [];
    arr.push(r);
    byBucket.set(r.b, arr);
  }

  const out: BucketProgress[] = [];
  for (const [id, recs] of byBucket) {
    if (recs.length < MIN_SHOW) continue;
    const { label, family } = labelOf(id);

    // Janela recente vs anterior (por ordem de chegada).
    const recent = recs.slice(Math.max(0, recs.length - WINDOW));
    const prior = recs.slice(Math.max(0, recs.length - 2 * WINDOW), Math.max(0, recs.length - WINDOW));

    const accuracy = acc(recent.length >= MIN_SHOW ? recent : recs);
    let delta: number | null = null;
    if (recent.length >= MIN_DELTA && prior.length >= MIN_DELTA) {
      delta = Math.round((acc(recent) - acc(prior)) * 100);
    }

    out.push({ id, label, family, accuracy, total: recs.length, delta });
  }

  out.sort((a, b) => b.total - a.total);
  return out;
}

/**
 * A MAIOR OPORTUNIDADE: o balde mais fraco com amostra suficiente — o que o app
 * sugere treinar ("Treinar 3 mãos"). Prioriza faixa de stack e estágio (mais
 * acionáveis que "pré/pós"). Devolve null se ainda não há dados suficientes.
 */
export function biggestOpportunity(): BucketProgress | null {
  const report = progressReport().filter(
    (b) => b.total >= MIN_DELTA && b.family !== "rua" && b.accuracy < 0.85,
  );
  if (report.length === 0) return null;
  // O mais fraco primeiro; empate → o mais praticado (mais confiável).
  report.sort((a, b) => a.accuracy - b.accuracy || b.total - a.total);
  return report[0];
}

/** Limpa o histórico de evolução (usado no reset de progresso). */
export function resetProgress(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
