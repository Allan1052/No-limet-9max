// ---------------------------------------------------------------------------
// RISCO DE RUÍNA — a chance de zerar a banca, medida.
//
// 13/10/2026. O Allan contou como joga de verdade hoje:
//
//   *"eu fiz um depósito de 70 dólares, apostei os 70 todo no torneio, jogando,
//   jogando, de 70 que eu investi tudo, depois subi para 60. Dos 60 eu fui
//   investir ele todo de novo. Aí caí, gastei tudo, subi de novo para 26, 28.
//   Esses 28 eu joguei de novo, aí acabei zerando. Eu sei que estou jogando um
//   valor errado, porque joguei torneio de 11 dólares, 7 dólares, turbo."*
//
// $70 jogando $11 são 6 buy-ins. $70 jogando $7 são 10. A regra pede 100.
//
// ---------------------------------------------------------------------------
// DE ONDE SAEM OS NÚMEROS (sim/_ruinaRun.test.ts)
//
// Monte Carlo com a ESCADA DE PRÊMIO REAL do motor (`payoutLadder`), campo 279
// (o campo médio real dele) e rake de 10,29% (o dele). O jogador é modelado com
// DOIS parâmetros, cada um preso a um número medido no histórico:
//   - entrar no dinheiro: probabilidade = ITM medido, 23,5%;
//   - profundidade dentro do dinheiro: expoente β = 1,336, resolvido por
//     bisseção para o ROI bater os 3,84% medidos. β > 1 = concentrado no
//     min-cash — a mesma tese de "sobrevive e não acumula", por um terceiro
//     caminho.
//
// ⚠️ A primeira versão do modelo tinha UM parâmetro só, calibrado pelo ITM.
// Reproduziu o ITM (23,6%) e cuspiu ROI de 98,81% contra os 3,84% reais. Foi
// descartada. O modelo de dois parâmetros bate em TRÊS validações independentes:
// ITM 23,5% (medido 23,5%), ROI 4,21% (medido 3,84%) e dias no vermelho 59,8%
// (o real dele é 67,9%).
//
// Horizonte da simulação: 1.000 torneios, 20.000 tentativas por tamanho.
// ---------------------------------------------------------------------------

/** Pares (banca em buy-ins → % de vezes que quebrou), medidos. */
const TABELA: Array<[buyIns: number, risco: number]> = [
  [6, 93.1],
  [10, 88.7],
  [20, 77.2],
  [35, 62.2],
  [50, 49.7],
  [100, 19.0],
  [200, 1.1],
  [500, 0.0],
  [834, 0.0],
];

/** O desvio padrão medido de UM torneio, em buy-ins. */
export const DESVIO_POR_TORNEIO = 3.39;
/** Lucro esperado por torneio, em buy-ins (ROI 3,84% sobre o custo). */
export const LUCRO_POR_TORNEIO = 0.0464;
/** Torneios até o lucro acumulado passar um desvio padrão. */
export const TORNEIOS_ATE_O_SINAL = 5355;

/**
 * Chance de zerar a banca, em %, para um número de buy-ins de reserva.
 * Interpola entre os pontos medidos; fora das pontas, usa a ponta.
 *
 * NÃO extrapola para baixo de 6 nem acima de 834: fora da faixa medida o
 * número seria invenção, e um número inventado sobre quebrar é pior que
 * nenhum.
 */
export function riscoDeRuina(buyIns: number): number {
  if (!Number.isFinite(buyIns) || buyIns <= 0) return 100;
  if (buyIns <= TABELA[0][0]) return TABELA[0][1];
  const ultimo = TABELA[TABELA.length - 1];
  if (buyIns >= ultimo[0]) return ultimo[1];
  for (let i = 1; i < TABELA.length; i++) {
    const [b1, r1] = TABELA[i - 1];
    const [b2, r2] = TABELA[i];
    if (buyIns <= b2) {
      const t = (buyIns - b1) / (b2 - b1);
      return Math.round((r1 + t * (r2 - r1)) * 10) / 10;
    }
  }
  return ultimo[1];
}

/** Quantos buy-ins a banca cobre deste valor. */
export function buyInsDeReserva(saldo: number, buyIn: number): number {
  if (buyIn <= 0) return 0;
  return saldo / buyIn;
}

export type GravidadeDaRuina = "tranquilo" | "apertado" | "perigoso" | "quase_certo";

export function gravidade(risco: number): GravidadeDaRuina {
  if (risco <= 5) return "tranquilo";
  if (risco <= 25) return "apertado";
  if (risco <= 60) return "perigoso";
  return "quase_certo";
}

/**
 * O retrato que a tela mostra para um saldo e um buy-in.
 * `dentroDaFaixaMedida` é false quando a conta caiu fora dos pontos simulados —
 * a tela usa isso para falar em "mais de" em vez de dar um número exato.
 */
export interface RetratoDaRuina {
  buyIns: number;
  risco: number;
  gravidade: GravidadeDaRuina;
  dentroDaFaixaMedida: boolean;
}

export function retratoDaRuina(saldo: number, buyIn: number): RetratoDaRuina {
  const buyIns = buyInsDeReserva(saldo, buyIn);
  const risco = riscoDeRuina(buyIns);
  return {
    buyIns,
    risco,
    gravidade: gravidade(risco),
    dentroDaFaixaMedida: buyIns >= TABELA[0][0] && buyIns <= TABELA[TABELA.length - 1][0],
  };
}
