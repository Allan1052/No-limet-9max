// Página de teste isolada do ImportReplayer (só desenvolvimento).
import React from "react";
import { createRoot } from "react-dom/client";
import "../src/ui/theme.css";
import { I18nProvider } from "../src/i18n";
import { ImportReplayer } from "../src/ui/ImportReplayer";

localStorage.setItem("poker-sim-lang", "pt");

// Encoding real: (rank-2)*4+suit; suit 0=♣ 1=♦ 2=♥ 3=♠
const Qh = (12 - 2) * 4 + 2; // 42
const Qd = (12 - 2) * 4 + 1; // 41
const Ah = (14 - 2) * 4 + 2; // 50
const Ad = (14 - 2) * 4 + 1; // 49
const Kc = (13 - 2) * 4 + 0;
const NineH = (9 - 2) * 4 + 2;
const Ac = (14 - 2) * 4 + 0;
const FiveH = (5 - 2) * 4 + 2;
const EightH = (8 - 2) * 4 + 2;
const SixC = (6 - 2) * 4 + 0;
const ThreeD = (3 - 2) * 4 + 1;
const FiveD = (5 - 2) * 4 + 1;
const ThreeC = (3 - 2) * 4 + 0;

const HANDS = [
  {
    handId: "1",
    site: "ps",
    table: "Mesa Teste",
    bb: 50,
    date: new Date().toISOString(),
    sb: 25,
    ante: 0,
    maxSeats: 9,
    buttonSeat: 4,
    heroName: "Allan1052",
    seats: [
      { seat: 1, name: "UTG", stack: 5000, position: "UTG", isHero: false, isButton: false },
      { seat: 2, name: "MP", stack: 4800, position: "MP", isHero: false, isButton: false },
      { seat: 3, name: "CO", stack: 3200, position: "CO", isHero: false, isButton: false },
      { seat: 4, name: "VILAO", stack: 2600, position: "BTN", isHero: false, isButton: true },
      { seat: 5, name: "SB", stack: 4900, position: "SB", isHero: false, isButton: false },
      { seat: 6, name: "BB", stack: 4700, position: "BB", isHero: false, isButton: false },
      { seat: 7, name: "Allan1052", stack: 5000, position: "HJ", isHero: true, isButton: false },
    ],
    heroCards: [Qh, Qd],
    board: [Kc, NineH, Ac, FiveH, Qd],
    actions: [
      { street: "preflop", player: "SB", type: "sb", amount: 25, allIn: false },
      { street: "preflop", player: "BB", type: "bb", amount: 50, allIn: false },
      { street: "preflop", player: "UTG", type: "fold", amount: 0, allIn: false },
      { street: "preflop", player: "MP", type: "fold", amount: 0, allIn: false },
      { street: "preflop", player: "CO", type: "fold", amount: 0, allIn: false },
      { street: "preflop", player: "VILAO", type: "raise", amount: 125, allIn: false },
      { street: "preflop", player: "SB", type: "fold", amount: 0, allIn: false },
      { street: "preflop", player: "BB", type: "fold", amount: 0, allIn: false },
      { street: "preflop", player: "Allan1052", type: "call", amount: 125, allIn: false },
      { street: "flop", player: "BB", type: "flop", amount: 0, allIn: false },
      { street: "flop", player: "VILAO", type: "bet", amount: 200, allIn: false },
      { street: "flop", player: "Allan1052", type: "call", amount: 200, allIn: false },
      { street: "turn", player: "BB", type: "turn", amount: 0, allIn: false },
      { street: "turn", player: "VILAO", type: "check", amount: 0, allIn: false },
      { street: "turn", player: "Allan1052", type: "bet", amount: 400, allIn: false },
      { street: "turn", player: "VILAO", type: "call", amount: 400, allIn: false },
      { street: "river", player: "BB", type: "river", amount: 0, allIn: false },
      { street: "river", player: "VILAO", type: "check", amount: 0, allIn: false },
      { street: "river", player: "Allan1052", type: "bet", amount: 900, allIn: false },
      { street: "river", player: "VILAO", type: "call", amount: 900, allIn: false },
      { street: "showdown", player: "VILAO", type: "showdown", amount: 0, allIn: false },
    ],
    pot: 2850,
    winner: "Allan1052",
  } as never,
  {
    handId: "2",
    site: "ps",
    table: "Mesa Teste",
    bb: 50,
    date: new Date().toISOString(),
    sb: 25,
    ante: 0,
    maxSeats: 9,
    buttonSeat: 4,
    heroName: "Allan1052",
    seats: [
      { seat: 1, name: "UTG", stack: 4950, position: "UTG", isHero: false, isButton: false },
      { seat: 2, name: "MP", stack: 4700, position: "MP", isHero: false, isButton: false },
      { seat: 3, name: "CO", stack: 3000, position: "CO", isHero: false, isButton: false },
      { seat: 4, name: "BTN", stack: 2400, position: "BTN", isHero: false, isButton: true },
      { seat: 5, name: "SB", stack: 4800, position: "SB", isHero: false, isButton: false },
      { seat: 6, name: "BB", stack: 4600, position: "BB", isHero: false, isButton: false },
      { seat: 7, name: "Allan1052", stack: 6925, position: "HJ", isHero: true, isButton: false },
    ],
    heroCards: [Ah, Ad],
    board: [EightH, SixC, ThreeD, FiveD, ThreeC],
    actions: [
      { street: "preflop", player: "SB", type: "sb", amount: 25, allIn: false },
      { street: "preflop", player: "BB", type: "bb", amount: 50, allIn: false },
      { street: "preflop", player: "UTG", type: "raise", amount: 125, allIn: false },
      { street: "preflop", player: "MP", type: "fold", amount: 0, allIn: false },
      { street: "preflop", player: "CO", type: "fold", amount: 0, allIn: false },
      { street: "preflop", player: "BTN", type: "fold", amount: 0, allIn: false },
      { street: "preflop", player: "Allan1052", type: "call", amount: 125, allIn: false },
      { street: "preflop", player: "SB", type: "fold", amount: 0, allIn: false },
      { street: "preflop", player: "BB", type: "fold", amount: 0, allIn: false },
      { street: "flop", player: "BB", type: "flop", amount: 0, allIn: false },
      { street: "flop", player: "UTG", type: "bet", amount: 150, allIn: false },
      { street: "flop", player: "Allan1052", type: "raise", amount: 450, allIn: false },
      { street: "flop", player: "UTG", type: "fold", amount: 0, allIn: false },
    ],
    pot: 1225,
    winner: "Allan1052",
  } as never,
];

const REPORTS = [
  {
    handId: "1",
    heroCardsText: "Qh Qd",
    effectiveBB: 100,
    situation: "BTN raise, call no HJ",
    heroActionLabel: "Call",
    vpip: true,
    pfr: false,
    feedback: {
      street: "flop",
      heroAction: "Call 4bb",
      advice: "Call",
      rating: "boa",
      text: "Par de damas contra raise de BTN: call no flop foi a linha certa. Boa leitura.",
    },
  } as never,
  {
    handId: "2",
    heroCardsText: "Ah Ad",
    effectiveBB: 138,
    situation: "UTG raise, call no HJ",
    heroActionLabel: "Raise",
    vpip: true,
    pfr: true,
    feedback: {
      street: "flop",
      heroAction: "Raise",
      advice: "Raise",
      rating: "boa",
      text: "Par de ases valorizado com raise no flop. Excelente.",
    },
  } as never,
];

const el = document.getElementById("root");
if (!el) throw new Error("root não encontrado");
const root = createRoot(el);
root.render(
  React.createElement(I18nProvider, null, React.createElement(ImportReplayer, {
    hands: HANDS,
    reports: REPORTS,
    onBack: () => {},
  })),
);
(window as unknown as { __IR_READY: boolean }).__IR_READY = true;
