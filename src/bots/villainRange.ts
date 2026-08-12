// ---------------------------------------------------------------------------
// Estimativa da largura do range do vilão, que ESTREITA rua a rua.
//
// No pré-flop, um pote aberto com raise dá um range mais estreito que um pote
// limpado. A cada rua que o vilão continua (e mais ainda quando ELE aposta), o
// range aperta: quem paga flop, turn e river com força tende a ter mão feita.
//
// É uma heurística transparente (não rastreamos o range combo a combo de cada
// oponente), mas captura o efeito central: quanto mais fundo e mais agressiva a
// linha, mais forte o range que resta — o que muda bastante a equity estimada.
// ---------------------------------------------------------------------------

import type { TableState } from "../game/state";

export function estimateVillainRangePct(t: TableState, heroSeat: number): number {
  // Base pela ALTURA da agressão pré-flop. Um pote 3-betado/4-betado deixa um
  // range MUITO mais estreito que uma abertura simples — e é isso que o motor
  // antigo ignorava (tratava qualquer aumento como ~30%), superestimando a
  // equity do herói em potes reraiseados (o print do ás-alto "de valor" num
  // pote de 3-bet). Contar os raises corrige a raiz.
  //   0 = pote limpado · 1 = abertura · 2 = 3-bet · 3 = 4-bet · 4+ = 5-bet+.
  const raises = t.preflopRaises ?? (t.preflopAggressor >= 0 ? 1 : 0);
  let pct: number;
  if (raises >= 4) pct = 0.05; //     5-bet+: só o topo premium (AA/KK/QQ/AK)
  else if (raises === 3) pct = 0.07; // 4-bet
  else if (raises === 2) pct = 0.1; //  3-bet
  else if (raises === 1) pct = 0.28; // abertura simples (um raiser)
  else pct = 0.5; //                    pote limpado / não aberto

  // Aperto acumulado por rua alcançada (continuar custa; sobra o mais forte).
  if (t.board.length >= 5) pct *= 0.85 * 0.75 * 0.7; // river
  else if (t.board.length === 4) pct *= 0.85 * 0.75; // turn
  else if (t.board.length === 3) pct *= 0.85; // flop

  // Se há uma aposta na nossa frente AGORA, o vilão está representando força.
  const hero = t.players[heroSeat];
  const toCall = t.currentBet - hero.committed;
  if (toCall > 0) pct *= 0.7;

  return Math.max(0.05, Math.min(0.6, pct));
}
