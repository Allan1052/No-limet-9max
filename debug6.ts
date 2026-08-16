import { POSTFLOP_DRILL_SPOTS } from "./src/train/drillPostflop";
import { rankOf, suitOf, cardFromString } from "./src/engine/cards";
import { equityHandVsRange } from "./src/engine/equity";
import { buildTopRange } from "./src/ranges/build";
import { rangeCombos } from "./src/ranges/types";

// Reimplementar a sessão com log para achar o ponto da falha
const spot = POSTFLOP_DRILL_SPOTS.find((s) => s.id === "overpair")!;
const rng = Math.random;
const boards = [...spot.boards].sort(() => 0.5 - Math.random());
const ordered = boards; // simplificado
const usedHandKeys = new Set<string>();
const usedPairRanks = new Set<string>();
let dupes = 0;
for (let i = 0; i < 30; i++) {
  // importar generateHandForSpot não é exportado; verificar se mão final aceita é OK
}
// Em vez disso: testar a função exported diretamente com intercept?
// Melhor: verificar se generateHandForSpot às vezes retorna mão <2 cartas
// e se handFromSpot sobrescreve... ele NÃO sobrescreve (res.hand = hand).
// Então a repetição precisa vir de handKey ou da aceitação.
// TESTE: rodar a lógica da sessão com console para 30 mãos.
import { createPostflopDrillSession } from "./src/train/drillPostflop";
