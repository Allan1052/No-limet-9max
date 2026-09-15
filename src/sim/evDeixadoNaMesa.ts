// ---------------------------------------------------------------------------
// EV DEIXADO NA MESA — o sinal que a evolução precisava.
//
// 🐞 15/09/2026. A evolução por FICHAS não fecha a conta, e isto foi medido,
// não suposto:
//
//   • Primeira rodada (350 mãos por disputa): "O Cartilha" saiu de −1 para
//     +149,9 bb/100 em três gerações. Ninguém ganha 150 bb/100 de ninguém —
//     aquilo era sorte sendo premiada como habilidade.
//   • Com duplicate (mesmas cartas nas duas rodadas): o desvio caiu só 10%
//     (58,1 → 52,3 bb/100 em 250 mãos). Cartas iguais não bastam: um all-in a
//     mais muda o resultado inteiro da mão.
//   • Para separar genomas que diferem em ~2 bb/100 com esse desvio seriam
//     necessárias ~2,7 MILHÕES de mãos por candidato, por geração. Inviável.
//
// A saída não é medir mais — é medir OUTRA COISA. Fichas ganhas são o resultado
// de decisão + sorte. Mas o EV de cada decisão é observável direto, sem sorte
// nenhuma: quando há uma aposta na mesa, pagar vale
//
//     equity × (pote + aposta) − aposta
//
// e largar vale zero. Escolher o lado errado tem um preço exato, em bb, que não
// depende de qual carta veio depois.
//
// É a MESMA conta que o app usa para avaliar o Allan (feedback/analyzer.ts).
// Um bot que deixa menos EV na mesa é melhor jogador — e isso converge em
// centenas de decisões, não em milhões de mãos.
// ---------------------------------------------------------------------------

import { seededRng, type Card } from "../engine/cards";
import { createTable, startHand, applyAction, moveButton, freshShuffledDeck } from "../game/engine";
import { legalActions } from "../game/betting";
import { botPreflopAction } from "../bots/preflopBot";
import { botPostflopAction } from "../bots/postflopBot";
import { postflopDecision } from "../bots/decision";
import { postflopContextFor } from "../bots/postflopBot";
import { BASELINE_PROFILE, type BotProfile } from "../bots/profiles";
import { buildFieldSeats } from "../bots/field";

export interface EvResultado {
  decisoes: number;
  /** Soma dos bb de EV jogados fora. */
  evPerdidoBB: number;
  /** bb de EV perdidos a cada 100 decisões — quanto MENOR, melhor o bot. */
  evPor100: number;
  /** Decisões em que ele escolheu o lado certo. */
  acertos: number;
  acertoPct: number;
}

/**
 * Roda mãos e mede quanto EV o `candidato` deixa na mesa.
 *
 * Só conta as decisões de CONTINUAR × LARGAR contra uma aposta: são as que têm
 * EV calculável sem supor o futuro. Apostar e aumentar dependem de como o
 * adversário reage, e entrariam com uma suposição embutida — ficam de fora de
 * propósito, para o sinal continuar limpo.
 */
export function medirEvPerdido(
  candidato: BotProfile,
  maos: number,
  semente: number,
  buyIn?: number,
  equityIterations = 200,
): EvResultado {
  const bb = 50;
  const stack = 120 * bb;
  const rngCartas = seededRng(semente);
  const rng = seededRng(semente * 31 + 7);

  const elenco = buildFieldSeats(buyIn, 8, rng);
  const seats = [
    { name: "candidato", stack, profileId: candidato.id },
    ...elenco.map((x) => ({ name: x.name, stack, profileId: x.profileId })),
  ];
  const t = createTable({ smallBlind: 25, bigBlind: bb }, seats, 0);

  let decisoes = 0;
  let evPerdido = 0;
  let acertos = 0;

  for (let h = 0; h < maos; h++) {
    for (const p of t.players) p.stack = stack;
    const deck: Card[] = freshShuffledDeck(rngCartas);
    startHand(t, deck);

    let guard = 0;
    while (!t.handOver) {
      if (guard++ > 2000) break;
      const seat = t.toAct;
      const ehCandidato = seat === 0;
      const la = legalActions(t);
      const enfrentandoAposta = la.callAmount > 0;

      let evDePagar: number | null = null;
      if (ehCandidato && enfrentandoAposta && t.street !== "preflop") {
        // A equity sai do MESMO motor que o app usa para avaliar o jogador.
        const ctx = postflopContextFor(t, seat, candidato, rng, equityIterations);
        const d = postflopDecision(ctx);
        const pote = t.players.reduce((s, p) => s + p.totalCommitted, 0);
        evDePagar = (d.equity * (pote + la.callAmount) - la.callAmount) / bb;
      }

      const action =
        t.street === "preflop"
          ? botPreflopAction(t, seat, { perfilForcado: ehCandidato ? candidato : undefined, buyIn })
          : botPostflopAction(t, seat, rng, equityIterations, undefined, buyIn, undefined, undefined,
              ehCandidato ? candidato : undefined);

      if (evDePagar !== null) {
        decisoes++;
        const continuou = action.type !== "fold";
        const certo = evDePagar > 0 ? continuou : !continuou;
        if (certo) acertos++;
        else evPerdido += Math.abs(evDePagar);
      }

      applyAction(t, action);
    }
    moveButton(t);
  }

  return {
    decisoes,
    evPerdidoBB: Math.round(evPerdido * 10) / 10,
    evPor100: decisoes > 0 ? Math.round((evPerdido / decisoes) * 1000) / 10 : 0,
    acertos,
    acertoPct: decisoes > 0 ? Math.round((acertos / decisoes) * 1000) / 10 : 0,
  };
}

export { BASELINE_PROFILE };
