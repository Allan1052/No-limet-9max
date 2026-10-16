// ---------------------------------------------------------------------------
// AS MESAS — vários torneios abertos ao mesmo tempo, como no PokerStars.
//
// 16/10/2026, pedido do Allan: *"eu queria fazer, se eu conseguisse jogar
// quatro torneios simultâneos aí, pra fazer aquelas questões de tela igual é no
// PokerStars."*
//
// ---------------------------------------------------------------------------
// O QUE "SIMULTÂNEO" PODE SIGNIFICAR AQUI, E O QUE NÃO PODE
//
// O app é POR TURNOS: nada anda sozinho, o torneio só avança quando o jogador
// age. Não existe relógio. Então "quatro mesas rodando ao mesmo tempo" não é
// possível — e fingir que é seria mentira de tela.
//
// O que é possível, e é o que o multi-tabling vira num celular de qualquer
// jeito: QUATRO TORNEIOS ABERTOS, um na tela por vez, e um toque para pular
// para o próximo. Cada mesa guarda o seu progresso inteiro (stacks, campo,
// nível, estatísticas, feedback) e continua exatamente de onde parou.
//
// ⚠️ A TROCA SÓ ACONTECE ENTRE MÃOS. O `GameSnapshot` do controller guarda
// stacks e estado de torneio, mas NÃO o meio de uma mão — `restore()` sempre
// devolve a mesa em `handOver`. Trocar no meio de uma mão perderia a mão. Em
// vez de esconder isso, o app bloqueia a troca e diz por quê.
//
// ---------------------------------------------------------------------------
// POR QUE UM MÓDULO NOVO EM VEZ DE MEXER EM `tournamentSlots.ts`
//
// O save antigo é chaveado por BUY-IN (`poker-sim-tourney-5`), ou seja: um
// torneio por faixa. Com a regra de banca ligada o Allan joga vários torneios
// do MESMO buy-in, então a chave precisa ser outra. Mexer no módulo antigo
// arriscaria os saves que já existem no celular dele; este módulo é novo,
// isolado, e MIGRA o que havia na primeira vez que roda.
// ---------------------------------------------------------------------------

import type { GameSnapshot } from "./gameController";
import type { Stage } from "../tournament/structure";
import { listSlots, loadSlot, removeSlot } from "./tournamentSlots";

/** Quantas mesas o app deixa abrir. O pedido foi quatro. */
export const MAX_MESAS = 4;

const PREFIX = "poker-sim-mesa-";
const REGISTRO = "cof-mesas-v1";
const MIGRADO = "cof-mesas-migrado-v1";

export interface Mesa {
  id: string;
  buyIn: number;
  abertaEm: string;
}

/** Uma mesa com o que o save dela diz — para a barra poder mostrar o estado. */
export interface MesaViva extends Mesa {
  savedAt?: string;
  stage?: Stage;
  entrants?: number;
  fieldRemaining?: number;
  heroStack?: number;
  bb?: number;
  /** Stack do herói em big blinds — o número que decide onde ir primeiro. */
  heroBB?: number;
  mode?: "livre" | "circuito";
  circuitStage?: number;
  /** O save existe? Uma mesa sem save é uma mesa que ainda não jogou mão. */
  temSave: boolean;
}

export function mesaKey(id: string): string {
  return `${PREFIX}${id}`;
}

function novoId(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function lerRegistro(): Mesa[] {
  try {
    const raw = localStorage.getItem(REGISTRO);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (m) => m && typeof m.id === "string" && typeof m.buyIn === "number",
    ) as Mesa[];
  } catch {
    return [];
  }
}

function salvarRegistro(mesas: Mesa[]): void {
  try {
    localStorage.setItem(REGISTRO, JSON.stringify(mesas));
  } catch {
    /* sem storage o app continua, só não lembra das mesas entre sessões */
  }
}

/**
 * Move os torneios salvos no formato antigo (um por buy-in) para mesas.
 * Roda uma vez só — sem isso, quem já tinha torneio em andamento no celular
 * abriria o app e veria as mesas vazias.
 */
export function migrarSlotsAntigos(): number {
  try {
    if (localStorage.getItem(MIGRADO) === "1") return 0;
  } catch {
    return 0;
  }
  let movidas = 0;
  try {
    const antigos = listSlots();
    const mesas = lerRegistro();
    for (const meta of antigos) {
      if (mesas.length >= MAX_MESAS) break;
      const snap = loadSlot(meta.buyIn);
      if (!snap) continue;
      const mesa: Mesa = {
        id: novoId(),
        buyIn: meta.buyIn,
        abertaEm: meta.savedAt ?? new Date().toISOString(),
      };
      localStorage.setItem(mesaKey(mesa.id), JSON.stringify(snap));
      mesas.push(mesa);
      removeSlot(meta.buyIn);
      movidas++;
    }
    salvarRegistro(mesas);
    localStorage.setItem(MIGRADO, "1");
  } catch {
    /* migração é best-effort: falhar aqui não pode derrubar o app */
  }
  return movidas;
}

export function listarMesas(): Mesa[] {
  return lerRegistro();
}

/**
 * Abre uma mesa nova. Devolve `null` quando já há `MAX_MESAS` abertas — a
 * trava é aqui, no registro, e não só na tela.
 */
export function abrirMesa(buyIn: number): Mesa | null {
  const mesas = lerRegistro();
  if (mesas.length >= MAX_MESAS) return null;
  const mesa: Mesa = { id: novoId(), buyIn, abertaEm: new Date().toISOString() };
  salvarRegistro([...mesas, mesa]);
  return mesa;
}

/** Fecha a mesa e apaga o save dela. Usado ao desistir e ao terminar o torneio. */
export function fecharMesa(id: string): void {
  salvarRegistro(lerRegistro().filter((m) => m.id !== id));
  try {
    localStorage.removeItem(mesaKey(id));
  } catch {
    /* ignora */
  }
}

export function salvarMesa(id: string, snap: GameSnapshot): void {
  try {
    localStorage.setItem(mesaKey(id), JSON.stringify(snap));
  } catch {
    /* armazenamento indisponível */
  }
}

export function carregarMesa(id: string): GameSnapshot | null {
  try {
    const raw = localStorage.getItem(mesaKey(id));
    return raw ? (JSON.parse(raw) as GameSnapshot) : null;
  } catch {
    return null;
  }
}

/** As mesas abertas, cada uma com o que o save dela diz. */
export function mesasVivas(): MesaViva[] {
  return lerRegistro().map((m) => {
    const snap = carregarMesa(m.id);
    if (!snap?.tournament) return { ...m, temSave: false };
    const hero = snap.seats.find((s) => s.isHero);
    const bb = snap.blinds?.bb ?? 0;
    const stack = hero?.stack ?? 0;
    return {
      ...m,
      temSave: true,
      savedAt: snap.savedAt,
      stage: snap.tournament.stage,
      entrants: snap.tournament.entrants,
      fieldRemaining: Math.round(snap.tournament.fieldRemaining),
      heroStack: stack,
      bb,
      heroBB: bb > 0 ? Math.round(stack / bb) : undefined,
      mode: snap.tournament.mode,
      circuitStage: snap.tournament.circuitStage,
    };
  });
}

/**
 * A próxima mesa na roda, a partir da atual. Se não houver atual, a primeira.
 * Devolve `undefined` quando há uma mesa só — aí não há para onde pular, e o
 * botão não deve nem aparecer.
 */
export function proximaMesa(atualId: string | null): Mesa | undefined {
  const mesas = lerRegistro();
  if (mesas.length <= 1) return undefined;
  const i = mesas.findIndex((m) => m.id === atualId);
  if (i < 0) return mesas[0];
  return mesas[(i + 1) % mesas.length];
}

/**
 * Onde o jogo está mais apertado: a mesa com menos big blinds.
 * É a informação honesta que o app tem para sugerir por onde começar — não é
 * "é a sua vez" (nada roda em paralelo), é "aqui a decisão pesa mais".
 */
export function mesaMaisApertada(): MesaViva | undefined {
  const vivas = mesasVivas().filter((m) => m.heroBB !== undefined);
  if (!vivas.length) return undefined;
  return vivas.reduce((a, b) => ((a.heroBB ?? 999) <= (b.heroBB ?? 999) ? a : b));
}
