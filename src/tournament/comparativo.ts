// ---------------------------------------------------------------------------
// VOCÊ × O PADRÃO DO APP — o comparativo do fim de torneio.
//
// Pedido do Allan em 14/09/2026, depois de jogar um torneio inteiro às cegas e
// terminar em 4º de 100: *"tinha que ter um comparativo da forma que eu joguei
// às cegas e da forma que o aplicativo pede. Colocar porcentagem."*
//
// A tela já mostrava o que ELE fez (Fold 82% / Call 7% / Raise 11%) e uma nota
// de acerto (85%), mas em lugar nenhum dizia o que o app teria feito NAS MESMAS
// mãos. Sem isso, "82% de fold" não quer dizer nada: é muito? é pouco?
//
// ⚠️ O "padrão" aqui NÃO é uma tabela de fora nem um número de propaganda. É a
// recomendação que o próprio motor deu, decisão por decisão, nos spots que o
// jogador realmente enfrentou (o campo `adviceFam` do feedback, o mesmo que
// alimenta a nota de cada mão). Por isso o comparativo é honesto: os dois lados
// saem das MESMAS mãos, com as MESMAS cartas, nas MESMAS posições. Uma
// referência genérica de MTT responderia outra pergunta.
// ---------------------------------------------------------------------------

import type { Family } from "../feedback/analyzer";

/** Uma decisão do herói já avaliada: o que ele fez e o que o padrão pedia. */
export interface DecisaoComparavel {
  heroFam?: Family;
  adviceFam?: Family;
  /** Pré ou pós-flop. */
  kind?: "preflop" | "postflop";
  /** A mão inteira correu sem nenhuma dica na tela? */
  semDica?: boolean;
}

/** Três fatias que somam 100%: largar, pagar, agredir. */
export interface Fatias {
  fold: number;
  call: number;
  raise: number;
}

export interface LinhaComparativo {
  rotulo: "Largou" | "Pagou" | "Agrediu";
  voce: number;
  padrao: number;
  /** voce − padrao, em pontos percentuais. */
  diferenca: number;
}

export interface Comparativo {
  /** Nº de decisões que entraram na conta. */
  amostra: number;
  voce: Fatias;
  padrao: Fatias;
  linhas: LinhaComparativo[];
  /** A maior diferença encontrada (em pontos), ou undefined se tudo colado. */
  maiorGap?: LinhaComparativo;
  /** Frase de leitura — só sai quando a amostra sustenta. */
  leitura: string;
  /** Amostra suficiente para a leitura valer? */
  confiavel: boolean;
}

/** Abaixo disto, duas ou três decisões a mais viram 10 pontos de diferença e a
 *  comparação engana mais do que ensina. */
export const AMOSTRA_MINIMA_COMPARATIVO = 20;
/** Diferença que vale a pena apontar. Abaixo disso é ruído de arredondamento. */
const GAP_RELEVANTE = 6;

/** "check" conta junto com fold: as duas preservam a stack (mesma regra da
 *  anatomia, para os dois gráficos da tela falarem a mesma língua). */
function fatia(f: Family | undefined): keyof Fatias | null {
  if (f === "fold" || f === "check") return "fold";
  if (f === "call") return "call";
  if (f === "aggro") return "raise";
  return null;
}

function pct(v: number, n: number): number {
  return n > 0 ? Math.round((v / n) * 100) : 0;
}

/**
 * Compara as decisões do jogador com as do padrão nas mesmas mãos.
 *
 * `filtro` permite recortar a amostra — em especial `semDica`, que é o recorte
 * que o Allan pediu ("a forma que eu joguei às cegas").
 */
export function compararComOPadrao(
  decisoes: DecisaoComparavel[],
  filtro?: { semDica?: boolean; kind?: "preflop" | "postflop" },
): Comparativo {
  const uteis = decisoes.filter((d) => {
    if (filtro?.semDica !== undefined && d.semDica !== filtro.semDica) return false;
    if (filtro?.kind !== undefined && d.kind !== filtro.kind) return false;
    // Só entram decisões em que os DOIS lados são conhecidos: comparar com um
    // padrão ausente inventaria metade do gráfico.
    return fatia(d.heroFam) !== null && fatia(d.adviceFam) !== null;
  });

  const cV: Fatias = { fold: 0, call: 0, raise: 0 };
  const cP: Fatias = { fold: 0, call: 0, raise: 0 };
  for (const d of uteis) {
    cV[fatia(d.heroFam)!]++;
    cP[fatia(d.adviceFam)!]++;
  }
  const n = uteis.length;
  const voce: Fatias = { fold: pct(cV.fold, n), call: pct(cV.call, n), raise: pct(cV.raise, n) };
  const padrao: Fatias = { fold: pct(cP.fold, n), call: pct(cP.call, n), raise: pct(cP.raise, n) };

  const linhas: LinhaComparativo[] = [
    { rotulo: "Largou", voce: voce.fold, padrao: padrao.fold, diferenca: voce.fold - padrao.fold },
    { rotulo: "Pagou", voce: voce.call, padrao: padrao.call, diferenca: voce.call - padrao.call },
    { rotulo: "Agrediu", voce: voce.raise, padrao: padrao.raise, diferenca: voce.raise - padrao.raise },
  ];

  const confiavel = n >= AMOSTRA_MINIMA_COMPARATIVO;
  // Empate de magnitude é comum (agredir 40 a mais é largar 40 a menos — a mesma
  // história contada de dois jeitos). Nesse caso vence o EXCESSO: dizer o que a
  // pessoa fez demais é acionável; dizer o que ela fez de menos é abstrato.
  const maiorGap = [...linhas].sort((a, b) => {
    const m = Math.abs(b.diferenca) - Math.abs(a.diferenca);
    if (m !== 0) return m;
    return b.diferenca - a.diferenca;
  })[0];
  // Sem amostra não se aponta vazamento: a UI não deve destacar nada, e a
  // leitura já diz que faltam decisões.
  const gapRelevante =
    confiavel && maiorGap && Math.abs(maiorGap.diferenca) >= GAP_RELEVANTE ? maiorGap : undefined;

  return { amostra: n, voce, padrao, linhas, maiorGap: gapRelevante, leitura: ler(n, confiavel, gapRelevante), confiavel };
}

function ler(n: number, confiavel: boolean, gap?: LinhaComparativo): string {
  if (n === 0) {
    return "Sem decisões suas para comparar neste recorte.";
  }
  if (!confiavel) {
    return `Só ${n} ${n === 1 ? "decisão" : "decisões"} neste recorte — pouco para tirar conclusão. A partir de ${AMOSTRA_MINIMA_COMPARATIVO} a comparação começa a valer.`;
  }
  if (!gap) {
    return `Nas ${n} decisões deste recorte, a sua distribuição ficou colada na do padrão. É o retrato de quem está jogando perto do que o app orienta.`;
  }
  const d = Math.abs(gap.diferenca);
  if (gap.rotulo === "Largou") {
    return gap.diferenca > 0
      ? `Você largou ${d} pontos a mais do que o padrão largaria nas mesmas mãos. Sobra disciplina; falta aproveitar os spots em que o padrão seguia.`
      : `Você largou ${d} pontos a MENOS do que o padrão largaria nas mesmas mãos — está continuando em mãos que ele soltaria.`;
  }
  if (gap.rotulo === "Pagou") {
    return gap.diferenca > 0
      ? `Você pagou ${d} pontos a mais do que o padrão pagaria nas mesmas mãos. Pagar é a ação que menos ganha pote: vale conferir se era preço ou só curiosidade.`
      : `Você pagou ${d} pontos a menos do que o padrão pagaria nas mesmas mãos — há spots em que o preço pedia call e você soltou.`;
  }
  return gap.diferenca > 0
    ? `Você agrediu ${d} pontos a mais do que o padrão agrediria nas mesmas mãos. Confira as aberturas: agressão fora de range é a que mais custa fichas.`
    : `Você agrediu ${d} pontos a menos do que o padrão agrediria nas mesmas mãos — está deixando de tomar a iniciativa em spots que pediam.`;
}

/**
 * Quanto o jogo muda quando a dica sai da tela.
 *
 * É a pergunta que o "Jogar sozinho" existe para responder, e a tela mostrava
 * só metade dela ("81 de 99 decisões no padrão") — sem o outro lado, o número
 * não diz se ele joga melhor ou pior com ajuda.
 */
export interface ComDicaSemDica {
  semDica: { total: number; certas: number; pct: number };
  comDica: { total: number; certas: number; pct: number };
  /** pct sem dica − pct com dica (negativo = cai quando a dica some). */
  diferenca: number;
  /** Os dois lados têm amostra que sustente a comparação? */
  confiavel: boolean;
  leitura: string;
}

export function compararComESemDica(
  semDicaTotal: number,
  semDicaCertas: number,
  comDicaTotal: number,
  comDicaCertas: number,
): ComDicaSemDica {
  const p = (c: number, t: number) => (t > 0 ? Math.round((c / t) * 100) : 0);
  const sem = { total: semDicaTotal, certas: semDicaCertas, pct: p(semDicaCertas, semDicaTotal) };
  const com = { total: comDicaTotal, certas: comDicaCertas, pct: p(comDicaCertas, comDicaTotal) };
  const diferenca = sem.pct - com.pct;
  // Os DOIS lados precisam de amostra. Comparar 99 decisões com 3 não compara
  // nada — e é exatamente o caso de quem jogou o torneio quase todo às cegas.
  const confiavel = sem.total >= AMOSTRA_MINIMA_COMPARATIVO && com.total >= AMOSTRA_MINIMA_COMPARATIVO;

  let leitura: string;
  if (sem.total === 0) {
    leitura = "Você jogou este torneio todo com as dicas na tela.";
  } else if (com.total === 0) {
    leitura = `Você jogou este torneio todo às cegas: ${sem.certas} de ${sem.total} decisões no padrão (${sem.pct}%). Não há mãos com dica nesta sessão para comparar.`;
  } else if (!confiavel) {
    const curto = sem.total < AMOSTRA_MINIMA_COMPARATIVO ? "às cegas" : "com dica";
    leitura = `Poucas decisões ${curto} nesta sessão para comparar os dois jeitos de jogar (o mínimo é ${AMOSTRA_MINIMA_COMPARATIVO} de cada lado).`;
  } else if (Math.abs(diferenca) < 5) {
    leitura = `Às cegas você acertou ${sem.pct}%; com a dica na tela, ${com.pct}%. Praticamente o mesmo jogo — sinal de que o que você aprendeu já está saindo sem consulta.`;
  } else if (diferenca < 0) {
    leitura = `Às cegas você acertou ${sem.pct}%; com a dica na tela, ${com.pct}%. A diferença de ${Math.abs(diferenca)} pontos é o tamanho da ajuda que a dica ainda está dando.`;
  } else {
    leitura = `Às cegas você acertou ${sem.pct}%; com a dica na tela, ${com.pct}%. Você foi melhor sem a dica nesta sessão — vale olhar se as mãos com dica eram as mais difíceis.`;
  }
  return { semDica: sem, comDica: com, diferenca, confiavel, leitura };
}
