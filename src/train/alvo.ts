// ---------------------------------------------------------------------------
// O ALVO — a única coisa no app que TEM FIM.
//
// 13/10/2026. O Allan: *"aconteceu algo que eu temia, sempre começo algo e não
// termino, paro no meio do caminho. e com o App não foi diferente."*
//
// O app já tinha streak, missões, campanha, XP, conquistas, progresso e
// maestria — toda a máquina de "volte amanhã" — e ele parou mesmo assim. O
// diagnóstico não é falta de engajamento: é que NADA no app termina. Em coisa
// sem fim não existe "terminar", só existe "parar".
//
// O ALVO é o oposto de tudo isso: um ciclo FECHADO, de tamanho conhecido, que
// enche uma barra e ACABA. Quando enche, para de contar. Não recomeça sozinho,
// não vira missão diária, não entra em streak.
//
// ---------------------------------------------------------------------------
// O QUE ELE MEDE, E POR QUÊ
//
// A comparação do histórico do Allan (Allan1052) com o do irmão (bbru156), nos
// dois SharkScope de 13/10/2026:
//
//   ITM                      23,5%  ×  23,6%   <- empatado
//   % média do campo jogado  57,8%  ×  55,0%   <- o Allan está À FRENTE
//   finalizações tardias     13,3%  ×  12,5%   <- o Allan está À FRENTE
//   rake pago (% do buy-in)  10,3%  ×  10,9%   <- empatado
//   poder de vitória          6,0×  ×  16,2×   <- 2,7× a favor do irmão
//
// Por eliminação, sobra um diagnóstico só: ele SOBREVIVE bem e ACUMULA mal.
// Não é jogar mais apertado, não é entrar menos no dinheiro, não é cortar rake.
//
// Então o alvo conta SPOTS DE ACUMULAÇÃO: as decisões em que o padrão mandou
// ESCALAR (adviceFam === "aggro"). Usa-se `adviceFam` e não "o herói foi
// passivo" porque o alvo precisa saber ANTES da ação se aquele spot conta —
// senão a barra pula de um jeito que o jogador não entende.
//
// ---------------------------------------------------------------------------
// DE ONDE SAI O TAMANHO (não é chute)
//
// Régua `src/sim/reguaDeAcumulacao.ts`, 8 torneios por faixa, herói jogando a
// linha de base:  ~11 spots/torneio no 109 ·  ~23 no 5 ·  ~31 no 10,3K.
// Cerca de 80% deles são pré-flop.
//
// 100 spots = 4 a 9 torneios. Perto o bastante para terminar num fim de semana,
// grande o bastante para o placar significar alguma coisa.
//
// ⚠️ 100 spots NÃO é amostra para provar melhora. Com 50 por metade e taxa
// perto de 70%, só uma diferença acima de ~18 pontos entre as duas metades sai
// do ruído — e é exatamente isso que `diferencaSaiDoRuido()` cobra antes de a
// tela falar em evolução.
// ---------------------------------------------------------------------------

import type { Family } from "../feedback/analyzer";

/** Quantos spots de acumulação fecham um ciclo. Ver "DE ONDE SAI O TAMANHO". */
export const SPOTS_DO_ALVO = 100;
/** Onde a primeira metade é congelada, para o antes × depois. */
export const METADE_DO_ALVO = SPOTS_DO_ALVO / 2;

const KEY = "cof-alvo-v1";

export interface MetadeDoAlvo {
  spots: number;
  escalou: number;
}

export interface Alvo {
  versao: 1;
  iniciadoEm: string;
  /** Spots de acumulação vistos (o denominador da barra). */
  spots: number;
  /** Em quantos deles você escalou — a jogada que o padrão pedia. */
  escalou: number;
  /** Os mesmos dois, contados só nas mãos que correram SEM dica na tela. */
  spotsSozinho: number;
  escalouSozinho: number;
  /** Todas as decisões vistas — denominador do contra-placar. */
  decisoes: number;
  /**
   * CONTRA-PLACAR: vezes que você escalou e o padrão NÃO pedia.
   *
   * Existe para o alvo não virar "agrida sempre". Um alvo de acumulação sem
   * esta trava ensina o vazamento oposto — e aí o app teria piorado o jogador
   * em nome de uma barra bonita.
   */
  escalouDemais: number;
  /** Congelada quando o ciclo passa de METADE_DO_ALVO. */
  primeira?: MetadeDoAlvo;
  /** Quando a barra encheu. A partir daqui o alvo NÃO conta mais nada. */
  concluidoEm?: string;
  /** Quando o jogador viu a tela de fim e encerrou. Fim de verdade. */
  fechadoEm?: string;
}

export interface EntradaDoAlvo {
  adviceFam?: Family;
  heroFam?: Family;
  /** A mão inteira correu sem dica na tela (o app já marca isso). */
  semDica?: boolean;
}

function agora(): string {
  return new Date().toISOString();
}

export function alvoNovo(): Alvo {
  return {
    versao: 1,
    iniciadoEm: agora(),
    spots: 0,
    escalou: 0,
    spotsSozinho: 0,
    escalouSozinho: 0,
    decisoes: 0,
    escalouDemais: 0,
  };
}

export function carregarAlvo(): Alvo | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const a = JSON.parse(raw) as Alvo;
    if (!a || a.versao !== 1 || typeof a.spots !== "number") return null;
    return a;
  } catch {
    return null;
  }
}

export function salvarAlvo(a: Alvo): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    /* sem storage o alvo não persiste — o app continua funcionando */
  }
}

/** Abre um ciclo novo. Só por ação explícita do jogador. */
export function comecarAlvo(): Alvo {
  const a = alvoNovo();
  salvarAlvo(a);
  return a;
}

/** Apaga o ciclo. Só por ação explícita do jogador. */
export function limparAlvo(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* idem */
  }
}

/**
 * Encerra o ciclo concluído. É o FIM: o alvo some da tela e nada recomeça.
 * Num ciclo que ainda não encheu, não faz nada — fim é fim, não é desistência.
 */
export function fecharAlvo(): Alvo | null {
  const a = carregarAlvo();
  if (!a || !a.concluidoEm || a.fechadoEm) return a;
  const fechado: Alvo = { ...a, fechadoEm: agora() };
  salvarAlvo(fechado);
  return fechado;
}

/**
 * Conta uma decisão no ciclo aberto. Devolve o alvo atualizado, ou `null`
 * quando não há ciclo aberto (o app funciona igual sem alvo nenhum).
 *
 * ⚠️ Depois de `concluidoEm` o alvo NÃO conta mais nada — é o que faz dele uma
 * linha de chegada e não mais um contador infinito.
 */
export function registrarNoAlvo(e: EntradaDoAlvo): Alvo | null {
  const atual = carregarAlvo();
  if (!atual || atual.concluidoEm) return atual;
  const a: Alvo = { ...atual, decisoes: atual.decisoes + 1 };

  const pediaEscalar = e.adviceFam === "aggro";
  const escalou = e.heroFam === "aggro";

  if (pediaEscalar) {
    a.spots++;
    if (escalou) a.escalou++;
    if (e.semDica) {
      a.spotsSozinho++;
      if (escalou) a.escalouSozinho++;
    }
    if (!a.primeira && a.spots >= METADE_DO_ALVO) {
      a.primeira = { spots: a.spots, escalou: a.escalou };
    }
    if (a.spots >= SPOTS_DO_ALVO) a.concluidoEm = agora();
  } else if (escalou) {
    a.escalouDemais++;
  }

  salvarAlvo(a);
  return a;
}

export interface ProgressoDoAlvo {
  feito: number;
  total: number;
  faltam: number;
  pct: number;
  concluido: boolean;
  fechado: boolean;
  /** Estimativa de torneios que faltam, pela régua (~11 a ~31 spots/torneio). */
  torneiosMin: number;
  torneiosMax: number;
}

/** Faixa medida em `src/sim/reguaDeAcumulacao.ts` (13/10/2026). */
const SPOTS_POR_TORNEIO_MIN = 11;
const SPOTS_POR_TORNEIO_MAX = 31;

export function progressoDoAlvo(a: Alvo): ProgressoDoAlvo {
  const feito = Math.min(a.spots, SPOTS_DO_ALVO);
  const faltam = Math.max(0, SPOTS_DO_ALVO - feito);
  return {
    feito,
    total: SPOTS_DO_ALVO,
    faltam,
    pct: Math.round((feito / SPOTS_DO_ALVO) * 100),
    concluido: !!a.concluidoEm,
    fechado: !!a.fechadoEm,
    torneiosMin: Math.ceil(faltam / SPOTS_POR_TORNEIO_MAX),
    torneiosMax: Math.ceil(faltam / SPOTS_POR_TORNEIO_MIN),
  };
}

export type EixoDoAlvo = "passivo" | "excessivo" | "equilibrado" | "limpo";

export interface PlacarDoAlvo {
  /** Quanto das vezes que o padrão pedia escalar você escalou (0..1). */
  taxaEscalada?: number;
  /** A mesma taxa, só nas mãos sem dica na tela — o número de verdade. */
  taxaSozinho?: number;
  /** Falhas por PASSAR a mão (o padrão pedia escalar e você não escalou). */
  falhasPassivas: number;
  /** Falhas por EXAGERAR (você escalou e o padrão não pedia). */
  falhasExcesso: number;
  /**
   * De que lado pesam as suas falhas. É o teste da tese do SharkScope dentro
   * do app: se vier "excessivo", o diagnóstico de acumulação está errado.
   */
  eixo: EixoDoAlvo;
  /** Fração das falhas que é do lado passivo (0..1), quando há falha. */
  pesoPassivo?: number;
}

const LIMITE_DO_EIXO = 0.6;

export function placarDoAlvo(a: Alvo): PlacarDoAlvo {
  const falhasPassivas = a.spots - a.escalou;
  const falhasExcesso = a.escalouDemais;
  const total = falhasPassivas + falhasExcesso;
  let eixo: EixoDoAlvo = "limpo";
  let pesoPassivo: number | undefined;
  if (total > 0) {
    pesoPassivo = falhasPassivas / total;
    eixo =
      pesoPassivo >= LIMITE_DO_EIXO
        ? "passivo"
        : pesoPassivo <= 1 - LIMITE_DO_EIXO
          ? "excessivo"
          : "equilibrado";
  }
  return {
    taxaEscalada: a.spots > 0 ? a.escalou / a.spots : undefined,
    taxaSozinho: a.spotsSozinho > 0 ? a.escalouSozinho / a.spotsSozinho : undefined,
    falhasPassivas,
    falhasExcesso,
    eixo,
    pesoPassivo,
  };
}

export interface EvolucaoDoAlvo {
  primeira: number;
  segunda: number;
  diferenca: number;
  /** A diferença é maior que o ruído da própria amostra? */
  saiDoRuido: boolean;
}

/**
 * A diferença entre as duas metades é maior que o ruído da própria amostra?
 *
 * Recebe CONTAGENS (acertos e total), não proporções: a proporção sozinha
 * perde o tamanho da amostra, e é o tamanho que decide se 10 pontos querem
 * dizer alguma coisa.
 *
 * Usa o ajuste de Agresti-Caffo (soma 1 acerto e 1 erro a cada metade) em vez
 * da fórmula crua. Motivo prático, achado por teste: na fórmula crua a
 * variância COLAPSA A ZERO nos extremos, então um salto de 0% para 100% — a
 * maior diferença que existe — era carimbado como ruído. O ajuste resolve isso
 * e é o padrão para diferença de proporções com amostra pequena.
 *
 * Com 50 spots por metade e taxa perto de 70%, o corte fica em ~18 pontos:
 * abaixo disso o alvo NÃO fala em evolução.
 */
export function diferencaSaiDoRuido(x1: number, n1: number, x2: number, n2: number): boolean {
  if (n1 <= 0 || n2 <= 0) return false;
  const p1 = (x1 + 1) / (n1 + 2);
  const p2 = (x2 + 1) / (n2 + 2);
  const se = Math.sqrt((p1 * (1 - p1)) / (n1 + 2) + (p2 * (1 - p2)) / (n2 + 2));
  if (!Number.isFinite(se) || se <= 0) return false;
  return Math.abs(p2 - p1) >= 2 * se;
}

/**
 * Primeira metade × segunda metade. Só existe no ciclo concluído — antes disso
 * a segunda metade ainda está sendo escrita e comparar seria enganar.
 */
export function evolucaoDoAlvo(a: Alvo): EvolucaoDoAlvo | undefined {
  if (!a.concluidoEm || !a.primeira) return undefined;
  const n1 = a.primeira.spots;
  const n2 = a.spots - n1;
  if (n1 <= 0 || n2 <= 0) return undefined;
  const x1 = a.primeira.escalou;
  const x2 = a.escalou - x1;
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  return {
    primeira: p1,
    segunda: p2,
    diferenca: p2 - p1,
    saiDoRuido: diferencaSaiDoRuido(x1, n1, x2, n2),
  };
}
