// ---------------------------------------------------------------------------
// CHECK-RAISE — a jogada que faltava.
//
// 🐞/✨ 15/09/2026. Medi 70 torneios e o Allan tinha razão: "não tive nenhuma
// situação de fazer eu pensar por muito tempo". A palavra "check-raise" não
// aparecia em lugar nenhum do código dos bots. Eles tinham dois modos — "estou
// enfrentando aposta" (pagar/largar/aumentar-com-mão) e "a ação chegou limpa"
// (apostar ou passar). Passar COM A INTENÇÃO de aumentar não existia. É a
// jogada que mais tira o chão do adversário, e ela simplesmente não acontecia:
// 0,7 a 1,7 por 100 mãos, e mesmo esses eram acidente de ordem de ação.
//
// FREQUÊNCIAS — de onde saem (nada inventado):
//   • Em MTT, a faixa de check-raise no flop fica entre ~10% e ~18,5% do range,
//     e a recomendação é ficar mais perto do TOPO porque as c-bets de torneio
//     costumam ser menores (mais barato aumentar).           [mttpokerschool]
//   • Nos micros é raro passar de ~7%: lá o check-raise é quase só de valor.
//                                                             [BlackRain79]
//   • Solvers pedem ~10-15% na maioria dos spots de flop, e num BB vs BTN
//     contra stab de 33% do pote chegam a 21%.               [Upswing/cardplayer]
//   • Abaixo de 7% o jogador é lido como "só aumenta com mão feita" — que é
//     exatamente o que os nossos bots eram.                   [BlackRain79]
//
// Por isso a frequência-alvo é do PERFIL, não global: recreativo ~6% (só
// valor), regular sólido ~14%, agressivo ~19%. A escada de buy-in move a
// composição do campo, então o 10,3K sente mais check-raise simplesmente por
// estar cheio de perfis que check-raisam.
// ---------------------------------------------------------------------------

import type { BotProfile } from "./profiles";

export interface SpotDeCheckRaise {
  /** Equity da mão contra o range estimado do vilão (0..1). */
  equity: number;
  /** Equity que o preço exige para pagar (0..1). */
  required: number;
  /** Quão molhado é o board (0..1) — board molhado sustenta mais blefe. */
  wetness: number;
  /** Força do projeto (0..1); acima de 0.5 é projeto de verdade. */
  drawStrength: number;
  /** Quantos oponentes ainda na mão. */
  numOpponents: number;
  /** Rua: 0 = flop, 1 = turn, 2 = river. */
  streetIdx: number;
}

export interface PlanoDeCheckRaise {
  /** Aumentar agora? */
  aumentar: boolean;
  /** Foi por valor ou por blefe (para a narração e para os testes). */
  tipo: "valor" | "blefe" | "nenhum";
  /** A probabilidade usada — exposta para medição. */
  prob: number;
}

/** Equity a partir da qual o check-raise é de VALOR puro. */
const EQUITY_VALOR = 0.62;
/** Piso de equity para um check-raise de blefe: abaixo disso não há saída. */
const EQUITY_MINIMA_BLEFE = 0.18;

/**
 * Frequência-alvo de check-raise deste perfil, no flop.
 *
 * Deriva da agressão e do blefe do próprio perfil — não é uma tabela nova para
 * manter em sincronia. Recreativo/station caem perto dos 6% dos micros; TAG
 * fica na faixa de MTT (~14%); LAG/spewy vão ao topo (~19-20%).
 */
export function frequenciaAlvo(p: BotProfile): number {
  // Calibrada nos dois extremos publicados: recreativo cai em ~7% (nos micros é
  // raro passar disso) e um regular agressivo de faixa alta encosta nos ~20%
  // (topo da faixa de MTT; solvers chegam a 21% em spots de BB vs BTN).
  // ⚠️ Este é o piso da probabilidade POR SPOT de blefe, não a taxa agregada.
  // Medido em 15/09: com 0.02+0.16·agr o campo entregava só 5%-9% de
  // check-raise agregado — abaixo do alvo até para o micro, porque boa parte
  // dos spots nem chega ao ramo de blefe (equity baixa demais). Calibrado para
  // a taxa AGREGADA cair nas faixas declaradas em escadaDeBuyIn.ts.
  // Curva calibrada por medição (régua sim/_agressaoRun), não por intuição:
  //   station/recreativo → 2%-7%   (nos micros é raro passar de ~7%)
  //   TAG                → ~16%    (faixa de MTT: 10,4%-18,5%)
  //   LAG / campo elite  → 25%-30% (agregado bate no topo da faixa; solvers
  //                                 chegam a 21% em BB vs BTN)
  // O intercepto negativo é de propósito: perfil passivo quase não check-raisa,
  // e era isso que a versão anterior (0.05 + 0.34·agr) não respeitava — ela
  // deixava o campo do micro com 13% de check-raise, o dobro do publicado.
  const base = 0.32 * p.aggression - 0.035 + 0.06 * (p.bluffFactor - 1);
  return Math.max(0.02, Math.min(0.34, base));
}

/**
 * Decide o check-raise. Devolve `aumentar: false` quando o spot não pede.
 *
 * ⚠️ Só é chamado quando o bot REALMENTE passou nesta rua e está enfrentando
 * uma aposta (ver `passouNestaRua` em game/state.ts). Aumentar sem ter passado
 * é outro assunto (raise de blefe comum), tratado em decision.ts.
 */
export function decidirCheckRaise(
  p: BotProfile,
  spot: SpotDeCheckRaise,
  rng: () => number,
): PlanoDeCheckRaise {
  // Multiway o check-raise de blefe cai muito: há gente demais para passar.
  const multiway = spot.numOpponents > 1 ? 1 - p.multiwayReduction : 1;

  // ---- VALOR: mão forte que quer engordar o pote --------------------------
  if (spot.equity >= EQUITY_VALOR) {
    // Quase sempre aumenta; o resto é armadilha (só pagar). Perfil passivo
    // ainda prefere pagar com mão boa — é o que faz dele passivo.
    const prob = Math.min(0.9, (0.45 + 0.5 * p.aggression) * (0.6 + 0.4 * multiway));
    return { aumentar: rng() < prob, tipo: "valor", prob };
  }

  // ---- BLEFE: precisa de alguma saída e de um board que conte história ----
  if (spot.equity < EQUITY_MINIMA_BLEFE) {
    return { aumentar: false, tipo: "nenhum", prob: 0 };
  }

  // A frequência-alvo do perfil é o ponto de partida; o spot modula.
  let prob = frequenciaAlvo(p);
  // Projeto de verdade é o melhor motivo para check-raisar sem mão feita:
  // ganha na hora ou melhora depois.
  prob *= 1 + 1.6 * Math.min(1, spot.drawStrength);
  // Board molhado sustenta a história; board seco entrega o blefe.
  prob *= 0.55 + 0.9 * spot.wetness;
  // River não tem mais carta para vir: só quem blefa de verdade vai.
  if (spot.streetIdx === 2) prob *= 0.55 * p.bluffFactor;
  prob *= multiway;
  // Equity encostada no preço já paga; check-raisar ali é queimar valor.
  if (spot.equity >= spot.required) prob *= 0.7;

  prob = Math.max(0, Math.min(0.5, prob));
  return { aumentar: rng() < prob, tipo: "blefe", prob };
}
