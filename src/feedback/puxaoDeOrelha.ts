// ---------------------------------------------------------------------------
// O PUXÃO DE ORELHA — o aviso que chega DURANTE o torneio.
//
// 13/10/2026. Pedido do Allan: *"se eu estiver jogando, passar um tempo e eu
// não estiver indo bem no torneio, tiver muito tight demais, eu receber uma
// mensagem tipo um puxão de orelha: oh, acorda, você tem que dar um start a
// mais, tá chegando na fase mais longa do torneio, você tá precisando agir
// mais."*
//
// É a mesma tese do ALVO (train/alvo.ts), só que AO VIVO: o histórico mostrou
// que ele sobrevive no nível de um profissional e acumula 2,7× menos. O alvo
// conta isso num ciclo fechado; aqui o app cutuca no meio do caminho.
//
// ---------------------------------------------------------------------------
// POR QUE ISTO NÃO É "VOCÊ ESTÁ JOGANDO APERTADO DEMAIS"
//
// A armadilha óbvia seria medir a largura do range dele contra uma régua
// genérica de VPIP/PFR e gritar "tight!". Isso daria conselho ERRADO na bolha,
// onde apertar É o certo — o ICM manda apertar.
//
// O que este módulo mede é outra coisa: quantas vezes ele discordou do PADRÃO
// na direção passiva. E o padrão do app já tem o ICM dentro (icmDelta). Então
// se o padrão mandou escalar, mandou com a bolha contada — e passar aquela mão
// é erro em qualquer fase. Não existe contradição possível.
//
// ---------------------------------------------------------------------------
// AS TRÊS TRAVAS (nenhuma pode ser afrouxada sem medir de novo)
//
// 1. SEM DADO, SEM FRASE. Precisa de 8 spots de acumulação na janela. Com
//    menos, o app cala a boca. (Mesma regra do coachContract.)
//
// 2. O NÚMERO TEM DE SER RARO POR ACASO. 6 falhas em 8 spots. Para quem acerta
//    70% das vezes, errar 6+ de 8 acontece ~1,1% das vezes — então o aviso não
//    dispara por azar, dispara por tendência.
//
// 3. O CONTRA-AVISO EXISTE. Um app que só cutuca "agride mais" ensina o
//    vazamento oposto. Escalar onde o padrão não pedia dispara o aviso
//    contrário. É a mesma trava do contra-placar do alvo.
// ---------------------------------------------------------------------------

import type { Stage } from "../tournament/structure";

/**
 * Spots de acumulação olhados de uma vez.
 *
 * Era 8, e a medição derrubou: a régua `sim/reguaDeAcumulacao.ts` conta ~11
 * spots de acumulação no TORNEIO INTEIRO (buy-in 109). Exigir 8 na janela
 * fazia o aviso quase nunca ser alcançável — ele só poderia nascer no fim do
 * torneio, e no máximo uma vez.
 *
 * 6 com 5 falhas tem a MESMA raridade por acaso que 8 com 6 (≈1,1% para quem
 * acerta 70%), e cabe num torneio de verdade. A trava não foi afrouxada: foi
 * recalibrada mantendo o mesmo risco de falso alarme.
 */
export const JANELA_DE_SPOTS = 6;
/** Falhas passivas dentro da janela que acendem o aviso (~1,1% por acaso). */
export const FALHAS_PARA_PUXAO = 5;
/** Decisões fora de spot olhadas para o contra-aviso. */
export const JANELA_DE_EXCESSO = 10;
/** Agressões sem spot que acendem o contra-aviso. */
export const EXCESSOS_PARA_PUXAO = 5;
/**
 * Abaixo disto o blind + ante comem o stack rápido e passar a mão é sangrar.
 * É o gatilho de FASE: sem ele o app cutucaria no início do torneio, onde
 * passar mão é barato e muitas vezes certo.
 */
export const BB_QUE_APERTA = 25;
/** Anti-spam: mãos entre um aviso e o próximo. */
export const MAOS_ENTRE_AVISOS = 15;
/** Anti-spam: teto por torneio. Puxão demais vira ruído e ele desliga. */
export const MAX_AVISOS_POR_TORNEIO = 3;

export type TipoDePuxao = "passivo" | "excessivo";

export interface DecisaoDaJanela {
  /** O padrão mandava escalar (adviceFam === "aggro"). */
  pediaEscalar: boolean;
  /** Você escalou (heroFam === "aggro"). */
  escalou: boolean;
}

export interface SinaisDoPuxao {
  /** Decisões do torneio atual, da mais ANTIGA para a mais NOVA. */
  janela: DecisaoDaJanela[];
  /** Stack efetivo do herói, em big blinds. */
  heroBB: number;
  stage: Stage;
  /** Mãos jogadas desde o último aviso. */
  maosDesdeOUltimo: number;
  /** Quantos avisos já saíram neste torneio. */
  avisosNoTorneio: number;
}

export interface Puxao {
  tipo: TipoDePuxao;
  titulo: string;
  texto: string;
  /** Os números que sustentam a frase. Sem eles a frase não nasce. */
  base: { olhados: number; falhas: number; heroBB: number };
}

function bb(n: number): string {
  return `${Math.round(n)}bb`;
}

/**
 * A FASE entra só no texto, nunca no gatilho — o gatilho é sempre "você
 * discordou do padrão". Aqui a frase explica por que DOER mais agora.
 */
function porQueDoiAgora(stage: Stage, heroBB: number): string {
  if (stage === "mesa_final") {
    return "Você está na mesa final: é aqui que o torneio paga de verdade, e cada mão passada vale muito mais do que valia lá atrás.";
  }
  if (stage === "bolha") {
    return `Na bolha o padrão já conta os prêmios — quando ele ainda assim manda escalar, é porque escalar é certo com o ICM na conta. Com ${bb(heroBB)} não dá pra esperar a mão perfeita.`;
  }
  if (heroBB <= 12) {
    return `Com ${bb(heroBB)} você tem umas poucas órbitas de vida. O blind te come antes de a mão boa chegar.`;
  }
  return `Com ${bb(heroBB)} o blind e o ante já comem o seu stack a cada volta. Passar a mão não é economizar — é sangrar devagar.`;
}

/**
 * Lê a janela e devolve o puxão, ou `undefined` quando não há o que dizer.
 * Calar a boca é a resposta mais comum — e é de propósito.
 */
export function lerPuxaoDeOrelha(s: SinaisDoPuxao): Puxao | undefined {
  // ---- anti-spam, antes de qualquer conta ----
  if (s.avisosNoTorneio >= MAX_AVISOS_POR_TORNEIO) return undefined;
  if (s.maosDesdeOUltimo < MAOS_ENTRE_AVISOS) return undefined;

  // ---- 1. passivo: só com janela cheia E com a fase pesando ----
  const spots = s.janela.filter((d) => d.pediaEscalar).slice(-JANELA_DE_SPOTS);
  const faseAperta = s.heroBB <= BB_QUE_APERTA || s.stage === "bolha" || s.stage === "mesa_final";
  if (spots.length >= JANELA_DE_SPOTS && faseAperta) {
    const falhas = spots.filter((d) => !d.escalou).length;
    if (falhas >= FALHAS_PARA_PUXAO) {
      return {
        tipo: "passivo",
        titulo: "Acorda",
        texto: `Nos últimos ${spots.length} spots em que o padrão mandava escalar, você escalou em ${spots.length - falhas}. ${porQueDoiAgora(s.stage, s.heroBB)}`,
        base: { olhados: spots.length, falhas, heroBB: s.heroBB },
      };
    }
  }

  // ---- 2. contra-aviso: agressão sem spot ----
  // Não depende da fase: escalar onde o padrão não pedia é caro em qualquer
  // lugar do torneio. Sem esta metade, o app ensinaria a agredir sempre.
  const foraDeSpot = s.janela.filter((d) => !d.pediaEscalar).slice(-JANELA_DE_EXCESSO);
  if (foraDeSpot.length >= JANELA_DE_EXCESSO) {
    const excessos = foraDeSpot.filter((d) => d.escalou).length;
    if (excessos >= EXCESSOS_PARA_PUXAO) {
      return {
        tipo: "excessivo",
        titulo: "Segura",
        texto: `Nas últimas ${foraDeSpot.length} decisões em que o padrão NÃO pedia agressão, você escalou em ${excessos}. Agressão fora do spot não constrói stack — ela devolve o que você já ganhou.`,
        base: { olhados: foraDeSpot.length, falhas: excessos, heroBB: s.heroBB },
      };
    }
  }

  return undefined;
}
