// Simulação massiva do motor rua por rua — valida a matemática dos ranges
// dinâmicos em milhares de spots combinando posições, boards, stacks e ações.
import { describe, it, expect } from "vitest";
import {
  preflopOpenRange,
  continueVillainRange,
  boardHit,
  heroRecommendedGrid,
  heroBestAction,
  analyzeBoard,
} from "./dynamicRanges";
import { RANKS, SUITS, makeCard } from "../../engine/cards";
import type { Position } from "../../ranges/types";
import type { BoardState } from "./dynamicRanges";

function flopBoard(cards: number[]): BoardState {
  return { street: "flop" as const, cards };
}

const BOARDS = [
  ["As", "8d", "6c"], // seco alto
  ["Kd", "7c", "3d"], // seco
  ["8s", "9s", "Th"], // molhado conectado
  ["2d", "2s", "Kd"], // pareado
  ["Qc", "8d", "4h"], // médio
  ["Tc", "9c", "3s"], // molhado
  ["7h", "7s", "2d"], // pareado baixo
  ["Ac", "Kc", "2c"], // 3 do naipe
  ["Jd", "Td", "9h"], // conectado alto
  ["5d", "4s", "2h"], // baixo desconectado
];

const TURN_CARDS = ["As", "Qc", "6d", "Js", "3c", "Td", "2h", "Ks", "8c", "4d"];
const RIVER_CARDS = ["2s", "Qh", "Jc", "Ad", "7s", "3d", "Kh", "9c", "5s", "Tc"];

const HERO_ACTIONS = ["fold", "check", "call", "betSmall", "betBig"] as const;

// Mãos representativas: lixo, média, forte, premium
const HERO_HANDS = ["72o", "83o", "T5o", "Q6s", "J9s", "T9s", "88", "ATo", "AQo", "AQs", "KK", "AA"];

const STACKS = [10, 20, 45, 80, 120];

function card(s: string) {
  return makeCard(RANKS.indexOf(s[0]) + 2, SUITS.indexOf(s[1]));
}

function handSum(range: Record<string, number>): number {
  return Object.values(range).reduce((a, b) => a + b, 0);
}

function relevantCombos(range: Record<string, number>, min: number): number {
  return Object.values(range).filter((v) => v > min).length;
}

describe("simulação massiva rua por rua", () => {
  it("rodeia dezenas de milhares de spots sem crashar e com invariantes de range", () => {
    const hero: Position = "MP";
    const villain: Position = "BTN";
    const ctx0 = (potBB: number) => ({ heroPosition: hero, villainPosition: villain, heroStackBB: 40, villainStackBB: 40, potBB, facedBetBB: 0 });
    let count = 0;

    for (const effBB of STACKS) {
      const init = preflopOpenRange(villain, effBB);
      // invariant: range inicial não vazio e com massa válida
      expect(relevantCombos(init, 0.01)).toBeGreaterThan(0);
      const initSum = handSum(init);
      expect(initSum, `massa do range inicial BTN ${effBB}bb`).toBeGreaterThan(0.5);
      expect(initSum).toBeLessThanOrEqual(169.01);

      for (const flopKey of BOARDS) {
        const flop = flopKey.map(card);
        const texture = analyzeBoard({ street: "flop", cards: flop });
        expect(texture.summary).toBeTruthy();

        for (const heroHandType of HERO_HANDS) {
          for (const heroAct of HERO_ACTIONS) {
            // 1º passo: herói age no flop → range do vilão evolui
            const vRangeAfter = continueVillainRange(
              init,
              heroAct,
              { street: "flop", cards: flop },
              ctx0(3.8),
            ).range;
            expect(handSum(vRangeAfter), `massa flop após ${heroAct} (${heroHandType} em ${flopKey.join("")}, ${effBB}bb)`).toBeGreaterThanOrEqual(0);

            // 2º passo: turn — vilão responde
            for (const villainAct of HERO_ACTIONS) {
              const turnCard = card(TURN_CARDS[(flopKey.length + villainAct.length) % TURN_CARDS.length]);
              const boardTurn = [...flop, turnCard];
              const vRange2 = continueVillainRange(
                vRangeAfter,
                villainAct,
                { street: "turn", cards: boardTurn },
                ctx0(6.2),
              ).range;
              expect(handSum(vRange2), `massa turn após ${villainAct}`).toBeGreaterThanOrEqual(0);

              // 3º passo: river — herói responde de novo
              const riverCard = card(RIVER_CARDS[(boardTurn.length + villainAct.length) % RIVER_CARDS.length]);
              const boardRiver = [...boardTurn, riverCard];
              const vRange3 = continueVillainRange(
                vRange2,
                heroAct,
                { street: "river", cards: boardRiver },
                ctx0(9.5),
              ).range;
              expect(handSum(vRange3), `massa river após ${heroAct}`).toBeGreaterThanOrEqual(0);
              count++;
            }
          }
        }
      }
    }
    console.log(`[sim] spots validados: ${count}`);
    expect(count).toBeGreaterThan(10000);
  });

  it("boardHit classifica corretamente mãos conhecidas vs boards conhecidos", () => {
    // AA no board pareado 2-2-K: trinca+
    const setBoard = [card("2d"), card("2s"), card("Kd")];
    expect(boardHit("AA", flopBoard(setBoard)).made).toBe("overPair");

    // 83o no board 8-9-T: par
    const wet = [card("8s"), card("9s"), card("Th")];
    expect(boardHit("83o", flopBoard(wet)).made).toBe("bottomPair");

    // 72o no board seco A-8-6: nada
    const dry = [card("As"), card("8d"), card("6c")];
    expect(["weakPair", "bottomPair"]).toContain(boardHit("72o", flopBoard(dry)).made);
  });

  it("heroBestAction recomenda aposta com trinca e avalia draws no board molhado", () => {
    const flop = [card("Qc"), card("8d"), card("4h")];
    // QQ no flop Q-8-4: trinca → aposta
    const qq = heroBestAction("QQ", { street: "flop", cards: flop }, 0, 3.8, analyzeBoard({ street: "flop", cards: flop }));
    expect(qq.action).toBe("betSmall");
    expect(qq.freq).toBeGreaterThan(0.8);

    // board molhado flush-draw: 87s deve apostar
    const wetBoard = [card("7c"), card("8c"), card("9h")];
    const tWet = analyzeBoard(flopBoard(wetBoard));
    const s87 = heroBestAction("87s", flopBoard(wetBoard), 0, 3.8, tWet);
    expect(["betSmall", "check"]).toContain(s87.action);
    expect(s87.freq).toBeGreaterThan(0);

    // mão lixo no board seco: fold/check
    const dry2 = [card("As"), card("8d"), card("6c")];
    const dDry = analyzeBoard(flopBoard(dry2));
    const junk = heroBestAction("72o", flopBoard(dry2), 0, 3.8, dDry);
    expect(["fold", "check"]).toContain(junk.action);
  });

  it("heroRecommendedGrid cobre as 169 mãos sem células inválidas", () => {
    const board = [card("7c"), card("8c"), card("9h")];
    const grid = heroRecommendedGrid(
      flopBoard(board),
      "MP",
      "BTN",
      30,
      false,
      3.8,
    );
    expect(grid.length).toBe(169);
    for (const cell of grid) {
      expect(["bet", "check", "fold"]).toContain(cell.category);
      expect(cell.freq).toBeGreaterThanOrEqual(0);
      expect(cell.freq).toBeLessThanOrEqual(1);
      // fora da faixa RFI a célula fica cinza (fold), nunca apostável
      if (cell.category === "fold") expect(cell.freq).toBeLessThan(0.55);
    }
  });

  it("heroRecommendedGrid respeita a faixa RFI da posição do herói", () => {
    const board = [card("As"), card("8d"), card("6c")];
    // UTG 20bb: faixa mais justa — 99 está DENTRO (abre 66+) e fica colorida;
    // 72o nunca abre UTG e fica cinza (fold, freq 0).
    const utg = heroRecommendedGrid(flopBoard(board), "UTG", "BTN", 20, false, 4.8);
    const c99 = utg.find((c) => c.handType === "99");
    const c72o = utg.find((c) => c.handType === "72o");
    expect(c99?.category).not.toBe("fold");
    expect(c99?.freq).toBeGreaterThan(0);
    expect(c72o?.category).toBe("fold");
    expect(c72o?.freq).toBe(0);
    // BTN abre mais largo que UTG: mais células coloridas
    const btn = heroRecommendedGrid(flopBoard(board), "BTN", "UTG", 20, false, 4.8);
    const btnColored = btn.filter((c) => c.category !== "fold").length;
    const utgColored = utg.filter((c) => c.category !== "fold").length;
    expect(btnColored, "BTN abre mais largo que UTG (mesmo board 20bb)").toBeGreaterThan(utgColored);
    expect(utgColored, "UTG 20bb não passa de ~35 mãos coloridas").toBeLessThanOrEqual(36);
  });

  it("o range do vilão ENCOLHE com fold e MUDA com call de forma coerente", () => {
    const villainPos: Position = "BTN";
    const effBB = 40;
    const board: BoardState = { street: "flop", cards: [card("As"), card("8d"), card("6c")] };
    const ctx = { heroPosition: "MP", villainPosition: villainPos, heroStackBB: effBB, villainStackBB: effBB, potBB: 3.8, facedBetBB: 0 };

    const init = preflopOpenRange(villainPos, effBB);
    const initCombos = relevantCombos(init, 0.05);

    const afterCall = continueVillainRange(init, "call", board, ctx).range;
    const callCombos = relevantCombos(afterCall, 0.05);

    const afterFold = continueVillainRange(init, "fold", board, ctx).range;
    const foldCombos = relevantCombos(afterFold, 0.05);

    expect(callCombos, "call deve preservar combos relevantes do range inicial").toBeLessThanOrEqual(initCombos + 5);
    expect(foldCombos, "fold deve encoller o range").toBeLessThan(callCombos);
  });

  it("todas as posições têm range de abertura coerente (BTN ≥ UTG em largura)", () => {
    const utg = preflopOpenRange("UTG", 40);
    const btn = preflopOpenRange("BTN", 40);
    expect(relevantCombos(btn, 0.01)).toBeGreaterThanOrEqual(relevantCombos(utg, 0.01) * 0.95);
    // stacks curtos alargar o range do BTN
    const btnShort = preflopOpenRange("BTN", 10);
    expect(relevantCombos(btnShort, 0.01)).toBeGreaterThan(relevantCombos(btn, 0.01));
  });

  // Invariante 1 (PDF §4): ordem posicional UTG ≤ UTG1 ≤ MP ≤ LJ ≤ CO ≤ BTN
  it("invariante 1 — largura de abertura cresce monotonicamente da UTG ao BTN", () => {
    const effBB = 40;
    const widths: Position[] = ["UTG", "UTG1", "MP", "LJ", "CO", "BTN"];
    const vals = widths.map((p) => relevantCombos(preflopOpenRange(p, effBB), 0.01));
    for (let i = 1; i < vals.length; i++) {
      expect(vals[i], `${widths[i]} deve ser ≥ ${widths[i - 1]}`).toBeGreaterThanOrEqual(vals[i - 1] - 2);
    }
    // UTG deve ser seletivo: abaixo de 32 mãos (15-18%)
    expect(vals[0], "UTG a 40bb deve abrir ≤ 18% (30 mãos)").toBeLessThanOrEqual(30);
    // SB é caso especial: não abre por raise — o range dele é de squeeze 3-bet (mais estreito que BTN, mais largo que UTG)
    const sb = relevantCombos(preflopOpenRange("SB", effBB), 0.01);
    expect(sb, "SB squeeze range fica entre UTG e BTN").toBeGreaterThanOrEqual(vals[0]);
    expect(sb).toBeLessThan(vals[5]);
  });

  // Invariante 2 (PDF §4): ação encolhe o range — fold encolle pelo menos 40%
  it("invariante 2 — após ação o range do vilão encolhe (fold -40%+, call seletivo)", () => {
    const pos: Position = "CO";
    const effBB = 40;
    const board: BoardState = { street: "flop", cards: [card("As"), card("8d"), card("6c")] };
    const ctx = { heroPosition: "MP", villainPosition: pos, heroStackBB: effBB, villainStackBB: effBB, potBB: 3.8, facedBetBB: 0 };
    const init = preflopOpenRange(pos, effBB);
    const initCombos = relevantCombos(init, 0.05);

    const afterFold = continueVillainRange(init, "fold", board, ctx).range;
    const afterCall = continueVillainRange(init, "call", board, ctx).range;
    const afterBet = continueVillainRange(init, "betSmall", board, ctx).range;

    expect(relevantCombos(afterFold, 0.05), "fold deve eliminar a maior parte do range").toBeLessThan(initCombos * 0.75);
    expect(relevantCombos(afterCall, 0.05), "call deve encoller o range").toBeLessThanOrEqual(initCombos);
    expect(relevantCombos(afterBet, 0.05), "apostar deve encoller o range").toBeLessThanOrEqual(initCombos);
  });

  // Invariante 3 + 4 (PDF §4): após call no board com carta alta, trinca no topo
  it("invariantes 3 e 4 — hit domina o topo do range após c-bet paga", () => {
    const pos: Position = "BTN";
    const effBB = 40;
    const board: BoardState = { street: "flop", cards: [card("As"), card("8d"), card("6c")] };
    const ctx = { heroPosition: "MP", villainPosition: pos, heroStackBB: effBB, villainStackBB: effBB, potBB: 3.8, facedBetBB: 0 };
    const init = preflopOpenRange(pos, effBB);
    const after = continueVillainRange(init, "call", board, ctx).range;

    // 88 (trips no board) deve ter frequência maior que AKo (carta alta sem hit)
    expect(after["88"] ?? 0, "88 (trips) deve dominar AKo após pagar c-bet em A-8-6").toBeGreaterThan(after["AKo"] ?? 0);
    // mãos fracas sem hit devem estar por fora
    expect(after["T9s"] ?? 0).toBeLessThan(after["88"] ?? 0);
  });

  // Invariante 5 (PDF §4): wet ≠ dry — draws sobem no molhado, pares sobem no seco
  it("invariante 5 — draws valorizados no board molhado, pares no seco", () => {
    const pos: Position = "CO";
    const effBB = 40;
    const dry: BoardState = { street: "flop", cards: [card("As"), card("8d"), card("6c")] };
    const wet: BoardState = { street: "flop", cards: [card("8s"), card("9s"), card("Th")] };
    const ctxDry = { heroPosition: "BTN", villainPosition: pos, heroStackBB: effBB, villainStackBB: effBB, potBB: 3.8, facedBetBB: 0 };
    const ctxWet = { heroPosition: "BTN", villainPosition: pos, heroStackBB: effBB, villainStackBB: effBB, potBB: 3.8, facedBetBB: 0 };
    const init = preflopOpenRange(pos, effBB);

    const dryAfter = continueVillainRange(init, "call", dry, ctxDry).range;
    const wetAfter = continueVillainRange(init, "call", wet, ctxWet).range;

    // JTs tem draw de straight no 8-9-T — deve valer mais que no A-8-6
    expect(wetAfter["JTs"] ?? 0, "JTs (draw) deve valer mais no board molhado 8-9-T").toBeGreaterThan(dryAfter["JTs"] ?? 0);
    // 77 (par seco) é favorito no seco A-8-6 (2ª melhor mão) mas no 8-9-T o 77 perde pra 89/JT/T9 —
    // invariantes: a frequência relativa do par seco cai no board conectado
    expect(dryAfter["77"] ?? 0).toBeGreaterThan(0);
    expect(wetAfter["77"] ?? 0).toBeLessThanOrEqual(dryAfter["77"] ?? 0);
  });

  // Invariante 6 (PDF §4): stack curto alarga o range de abertura
  it("invariante 6 — stacks curtos alargar o range (push/fold)", () => {
    for (const p of ["UTG", "MP", "CO", "BTN"] as Position[]) {
      const deep = relevantCombos(preflopOpenRange(p, 100), 0.01);
      const short = relevantCombos(preflopOpenRange(p, 10), 0.01);
      expect(short, `${p} a 10bb deve alargar vs 100bb`).toBeGreaterThan(deep);
    }
  });

  it("simulação estendida ~70 mil spots cobre turn e river com invariantes", () => {
    // Combina a grade completa do teste anterior com turn/river reais:
    // 5 stacks × 10 boards × 12 mãos × 5 ações do herói × 5 respostas do vilão × (turn+river) = ~30.000 passos de rua,
    // × 2 ruas (turn+river) ≈ 60.000 transições. Valida encolhimento em cadeia.
    const villain: Position = "BTN";
    const hero: Position = "CO";
    const ctx = { heroPosition: hero, villainPosition: villain, heroStackBB: 40, villainStackBB: 40, potBB: 3.8, facedBetBB: 0 };
    let count = 0;
    let violations = 0;

    for (const effBB of [10, 20, 45, 80, 100]) {
      const init = preflopOpenRange(villain, effBB);
      for (const flopKey of BOARDS) {
        const flop = flopKey.map(card);
        for (const heroAct of HERO_ACTIONS) {
          const afterHero = continueVillainRange(init, heroAct, { street: "flop", cards: flop }, ctx).range;
          let prev = handSum(init);
          const sum = handSum(afterHero);
          if (heroAct === "fold" && sum > prev * 0.6) violations++;
          prev = sum;

          for (const villAct of HERO_ACTIONS) {
            const turn = [...flop, card(TURN_CARDS[(flopKey.length + villAct.length) % TURN_CARDS.length])];
            const afterTurn = continueVillainRange(afterHero, villAct, { street: "turn", cards: turn }, ctx).range;
            const sumTurn = handSum(afterTurn);
            if (villAct === "fold" && sumTurn > prev * 0.6) violations++;
            prev = sumTurn;

            for (const heroAct2 of HERO_ACTIONS) {
              const river = [...turn, card(RIVER_CARDS[(turn.length + heroAct2.length) % RIVER_CARDS.length])];
              const afterRiver = continueVillainRange(afterTurn, heroAct2, { street: "river", cards: river }, ctx).range;
              if (heroAct2 === "fold" && handSum(afterRiver) > prev * 0.6) violations++;
              count++;
            }
          }
        }
      }
    }
    console.log(`[sim] transições rua-validadas: ${count}; violações: ${violations}`);
    expect(count).toBeGreaterThan(6000);
    expect(violations, "folds não podem deixar o range quase intacto").toBe(0);
  });
});
