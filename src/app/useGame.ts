// Hook React que embrulha o GameController e cuida do tempo dos bots.
import { useEffect, useReducer, useRef } from "react";
import { GameController, type GameOptions } from "./gameController";
import type { Action } from "../game/engine";

export function useGame(opts?: GameOptions) {
  const ref = useRef<GameController | null>(null);
  if (!ref.current) ref.current = new GameController(opts);
  const g = ref.current;
  const [, force] = useReducer((x) => x + 1, 0);

  // Enquanto for a vez de um bot, agenda UM passo com atraso (para assistir).
  useEffect(() => {
    if (g.phase === "playing" && !g.table.handOver && !g.isHeroTurn()) {
      const id = setTimeout(() => {
        g.botStep();
        force();
      }, 650);
      return () => clearTimeout(id);
    }
  });

  return {
    controller: g,
    heroAct: (a: Action) => {
      g.heroAct(a);
      force();
    },
    newHand: () => {
      g.newHand();
      force();
    },
  };
}
