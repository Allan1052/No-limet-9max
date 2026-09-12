// ---------------------------------------------------------------------------
// "ONDE A MÃO SAIU DO CAMINHO" — o percurso da mão, rua por rua.
//
// Ideia da auditoria do canal do Carmanhani (12/09/2026), e a segunda melhor
// coisa daquele documento. Hoje o app avalia CADA decisão sua — e mostra uma de
// cada vez. Quem revisa uma mão quer outra coisa antes disso: bater o olho e ver
// ONDE ela saiu do trilho.
//
//   Pré-flop ✓ · Flop ✓ · Turn ✗ · River (sem decisão)
//
// Nada aqui é recalculado: este módulo só ORGANIZA os FeedbackItems que o motor
// já produziu. Se uma rua não teve decisão sua, ela aparece como "sem decisão" —
// que é diferente de "sem erro" e não pode virar um ✓.
//
// Ele também aponta a PIOR decisão da mão. "Pior" aqui é a de nota mais baixa;
// no empate, a mais TARDE — porque um erro no river custou o pote inteiro que as
// ruas anteriores construíram.
// ---------------------------------------------------------------------------

import type { FeedbackItem, Rating } from "./analyzer";
import { temDadoPara } from "./coachContract";

export type RuaId = "preflop" | "flop" | "turn" | "river";

/** Nota da rua, ou "semDecisao" quando você não teve o que decidir ali. */
export type NotaRua = Rating | "semDecisao";

export interface RuaDoPercurso {
  rua: RuaId;
  label: string;
  nota: NotaRua;
  /** A decisão que define a nota da rua (a pior dela). */
  item?: FeedbackItem;
}

export interface PercursoDaMao {
  ruas: RuaDoPercurso[];
  /** Índice em `ruas` da rua onde a mão saiu do caminho. Ausente se não saiu. */
  piorIdx?: number;
  /** Frase curta apontando o momento — só quando houve erro de verdade. */
  ondeSaiu?: string;
}

const LABEL: Record<RuaId, string> = {
  preflop: "Pré-flop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
};

/** Ordem de gravidade: quanto maior, pior. */
const PESO: Record<Rating, number> = { boa: 0, ok: 1, imprecisa: 2, ruim: 3 };

/** Normaliza o rótulo de rua que vem do motor ("Pré-flop", "Flop"...). */
function ruaDe(street: string): RuaId | undefined {
  const s = street.toLowerCase();
  if (s.startsWith("pré") || s.startsWith("pre")) return "preflop";
  if (s.startsWith("flop")) return "flop";
  if (s.startsWith("turn")) return "turn";
  if (s.startsWith("river")) return "river";
  return undefined; // showdown, fim, rótulo desconhecido: não é rua de decisão
}

/** Houve ERRO de verdade? "ok" é alternativa aceitável, não erro. */
function ehErro(nota: NotaRua): boolean {
  return nota === "imprecisa" || nota === "ruim";
}

export function percursoDaMao(items: FeedbackItem[]): PercursoDaMao | undefined {
  const porRua = new Map<RuaId, FeedbackItem>();
  for (const it of items) {
    const r = ruaDe(it.street);
    if (!r) continue;
    const atual = porRua.get(r);
    // Uma rua pode ter mais de uma decisão sua (abriu, levou 3-bet, decidiu de
    // novo). A nota da RUA é a da pior delas — é o momento que interessa achar.
    if (!atual || PESO[it.rating] > PESO[atual.rating]) porRua.set(r, it);
  }
  if (porRua.size === 0) return undefined;

  const ruas: RuaDoPercurso[] = (["preflop", "flop", "turn", "river"] as RuaId[]).map((rua) => {
    const item = porRua.get(rua);
    return { rua, label: LABEL[rua], nota: item ? item.rating : "semDecisao", item };
  });

  // A pior da mão: maior peso; no empate, a MAIS TARDE (o erro de river custou
  // o pote inteiro que as ruas anteriores construíram).
  let piorIdx: number | undefined;
  let piorPeso = -1;
  ruas.forEach((r, i) => {
    if (r.nota === "semDecisao") return;
    const peso = PESO[r.nota];
    if (peso >= piorPeso && ehErro(r.nota)) {
      piorPeso = peso;
      piorIdx = i;
    }
  });

  return { ruas, piorIdx, ondeSaiu: piorIdx === undefined ? undefined : frase(ruas[piorIdx]) };
}

/**
 * A frase do momento do erro. A parte com NÚMERO (sua chance × a que o preço
 * pedia) só entra quando os dois existem — é a mesma porta do contrato que vale
 * para o resto do coach.
 */
function frase(r: RuaDoPercurso): string {
  const it = r.item;
  if (!it) return `No ${r.label} a mão saiu do caminho.`;
  const oQueFez = it.heroAction ? `você fez ${it.heroAction.toUpperCase()}` : "sua jogada saiu do padrão";
  const base = `No ${r.label}: ${oQueFez}; o padrão era ${it.advice.toUpperCase()}.`;
  if (!temDadoPara("equityPreco", it as unknown as Record<string, unknown>)) return base;
  const eq = Math.round((it.equity ?? 0) * 100);
  if (it.potOdds === undefined) return `${base} Sua chance ali era ${eq}%.`;
  return `${base} Você precisava de ${Math.round(it.potOdds * 100)}% e tinha ${eq}%.`;
}
