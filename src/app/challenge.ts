// ---------------------------------------------------------------------------
// "Desafie um amigo": empacota um spot de pré-flop num link curto. Quem abre o
// link vê a mesma mão/posição/stack, responde, e é convidado a jogar — cada
// desafio vira um convite (crescimento viral).
//
// O link carrega só o essencial (mão, posição, stack, ação do vilão); a
// resposta correta é RECALCULADA no aparelho de quem abre, pelo mesmo motor.
// ---------------------------------------------------------------------------

import { cardsFromString, cardsToString, type Card } from "../engine/cards";
import { BASELINE_PROFILE } from "../bots/profiles";
import { preflopDecision, type PreflopContext } from "../ranges/preflop";
import type { Position } from "../ranges/types";
import type { HeroAdvice } from "../feedback/analyzer";
import { MODULES, buildScenario, type Scenario, type ScenarioSpec, type TrainAction } from "../train/scenarios";

interface ChallengePayload {
  c: string; // cartas (ex.: "AsTd")
  p: Position; // posição do herói
  bb: number; // stack efetivo
  r?: Position; // posição de quem abriu (se enfrenta raise)
  s?: number; // tamanho da abertura (bb)
  v?: "holdem" | "omaha" | "sng3"; // variante do jogo
}

function toBase64Url(s: string): string {
  const b64 = btoa(unescape(encodeURIComponent(s)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(b64)));
}

export function encodeChallenge(spec: ScenarioSpec, hand: Card[]): string {
  const payload: ChallengePayload = {
    c: cardsToString(hand),
    p: spec.heroPosition,
    bb: Math.round(spec.effectiveBB),
    r: spec.raiserPosition,
    s: spec.openSizeBB,
    v: spec.variant,
  };
  return toBase64Url(JSON.stringify(payload));
}

/** Lê um código de desafio da URL (?d=...) e remonta o cenário completo. */
export function decodeChallenge(code: string): Scenario | null {
  try {
    const p = JSON.parse(fromBase64Url(code)) as ChallengePayload;
    const hand = cardsFromString(p.c);
    if (hand.length !== 2 || !p.p || !p.bb) return null;
    const spec: ScenarioSpec = {
      heroPosition: p.p,
      effectiveBB: p.bb,
      raiserPosition: p.r,
      openSizeBB: p.s,
      variant: p.v ?? "holdem",
    };
    const ctx: PreflopContext = {
      heroPosition: spec.heroPosition,
      hand,
      effectiveBB: spec.effectiveBB,
      profile: BASELINE_PROFILE,
      raiserPosition: spec.raiserPosition,
      openSizeBB: spec.openSizeBB,
      variant: spec.variant ?? "holdem",
    };
    const d = preflopDecision(ctx);
    const advice: HeroAdvice = { kind: "preflop", action: d.action, reason: d.reason, mix: d.mix, effectiveBB: spec.effectiveBB };
    return { spec, hand, advice, actions: actionsForSpec(spec) };
  } catch {
    return null;
  }
}

/** Ações oferecidas conforme o spot (mesma regra do treino). */
function actionsForSpec(spec: ScenarioSpec): TrainAction[] {
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

/** Monta a URL completa do desafio (com o base-path atual). */
export function challengeUrl(code: string): string {
  const base = location.origin + location.pathname.replace(/[?#].*$/, "");
  return `${base}?d=${code}`;
}

/** Lê o código de desafio da URL atual, se houver. */
export function readChallengeFromUrl(): Scenario | null {
  try {
    const code = new URLSearchParams(location.search).get("d");
    return code ? decodeChallenge(code) : null;
  } catch {
    return null;
  }
}

/** Gera um desafio aleatório (spot de pré-flop sem ICM, para link curto). */
export function makeRandomChallenge(rng: () => number = Math.random): {
  scenario: Scenario;
  code: string;
  url: string;
} {
  const pool = MODULES.filter((m) => m.id !== "final_icm");
  const mod = pool[Math.floor(rng() * pool.length)] ?? MODULES[0];
  const scenario = buildScenario(mod, rng);
  const code = encodeChallenge(scenario.spec, scenario.hand);
  return { scenario, code, url: challengeUrl(code) };
}
