import type { NovoHabito, Rotina, TipoHabito } from "./types";

/**
 * Catálogo de missões. Todo dia o app sorteia 5 (uma de cada "vaga"), sempre
 * de acordo com a rotina. Cada missão sobe de nível a cada 5 vezes concluída
 * (ex.: caminhada 15 → 20 → 25 → 30 min) — progressão gradual, sem salto.
 */

type Vaga = "transporte" | "movimento" | "postura" | "habito";

interface Missao {
  id: string;
  vaga: Vaga;
  tipo: TipoHabito;
  /** A missão faz sentido para essa rotina? */
  serve: (r: Rotina) => boolean;
  /** Texto por nível (1 a 4). */
  texto: (nivel: number, r: Rotina) => string;
}

export const NIVEL_MAX = 4;
export const CONCLUSOES_POR_NIVEL = 5;

const por = <T>(nivel: number, valores: readonly [T, T, T, T]): T => valores[Math.min(NIVEL_MAX, Math.max(1, nivel)) - 1]!;
const sempre = () => true;

export const CATALOGO: readonly Missao[] = [
  // ── transporte ──
  {
    id: "descer_ponto",
    vaga: "transporte",
    tipo: "transporte",
    serve: (r) => r.transporte === "onibus" || r.transporte === "metro",
    texto: (n) => (por(n, [1, 1, 2, 2]) === 1 ? "Descer 1 ponto antes e caminhar o resto do trajeto" : "Descer 2 pontos antes e caminhar o resto do trajeto"),
  },
  {
    id: "estacionar_longe",
    vaga: "transporte",
    tipo: "transporte",
    serve: (r) => r.transporte === "carro" || r.transporte === "moto",
    texto: (n) => `Estacionar mais longe da entrada (+${por(n, [5, 8, 10, 12])} min de caminhada)`,
  },
  {
    id: "trajeto_ritmo",
    vaga: "transporte",
    tipo: "transporte",
    serve: (r) => r.transporte === "a_pe" || r.transporte === "bicicleta",
    texto: (n) => `Acelerar o ritmo nos últimos ${por(n, [5, 8, 10, 12])} minutos do trajeto`,
  },
  {
    id: "caminhada_expediente",
    vaga: "transporte",
    tipo: "transporte",
    serve: (r) => r.transporte === "home_office",
    texto: (n) => `Caminhar ${por(n, [10, 12, 15, 20])} minutos antes de começar o expediente`,
  },
  {
    id: "volta_quarteirao",
    vaga: "transporte",
    tipo: "transporte",
    serve: (r) => r.transporte === "home_office" || r.transporte === "carro",
    texto: (n) => `Dar ${por(n, [1, 2, 2, 3])} volta(s) no quarteirão ao chegar em casa`,
  },
  // ── movimento ──
  {
    id: "caminhada_rapida",
    vaga: "movimento",
    tipo: "movimento",
    serve: sempre,
    texto: (n) => `${por(n, [15, 20, 25, 30])} minutos de caminhada rápida`,
  },
  {
    id: "pular_corda",
    vaga: "movimento",
    tipo: "movimento",
    serve: (r) => r.pratica_atividade,
    texto: (n) => `${por(n, [5, 8, 10, 12])} minutos pulando corda (ou polichinelos)`,
  },
  {
    id: "escada",
    vaga: "movimento",
    tipo: "movimento",
    serve: sempre,
    texto: (n, r) =>
      r.sobe_escadas
        ? `Subir as escadas em ritmo acelerado ${por(n, [2, 3, 4, 5])} vezes`
        : `Trocar o elevador pela escada em ${por(n, [1, 2, 3, 4])} andar(es)`,
  },
  {
    id: "agachamentos",
    vaga: "movimento",
    tipo: "movimento",
    serve: sempre,
    texto: (n) => `${por(n, [10, 15, 20, 25])} agachamentos ao longo do dia`,
  },
  {
    id: "danca",
    vaga: "movimento",
    tipo: "movimento",
    serve: sempre,
    texto: (n) => `${por(n, [5, 8, 10, 15])} minutos dançando suas músicas favoritas`,
  },
  // ── postura ──
  {
    id: "pausa_sentado",
    vaga: "postura",
    tipo: "postura",
    serve: (r) => r.horas_sentado >= 3,
    texto: (n, r) =>
      `Levantar e andar 3 minutos a cada ${r.horas_sentado >= 6 ? por(n, [60, 60, 45, 45]) : por(n, [90, 75, 60, 60])} minutos sentado`,
  },
  {
    id: "ligacao_em_pe",
    vaga: "postura",
    tipo: "postura",
    serve: (r) => r.horas_sentado >= 4,
    texto: () => "Atender ligações e reuniões em pé ou andando",
  },
  {
    id: "alongar",
    vaga: "postura",
    tipo: "postura",
    serve: sempre,
    texto: (n) => `Alongar ${por(n, [5, 5, 8, 10])} minutos ao acordar`,
  },
  // ── hábitos ──
  { id: "agua_acordar", vaga: "habito", tipo: "hidratacao", serve: sempre, texto: () => "Beber 1 copo de água logo ao acordar" },
  { id: "garrafa_vista", vaga: "habito", tipo: "hidratacao", serve: sempre, texto: () => "Deixar uma garrafa de água à vista o dia todo" },
  { id: "proteina_refeicao", vaga: "habito", tipo: "alimentacao", serve: sempre, texto: () => "Incluir uma fonte de proteína em cada refeição" },
  { id: "metade_verdura", vaga: "habito", tipo: "alimentacao", serve: sempre, texto: () => "Metade do prato com verduras e legumes no almoço" },
  { id: "sem_refri", vaga: "habito", tipo: "alimentacao", serve: sempre, texto: () => "Trocar refrigerante ou suco por água, chá ou café sem açúcar" },
  { id: "comer_devagar", vaga: "habito", tipo: "alimentacao", serve: sempre, texto: () => "Comer devagar: pelo menos 15 minutos no almoço" },
  { id: "telas_sono", vaga: "habito", tipo: "sono", serve: sempre, texto: () => "Desligar telas 30 minutos antes de dormir" },
  { id: "dormir_7h", vaga: "habito", tipo: "sono", serve: sempre, texto: () => "Ir para a cama a tempo de dormir 7 horas ou mais" },
];

/** Hash determinístico simples (FNV-1a) → semente do sorteio do dia. */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Gerador pseudoaleatório com semente (mulberry32). */
function aleatorio(semente: number): () => number {
  let a = semente;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function embaralhar<T>(lista: readonly T[], rnd: () => number): T[] {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function nivelDaMissao(conclusoes: number): number {
  return Math.min(NIVEL_MAX, 1 + Math.floor(conclusoes / CONCLUSOES_POR_NIVEL));
}

/**
 * Sorteia as missões do dia. Determinístico: mesma pessoa + mesmo dia = mesmas
 * missões (abrir o app duas vezes não "re-sorteia").
 *
 * @param conclusoes quantas vezes cada missão já foi concluída (define o nível)
 * @param ontem ids das missões de ontem — evitadas quando há alternativa
 */
export function gerarMissoesDoDia(
  rotina: Rotina,
  data: string,
  semente: string,
  conclusoes: Readonly<Record<string, number>> = {},
  ontem: readonly string[] = [],
): NovoHabito[] {
  const rnd = aleatorio(hash(`${semente}|${data}`));
  const elegiveis = CATALOGO.filter((m) => m.serve(rotina));
  const escolher = (vaga: Vaga, qtd: number, ja: Set<string>): Missao[] => {
    const pool = embaralhar(
      elegiveis.filter((m) => m.vaga === vaga && !ja.has(m.id)),
      rnd,
    );
    // Prefere missões que não saíram ontem.
    pool.sort((a, b) => Number(ontem.includes(a.id)) - Number(ontem.includes(b.id)));
    return pool.slice(0, qtd);
  };

  const ja = new Set<string>();
  const escolhidas: Missao[] = [];
  const add = (ms: Missao[]) => ms.forEach((m) => (ja.add(m.id), escolhidas.push(m)));
  add(escolher("transporte", 1, ja));
  add(escolher("movimento", 1, ja));
  add(escolher("postura", 1, ja));
  add(escolher("habito", 2, ja));
  // Se faltou alguma vaga (rotina sem transporte elegível), completa com movimento.
  if (escolhidas.length < 5) add(escolher("movimento", 5 - escolhidas.length, ja));

  return escolhidas.map((m) => {
    const nivel = nivelDaMissao(conclusoes[m.id] ?? 0);
    return { missao_id: m.id, nivel, tipo: m.tipo, descricao_habito: m.texto(nivel, rotina) };
  });
}
