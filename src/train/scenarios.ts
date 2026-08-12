// ---------------------------------------------------------------------------
// Módulos de Maestria: cenários de TREINO guiado de pré-flop.
//
// Cada módulo foca uma habilidade (defender o BB, roubar do botão, push/fold,
// ICM de mesa final). Geramos um spot aleatório dentro dos parâmetros do módulo,
// perguntamos ao MOTOR (linha de base) qual é a estratégia correta e avaliamos a
// escolha do usuário com o mesmo `gradeDecision` do jogo — nota por frequência.
//
// Tudo é puro e testável; a UI só apresenta o cenário e coleta a resposta.
// ---------------------------------------------------------------------------

import { fullDeck, shuffle, type Card } from "../engine/cards";
import { BASELINE_PROFILE } from "../bots/profiles";
import { preflopDecision, type PreflopContext } from "../ranges/preflop";
import { gradeDecision, type FeedbackItem, type HeroAdvice } from "../feedback/analyzer";
import type { IcmSpot } from "../ranges/icm";
import type { Position } from "../ranges/types";

export interface TrainModule {
  id: string;
  icon: string;
  titleKey: string;
  descKey: string;
  gen: (rng: () => number) => ScenarioSpec;
}

export interface ScenarioSpec {
  heroPosition: Position;
  effectiveBB: number;
  raiserPosition?: Position;
  openSizeBB?: number;
  icmSpot?: IcmSpot;
  variant?: "holdem" | "omaha" | "sng3";
}

export interface TrainAction {
  key: "fold" | "call" | "raise" | "allin";
  labelKey: string;
}

export interface Scenario {
  spec: ScenarioSpec;
  hand: Card[];
  advice: HeroAdvice;
  actions: TrainAction[];
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Duas cartas aleatórias distintas. */
export function randomHand(rng: () => number, variant: "holdem" | "omaha" | "sng3" = "holdem"): Card[] {
  const d = shuffle(fullDeck(), rng);
  return variant === "omaha" ? [d[0], d[1], d[2], d[3]] : [d[0], d[1]];
}

export const MODULES: TrainModule[] = [
  {
    id: "bb_defense",
    icon: "🛡️",
    titleKey: "train.bb_defense.title",
    descKey: "train.bb_defense.desc",
    gen: (rng) => ({
      heroPosition: "BB",
      effectiveBB: 40,
      raiserPosition: pick<Position>(["MP", "HJ", "CO", "BTN"], rng),
      openSizeBB: 2.3,
      variant: "holdem", // Default para Hold'em
    }),
  },
  {
    id: "btn_steal",
    icon: "🎯",
    titleKey: "train.btn_steal.title",
    descKey: "train.btn_steal.desc",
    gen: (rng) => ({
      heroPosition: "BTN",
      effectiveBB: pick([15, 25, 50], rng),
      variant: "holdem", // Default para Hold'em
    }),
  },
  {
    id: "push_fold",
    icon: "🚀",
    titleKey: "train.push_fold.title",
    descKey: "train.push_fold.desc",
    gen: (rng) => ({
      heroPosition: pick<Position>(["MP", "HJ", "CO", "BTN", "SB"], rng),
      effectiveBB: 7 + Math.floor(rng() * 5), // 7–11bb (zona de push/fold)
      variant: "holdem", // Default para Hold'em
    }),
  },
  {
    id: "final_icm",
    icon: "👑",
    titleKey: "train.final_icm.title",
    descKey: "train.final_icm.desc",
    gen: (rng) => {
      const heroBB = 14 + Math.floor(rng() * 8); // 14–21bb
      // Mesa final de 5: um chip leader, o herói médio-curto, e curtos prestes
      // a cair — o clássico spot onde o ICM manda apertar.
      const stacks = [60, 45, heroBB, 6, 4];
      return {
        heroPosition: pick<Position>(["HJ", "CO", "BTN", "SB"], rng),
        effectiveBB: heroBB,
        icmSpot: {
          stacks,
          payouts: [500, 300, 200, 130, 90],
          hero: 2,
          villain: 0,
          chips: Math.min(heroBB, 60),
        } satisfies IcmSpot,
        variant: "holdem", // Default para Hold'em
      };
    },
  },
];

export function moduleById(id: string): TrainModule {
  return MODULES.find((m) => m.id === id) ?? MODULES[0];
}

/** Ações disponíveis para o usuário, conforme o spot. */
function actionsFor(spec: ScenarioSpec): TrainAction[] {
  const pushFold = spec.effectiveBB <= 12;
  if (spec.raiserPosition) {
    if (pushFold) {
      return [
        { key: "fold", labelKey: "ctrl.fold" },
        { key: "allin", labelKey: "train.allin" },
      ];
    }
    return [
      { key: "fold", labelKey: "ctrl.fold" },
      { key: "call", labelKey: "ctrl.call" },
      { key: "raise", labelKey: "train.threebet" },
    ];
  }
  if (pushFold) {
    return [
      { key: "fold", labelKey: "ctrl.fold" },
      { key: "allin", labelKey: "train.allin" },
    ];
  }
  return [
    { key: "fold", labelKey: "ctrl.fold" },
    { key: "raise", labelKey: "ctrl.raise" },
  ];
}

/** Monta um cenário a partir de um spec já definido (usado no treino 1×1 Ultra). */
export function buildScenarioFromSpec(spec: ScenarioSpec, rng: () => number): Scenario {
  const hand = randomHand(rng, spec.variant);
  const ctx: PreflopContext = {
    heroPosition: spec.heroPosition,
    hand,
    effectiveBB: spec.effectiveBB,
    profile: BASELINE_PROFILE,
    raiserPosition: spec.raiserPosition,
    openSizeBB: spec.openSizeBB,
    icmSpot: spec.icmSpot,
    variant: spec.variant || "holdem",
  };
  const d = preflopDecision(ctx);
  const advice: HeroAdvice = { kind: "preflop", action: d.action, reason: d.reason, mix: d.mix, effectiveBB: spec.effectiveBB };
  return { spec, hand, advice, actions: actionsFor(spec) };
}

/** Monta um cenário completo: sorteia a mão e calcula a estratégia correta. */
export function buildScenario(module: TrainModule, rng: () => number, variant: "holdem" | "omaha" | "sng3" = "holdem"): Scenario {
  const spec = module.gen(rng);
  spec.variant = variant;
  return buildScenarioFromSpec(spec, rng);
}

/** Avalia a escolha do usuário (mesma lógica de nota do jogo). */
export function evaluateChoice(scenario: Scenario, choice: TrainAction["key"]): FeedbackItem {
  return gradeDecision("Pré-flop", 'free', choice, scenario.advice);
}

/** Acerto = a decisão está no leque aceitável (nota boa ou ok). */
export function isCorrect(item: FeedbackItem): boolean {
  return item.rating === "boa" || item.rating === "ok";
}
