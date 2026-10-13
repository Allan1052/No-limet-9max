// Execução sob demanda: A FAIXA NORMAL DE UMA SESSÃO, por tamanho.
// Mesmo modelo de dois parâmetros do _ruinaRun (ancorado em ITM 23,5% e ROI
// 3,84% medidos, escada de prêmio real do motor, campo 279, rake 10,29%).
//   CF_REGUA=1 npx vitest run src/sim/_sessaoRun.test.ts
import { describe, it } from "vitest";
import { payoutLadder, prizePool, paidPlaces } from "../tournament/structure";

// Duas réguas, porque são dois mundos:
//   REAL   = PokerStars, com rake de 10,29% e ROI líquido de 3,84%;
//   APP    = sem rake nenhum (prizePool = buyIn × inscritos), mesma habilidade,
//            o que equivale ao ROI BRUTO medido de 14,54%.
// O veredito da sessão tem de usar a régua do mundo em que a sessão aconteceu.
const CAMPO = 279, ITM = 0.235;
const SEM_RAKE = process.env.CF_SEM_RAKE === "1";
const RAKE = SEM_RAKE ? 0 : 0.1029;
const CUSTO = 1 + RAKE;
const ROI_REAL = SEM_RAKE ? 0.1454 : 0.0384;
const ladder = payoutLadder(CAMPO, prizePool(1, CAMPO));
const PAGOS = paidPlaces(CAMPO);

function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function mediaComBeta(beta: number): number {
  let soma = 0; const P = 20_000;
  for (let i = 0; i < P; i++) {
    const u = (i + 0.5) / P;
    const lugar = Math.max(1, Math.min(PAGOS, Math.ceil(PAGOS * Math.pow(u, 1 / beta))));
    soma += ladder[lugar - 1];
  }
  return ITM * (soma / P);
}
const ALVO = CUSTO * (1 + ROI_REAL);
let lo = 0.05, hi = 60;
for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (mediaComBeta(m) > ALVO) lo = m; else hi = m; }
const BETA = (lo + hi) / 2;

function umTorneio(r: () => number): number {
  if (r() >= ITM) return 0;
  const lugar = Math.max(1, Math.min(PAGOS, Math.ceil(PAGOS * Math.pow(r(), 1 / BETA))));
  return ladder[lugar - 1];
}

describe("faixa normal de uma sessão", () => {
  it("mede percentis por tamanho de sessão", () => {
    const L: string[] = [];
    L.push(`${SEM_RAKE ? "APP (sem rake, ROI bruto 14,54%)" : "REAL (rake 10,29%, ROI 3,84%)"}  beta=${BETA.toFixed(3)}`);
    L.push("torn   p10     p25    mediana   p75     p90   vermelho%  melhor-caso%");
    const r = rng(20261013);
    for (const N of [5, 10, 15, 20, 30, 40, 60, 100]) {
      const AMOSTRAS = 200_000;
      const res: number[] = new Array(AMOSTRAS);
      let neg = 0, grande = 0;
      for (let a = 0; a < AMOSTRAS; a++) {
        let s = 0;
        for (let i = 0; i < N; i++) s += umTorneio(r) - CUSTO;
        res[a] = s;
        if (s < 0) neg++;
        if (s >= N * 2) grande++; // "dia que valeu" = +2 buy-ins por torneio
      }
      res.sort((a, b) => a - b);
      const q = (p: number) => res[Math.floor(p * AMOSTRAS)];
      L.push([
        String(N).padStart(4),
        q(0.10).toFixed(1).padStart(7),
        q(0.25).toFixed(1).padStart(7),
        q(0.50).toFixed(1).padStart(8),
        q(0.75).toFixed(1).padStart(8),
        q(0.90).toFixed(1).padStart(7),
        `${(neg / AMOSTRAS * 100).toFixed(1)}%`.padStart(10),
        `${(grande / AMOSTRAS * 100).toFixed(1)}%`.padStart(13),
      ].join(""));
    }
    console.log("\n" + L.join("\n") + "\n");
  }, 1_800_000);
});
