// A MESA QUE TE CONHECE JOGA DIFERENTE? — régua sob demanda.
//   CF_REGUA=1 npx vitest run src/sim/_memoriaRun.test.ts
//
// Comparar sessão a sessão não funciona: com poucos torneios por sessão o ruído
// engole a tendência (medido em 15/09 — mesa final oscilou 25/75/100/50/75/25).
// A pergunta certa é mais direta: as MESMAS mãos, jogadas contra uma mesa que
// não te conhece e contra uma que já tem 600 mãos suas no arquivo.
import { beforeEach, describe, it, vi } from "vitest";
import { medirPressao, taxas } from "./pressaoDoCampo";
import { gravar, memoriaVazia } from "../bots/memoriaDaMesa";
import { dossieVazio } from "../bots/leituraDoHeroi";

const TORNEIOS = Number(process.env.CF_TORNEIOS || 14);
const BUYIN = Number(process.env.CF_BUYIN || 10300);

let store: Record<string, string> = {};
beforeEach(() => {
  store = {};
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  });
});

/** O dossiê de um jogador apertado e que larga muito flop — o alvo clássico. */
function memoriaCheia() {
  gravar({
    ...memoriaVazia(),
    dossie: {
      ...dossieVazio(),
      maos: 600, vpip: 0.14, pfr: 0.11, threeBet: 0.02,
      flopsComAposta: 180, flopsLargados: 142,
      passouEEnfrentou: 90, checkRaisesDele: 2,
    },
    sessoes: 12,
  });
}

describe("a mesa que te conhece", () => {
  it(`joga ${TORNEIOS} torneios no $${BUYIN} sem e com arquivo sobre o jogador`, () => {
    const linha = (rot: string) => {
      const r = medirPressao({ buyIn: BUYIN, torneios: TORNEIOS, semente: 77123, maxPassos: 40_000 });
      const x = taxas(r);
      console.log(
        [
          rot.padEnd(22),
          String(r.maos).padStart(5),
          `${x.tresBetContraAbertura}%`.padStart(9),
          `${x.cbetContraEle}%`.padStart(8),
          `${x.cartaDeGracaPct}%`.padStart(9),
          `${x.spotsApertadosPct}%`.padStart(10),
          `${x.mesaFinalPct}%`.padStart(5),
          `${x.itmPct}%`.padStart(5),
          String(x.posicaoMedia).padStart(7),
          `  (${r.vitorias} título, ${r.podios} pódio)`,
        ].join(" "),
      );
    };
    console.log(`\n=== $${BUYIN} · ${TORNEIOS} torneios, MESMAS sementes ===`);
    console.log("cenário                 mãos 3betOpen cbetVsEle  degraca% apertados%   MF%  ITM%  posMed");
    linha("mesa NÃO te conhece");
    memoriaCheia();
    linha("mesa TE CONHECE");
    console.log("");
  }, 3_600_000);
});
