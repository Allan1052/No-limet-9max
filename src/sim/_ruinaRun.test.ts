// Execução sob demanda: RISCO DE RUÍNA e RUÍDO DE UM DIA, com os números
// medidos no histórico do Allan1052 e a escada de prêmio real do motor.
//   CF_REGUA=1 npx vitest run src/sim/_ruinaRun.test.ts
import { describe, it } from "vitest";
import { payoutLadder, prizePool, paidPlaces } from "../tournament/structure";

const CAMPO = 279;        // campo médio real dele (SharkScope)
const ITM = 0.235;        // ITM medido
const RAKE = 0.1029;      // rake medido, como fração do buy-in
const CUSTO = 1 + RAKE;   // o que sai do bolso por inscrição, em buy-ins
const ROI_REAL = 0.0384;  // ROI líquido medido

function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** Escada em BUY-INS (pool = 1 por inscrito). */
const ladder = payoutLadder(CAMPO, prizePool(1, CAMPO));
const PAGOS = paidPlaces(CAMPO);

/**
 * MODELO DE DOIS PARÂMETROS — e o primeiro tentou ser de um só.
 *
 * A primeira versão usava um expoente único calibrado pelo ITM. Ele reproduziu
 * o ITM (23,6% × 23,5% medido) e cuspiu ROI de 98,81% contra os 3,84% reais.
 * Não foi bug: um jogador que chega ao dinheiro 1,57× mais que o acaso E se
 * distribui bem DENTRO do dinheiro ganharia uma fortuna numa escada top-heavy.
 * O Allan não ganha — logo ele NÃO se distribui bem dentro do dinheiro.
 *
 * Então são dois parâmetros, cada um preso a um número medido:
 *   - entrar no dinheiro: a probabilidade É o ITM medido (23,5%);
 *   - profundidade dentro do dinheiro: expoente BETA, resolvido por bisseção
 *     para o ROI bater os 3,84% medidos. BETA > 1 = concentrado no min-cash.
 */
function mediaComBeta(beta: number): number {
  let soma = 0;
  const PASSOS = 20_000;
  for (let i = 0; i < PASSOS; i++) {
    const u = (i + 0.5) / PASSOS;
    const lugar = Math.max(1, Math.min(PAGOS, Math.ceil(PAGOS * Math.pow(u, 1 / beta))));
    soma += ladder[lugar - 1];
  }
  return ITM * (soma / PASSOS);
}
const ALVO_CASH = CUSTO * (1 + ROI_REAL);
function resolverBeta(): number {
  let lo = 0.05, hi = 60;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (mediaComBeta(mid) > ALVO_CASH) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
const BETA = resolverBeta();

function umTorneio(r: () => number): number {
  if (r() >= ITM) return 0;
  const lugar = Math.max(1, Math.min(PAGOS, Math.ceil(PAGOS * Math.pow(r(), 1 / BETA))));
  return ladder[lugar - 1];
}

describe("risco de ruína", () => {
  it("mede", () => {
    const r = rng(20261013);
    const N = 400_000;
    let soma = 0, soma2 = 0, itm = 0;
    const amostra: number[] = [];
    for (let i = 0; i < N; i++) {
      const c = umTorneio(r);
      const lucro = c - CUSTO;
      soma += lucro; soma2 += lucro * lucro;
      if (c > 0) itm++;
      if (i < 50_000) amostra.push(lucro);
    }
    const media = soma / N;
    const sd = Math.sqrt(soma2 / N - media * media);
    const L: string[] = [];
    L.push(`beta=${BETA.toFixed(3)} (>1 = concentrado no min-cash)  pagos=${PAGOS}/${CAMPO}`);
    L.push(`ITM simulado   ${(itm / N * 100).toFixed(1)}%   (medido ${(ITM*100).toFixed(1)}%)`);
    L.push(`ROI simulado   ${(media / CUSTO * 100).toFixed(2)}%  (medido ${(ROI_REAL*100).toFixed(2)}%)`);
    L.push(`lucro/torneio  ${media.toFixed(4)} buy-ins`);
    L.push(`DESVIO PADRÃO  ${sd.toFixed(2)} buy-ins por torneio`);
    L.push(`torneios até o lucro passar 1 desvio: ${Math.ceil(Math.pow(sd / media, 2))}`);
    L.push("");

    // --- um DIA de jogo (13,5 torneios, o ritmo real dele) ---
    const DIA = 14;
    const dias = 200_000;
    let neg = 0; const res: number[] = [];
    const r2 = rng(777);
    for (let d = 0; d < dias; d++) {
      let s = 0;
      for (let i = 0; i < DIA; i++) s += umTorneio(r2) - CUSTO;
      if (s < 0) neg++;
      res.push(s);
    }
    res.sort((a, b) => a - b);
    const q = (p: number) => res[Math.floor(p * res.length)];
    L.push(`UM DIA de ${DIA} torneios:`);
    L.push(`  esperado  ${(media * DIA).toFixed(2)} buy-ins`);
    L.push(`  termina no vermelho em ${(neg / dias * 100).toFixed(1)}% dos dias`);
    L.push(`  faixa dos 80% centrais: ${q(0.1).toFixed(1)} a ${q(0.9).toFixed(1)} buy-ins`);
    L.push("");

    // --- RISCO DE RUÍNA por tamanho de banca ---
    L.push("RUÍNA (1.000 torneios ou até quebrar):");
    L.push("  banca(buy-ins)   quebrou%");
    for (const B of [6, 10, 20, 35, 50, 100, 200, 500, 834]) {
      const r3 = rng(B * 31 + 5);
      const tent = 20_000; let quebrou = 0;
      for (let t = 0; t < tent; t++) {
        let banca = B;
        for (let i = 0; i < 1000; i++) {
          if (banca < CUSTO) break;
          banca += umTorneio(r3) - CUSTO;
        }
        if (banca < CUSTO) quebrou++;
      }
      L.push(`  ${String(B).padStart(5)}            ${(quebrou / tent * 100).toFixed(1)}%`);
    }
    console.log("\n" + L.join("\n") + "\n");
  }, 1_800_000);
});
