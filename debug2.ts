// board=11s1 6s1 4s3 → ranks 11(J),6,4 com suits 1,1,3. flopHearts(suit 1): J(diamond),6(diamond).
// drawSuit = 1 (♦). candidatos: 2♦..K♦ menos 4♦ e J♦ (dead) → 11 candidatos, ok.
// hand=[18,2]: card 18 = (18)/4 → rank 6+2=8? Vamos decodificar: card = (rank-2)*4+suit → 18 = (5)*4+... 5*4=20, então 18=(4*4)+2 → rank 6, suit 2 (♥). card 2 = (2-2)... rank 2 suit 2 (2♥).
// Então herói pegou 6♥ e 2♥, mas draw suit é ♦! Por quê? candidates usa card(rank, drawSuit) — deveria ser 6♦. 18 = (6-2)*4 + 2 = 18 → rank 6, suit 2 (♥). drawSuit=1, deveria dar 21.
// Ah, candidates: para rank 6, card(6,1)= (4)*4+1=17. hand deu 18=6♥. Isso significa que candidates tinha 6♥?? Não — pick(candidates) pegou 18.
// CONCLUSÃO: o bug é que card(rank, drawSuit) quando undefined... pick(undefined candidates)?
// Vamos reproduzir a lógica direto:
import { cardFromString, rankOf, suitOf } from "./src/engine/cards";

const board = ["Jd", "6d", "4s"].map(cardFromString);
const dead = new Set(board);
const drawSuit = suitOf(board[0]); // 1
function card(rank: number, suit: number): number | undefined {
  const c = ((rank - 2) * 4 + suit) as number;
  return dead.has(c as any) ? undefined : c;
}
const candidates = [];
for (let rank = 2; rank <= 14; rank++) {
  const c = card(rank, drawSuit);
  if (c !== undefined) candidates.push(c);
}
console.log("drawSuit:", drawSuit, "candidates:", candidates.length, candidates.slice(0, 12));
// 6♦ está em candidates? card(6,1) = (4)*4+1 = 17. dead: Jd=(9*4)+1=37, 6d=17, 4s=(2*4)+3=11.
// Ah! 6d=17 está dead → candidates não tem 6♦. Restam 10 cartas ♦. 2 cartas ♦ → ok? 10>=2, ok.
// Então por que o teste falhou com hand=[18,2]=6♥2♥? Porque `take(pick(candidates.filter(c=>!dead.has(c))))` — candidates já exclui dead. Mas espere: hand=[18,2]: 18=6♥, 2=2♥, suit 2. drawSuit=1. candidates são ♦ (suit 1)... 18=(5*4)+2?? (6-2)=4, 4*4=16, 16+2=18. suit 2. Hmm.
// O seed 0 usa mulberry32(13). A 1ª chamada do mulberry32: s=(13+0x6d2b79f5)|0 = 1831411742; t=... dá um valor fixo.
// Se candidates.length=10, idx = floor(rng*10). Se rng retornou, digamos, 0.62 → idx=6 → candidates[6].
// candidates = todos ♦ exceto J♦,6♦,4? (4 é s) → candidatos♦: 2♦(7)... lista.
// hand 18 e 2 NÃO são ♦ (suit 2 = ♥). Então pick pegou de candidates... 18 não está em candidates (♦: 7,8,9,10,12,13,14,15,16,17-? ). candidates♦ = 2♦=7,3♦=11? não 11=(3*4)+... espere 2♦=(0*4)+1=1, 3♦=5, 5♦=13, 7♦=21, 8♦=25, 9♦=29, T♦=33, Q♦=41, K♦=45, A♦=49.
// Então candidates = [1,5,13,21,25,29,33,41,45,49]. 18 não está. Como hand=[18,2] aconteceu?
// PORQUE o generateHandForSpot flush_draw pega do candidates MAS se take undefined (candidates vazio após filter)... se pick(vazio) → arr[floor(rng*0)] = arr[NaN] = undefined → não adiciona! Então a 1ª carta pode não entrar se candidates.filter vazio. Mas 1ª vez candidates=10. 2ª vez: dead inclui 1ª carta; candidates.filter não vazio (9). hand deveria ter 2 ♦.
// MISTÉRIO. Reproduzir com a função real:
import { POSTFLOP_DRILL_SPOTS, generatePostflopDrillHand } from "./src/train/drillPostflop";

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const spot = POSTFLOP_DRILL_SPOTS[0];
const rng = mulberry32(13);
const h = generatePostflopDrillHand(spot, rng);
console.log("board:", h.board.map((c) => `${rankOf(c)}s${suitOf(c)}`).join(" "));
console.log("hand:", h.hand.map((c) => `${rankOf(c)}s${suitOf(c)}`).join(" "));
