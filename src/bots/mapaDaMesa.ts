// ---------------------------------------------------------------------------
// O MAPA DE STACKS DA MESA — quem cobre quem, quem está curto, quem ainda fala.
//
// 17/09/2026. O motor SEMPRE soube isso e nunca contou para ninguém: em
// `preflopBot.ts` já existe `stacks = live.map(p => (p.stack + p.committed)/bb)`
// — o stack de todo mundo, em big blinds. Só que esse array nasce e morre
// dentro do cálculo de ICM. O `PreflopContext`, que decide a mão, recebe apenas
// `effectiveBB` (o menor dos dois stacks do confronto), então o coach nunca
// pôde dizer "tem um short de 5bb nessa mesa influenciando sua decisão".
//
// É a mesma história do `villainRangePct`: dado calculado, nunca mostrado.
//
// Este módulo é aritmética pura sobre a lista de stacks. Não decide nada, não
// altera estratégia: só transforma a mesa em fatos que o coach pode narrar —
// e cada fato aqui é verificável olhando a tela.
// ---------------------------------------------------------------------------

/** Um assento vivo, do ponto de vista do mapa. */
export interface AssentoDoMapa {
  /** Stack TOTAL em big blinds (fichas atrás + o que já pôs no pote). */
  bb: number;
  /** É o herói? */
  heroi?: boolean;
  /** Ainda vai falar DEPOIS do herói nesta rodada de apostas? */
  aindaFala?: boolean;
}

export interface MapaDaMesa {
  /** Stack do herói (bb). */
  heroBB: number;
  /** Quantos jogadores o herói cobre (o stack dele é maior). */
  cobre: number;
  /** Quantos jogadores cobrem o herói. */
  cobertoPor: number;
  /** O menor stack da mesa fora o herói (bb), quando há alguém. */
  menorBB?: number;
  /** Quantos estão em stack crítico (≤ 10bb), fora o herói. */
  shorts: number;
  /** Quantos ainda falam depois do herói nesta rodada. */
  aindaFalam: number;
  /** Quantos assentos vivos, contando o herói. */
  vivos: number;
  /** O herói é o maior stack da mesa? */
  maiorDaMesa: boolean;
  /** O herói é o menor stack da mesa? */
  menorDaMesa: boolean;
}

/** A partir de quantos big blinds um stack deixa de ser crítico. */
export const SHORT_CRITICO_BB = 10;

/**
 * Lê a mesa e devolve os fatos.
 *
 * "Cobrir" é comparação de stack TOTAL, como na mesa: quem tem mais fichas pode
 * eliminar o outro sem morrer. Empate não conta para nenhum dos dois lados —
 * dois stacks iguais se eliminam mutuamente, então ninguém cobre ninguém.
 */
export function lerMapaDaMesa(assentos: AssentoDoMapa[]): MapaDaMesa | undefined {
  const vivos = assentos.filter((a) => Number.isFinite(a.bb) && a.bb > 0);
  const hero = vivos.find((a) => a.heroi);
  if (!hero || vivos.length < 2) return undefined;

  const outros = vivos.filter((a) => a !== hero);
  const cobre = outros.filter((a) => hero.bb > a.bb).length;
  const cobertoPor = outros.filter((a) => a.bb > hero.bb).length;
  const menorBB = outros.length ? Math.min(...outros.map((a) => a.bb)) : undefined;
  const maiorOutro = outros.length ? Math.max(...outros.map((a) => a.bb)) : undefined;

  return {
    heroBB: hero.bb,
    cobre,
    cobertoPor,
    menorBB,
    shorts: outros.filter((a) => a.bb <= SHORT_CRITICO_BB).length,
    aindaFalam: outros.filter((a) => a.aindaFala).length,
    vivos: vivos.length,
    maiorDaMesa: maiorOutro !== undefined && hero.bb > maiorOutro,
    menorDaMesa: menorBB !== undefined && hero.bb < menorBB,
  };
}
