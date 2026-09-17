// ---------------------------------------------------------------------------
// QUANTO O COACH DEVE FALAR NESTA MÃO.
//
// 17/09/2026, pedido do Allan: *"8 e 2 é fold, pronto, acabou. Mas quando eu
// pego uma mão que eu vou e dou um raise, eu quero receber uma dica, o porquê
// que eu estou dando esse raise, a importância, o que essa mão representa."*
//
// Antes disto o coach falava IGUAL em toda mão. Comentar 82o em UTG não ensina
// nada e gasta a atenção que ia fazer falta no spot difícil três mãos depois.
//
// A RÉGUA NÃO É "decisão apertada" — é "você está colocando ficha no pote".
// Foi o Allan quem apontou: a mão que ele JOGA é a que ele quer entender. Lixo
// que se joga fora não precisa de parágrafo. Então:
//
//   · ENTRAR no pote (raise/bet/call/all-in)  -> sempre explica
//   · FOLDAR lixo, sem nada em jogo           -> só a ação, em silêncio
//   · FOLDAR algo que quase deu               -> explica (é aí que se aprende)
//
// Em cima disso vêm os sinais de spot que ELEVAM a mão a "merece review": ICM
// que virou a decisão, all-in na mesa, guerra de 3-bet, preço na fronteira,
// SPR crítico e o erro do próprio jogador.
//
// Tudo aqui sai de dado que o motor JÁ calcula. Nenhum sinal novo foi inventado
// para esta régua — se o campo não veio, o sinal não acende.
// ---------------------------------------------------------------------------

import type { Family, IcmDelta } from "./analyzer";

/** Quanto o coach fala nesta mão. */
export type Importancia = "obvia" | "interessante" | "excepcional";

/** Por que a mão subiu de nível. Serve para o texto e para as réguas. */
export type SinalDoSpot =
  | "entrouNoPote"      // a recomendação coloca fichas no pote
  | "decisaoDisputada"  // o padrão é misto: a mão está na borda do range
  | "precoNaFronteira"  // equity e equity exigida quase empatadas
  | "icmVirou"          // o torneio mudou a decisão que as fichas mandariam
  | "allinNaMesa"       // há um all-in para pagar
  | "guerraDeApostas"   // 3-bet ou mais
  | "sprCritico"        // pote grande para o stack que sobrou
  | "pontoDeVirada"     // o tamanho da aposta está colado no ponto de virada
  | "errouAFamilia";    // você fez uma coisa e o padrão era outra

/** Os dados do spot. Todos opcionais: o que não veio, não acende sinal. */
export interface SinaisDoSpot {
  /** Estratégia mista recomendada (frequências) — a régua de "mão de borda". */
  mix?: { action: string; freq: number }[];
  /** Família da ação RECOMENDADA. */
  adviceFam?: Family;
  /** Família da ação que o jogador FEZ. */
  heroFam?: Family;
  /** Sua chance de ganhar (0..1). */
  equity?: number;
  /** A chance que o preço exige (0..1). */
  requiredEquity?: number;
  /** O ICM medido (motor rodado com e sem prêmios). */
  icmDelta?: IcmDelta;
  /** A aposta enfrentada era um all-in. */
  facingAllin?: boolean;
  /** Nível de aposta enfrentado (0=RFI, 1=open, 2=3-bet, 3=4-bet). */
  betLevelFaced?: number;
  /** Stack-to-pot ratio. */
  spr?: number;
  /** Tamanho de aposta (bb) em que a decisão vira. */
  breakEvenCallBB?: number;
  /** Quanto falta pagar (bb). */
  toCallBB?: number;
}

export interface LeituraDaMao {
  nivel: Importancia;
  /** Os sinais que acenderam, na ordem em que foram testados. */
  sinais: SinalDoSpot[];
}

// --- as faixas, num lugar só para ficarem à vista -------------------------
/** Abaixo disto o padrão é misto: a mão está na borda, não no miolo do range. */
const FREQ_DOMINANTE = 0.9;
/** Distância entre equity e equity exigida que ainda conta como "empate". */
const MARGEM_FRONTEIRA = 0.05;
/** SPR em que qualquer aposta já compromete o stack. */
const SPR_CRITICO = 1.5;
/** O quanto o preço pode estar longe do ponto de virada e ainda ser "colado". */
const COLADO_NO_VIRA = 0.15;
/** A partir de quantos sinais a mão vira material de review. */
const SINAIS_PARA_REVIEW = 3;

function entraNoPote(fam: Family | undefined): boolean {
  return fam === "call" || fam === "aggro";
}

/** A ação recomendada é a dominante do mix? (Se não há mix, trata como sim.) */
function freqDaRecomendacao(mix: SinaisDoSpot["mix"]): number | undefined {
  if (!mix || mix.length === 0) return undefined;
  const maior = mix.reduce((a, b) => (b.freq > a.freq ? b : a));
  return maior.freq;
}

/**
 * Lê o spot e devolve quanto o coach deve falar.
 *
 * Regra de ouro: um sinal aceso já tira a mão do silêncio. Três sinais, ou
 * qualquer um dos três "pesados" (ICM que virou, all-in na mesa, erro do
 * jogador num spot já disputado), mandam a mão para o review.
 */
export function lerImportancia(s: SinaisDoSpot): LeituraDaMao {
  const sinais: SinalDoSpot[] = [];

  if (entraNoPote(s.adviceFam)) sinais.push("entrouNoPote");

  const freq = freqDaRecomendacao(s.mix);
  if (freq !== undefined && freq < FREQ_DOMINANTE) sinais.push("decisaoDisputada");

  if (s.equity !== undefined && s.requiredEquity !== undefined
      && Math.abs(s.equity - s.requiredEquity) <= MARGEM_FRONTEIRA) {
    sinais.push("precoNaFronteira");
  }

  // ICM só conta quando MUDOU a decisão — não basta o torneio ter prêmios.
  // O objeto só nasce quando as duas respostas diferem, mas comparamos aqui
  // também: assim a régua não depende de quem preencheu o campo lembrar disso.
  if (s.icmDelta && s.icmDelta.comIcm !== s.icmDelta.semIcm) sinais.push("icmVirou");

  if (s.facingAllin) sinais.push("allinNaMesa");

  if ((s.betLevelFaced ?? 0) >= 2) sinais.push("guerraDeApostas");

  if (s.spr !== undefined && s.spr > 0 && s.spr <= SPR_CRITICO) sinais.push("sprCritico");

  if (s.breakEvenCallBB !== undefined && s.toCallBB !== undefined && s.toCallBB > 0) {
    const distancia = Math.abs(s.breakEvenCallBB - s.toCallBB) / s.toCallBB;
    if (distancia <= COLADO_NO_VIRA) sinais.push("pontoDeVirada");
  }

  const errou = s.heroFam !== undefined && s.adviceFam !== undefined && s.heroFam !== s.adviceFam;
  if (errou) sinais.push("errouAFamilia");

  const pesado = sinais.includes("icmVirou")
    || sinais.includes("allinNaMesa")
    || (errou && sinais.length >= 2);

  if (pesado || sinais.length >= SINAIS_PARA_REVIEW) return { nivel: "excepcional", sinais };
  if (sinais.length >= 1) return { nivel: "interessante", sinais };
  return { nivel: "obvia", sinais };
}

/** Atalho para quem só quer saber se pode ficar calado. */
export function podeFicarCalado(s: SinaisDoSpot): boolean {
  return lerImportancia(s).nivel === "obvia";
}

/** Atalho para marcar a mão no fim do torneio. */
export function mereceReview(s: SinaisDoSpot): boolean {
  return lerImportancia(s).nivel === "excepcional";
}
