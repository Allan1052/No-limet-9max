import { describe, expect, it } from "vitest";
import type { HandHistory, ReplayEvent } from "../app/replay";
import { PROFILES } from "./profiles";
import { vilaoPrincipalDaMao } from "./vilaoPrincipal";

const A = PROFILES[0].name;
const B = PROFILES[1].name;

function ev(name: string, actionType: string, isHero = false): ReplayEvent {
  return { street: "Pré-flop", seat: 1, name, isHero, actionLabel: actionType, actionType, board: [], pot: 3 };
}

function mao(events: ReplayEvent[]): HandHistory {
  return { events, holeCards: {}, names: {}, heroSeat: 0, finalBoard: [], buttonSeat: 0, bigBlind: 100 };
}

describe("quem foi o vilão desta mão", () => {
  it("é o último vilão que continuou (não foldou)", () => {
    const v = vilaoPrincipalDaMao(mao([
      ev("Você", "raise", true),
      ev(A, "call"),
      ev(B, "fold"),
      ev("Você", "bet", true),
      ev(A, "call"),
    ]));
    expect(v?.nome).toBe(A);
  });

  it("quem foldou não conta, mesmo tendo agido por último", () => {
    const v = vilaoPrincipalDaMao(mao([
      ev("Você", "raise", true),
      ev(A, "call"),
      ev(B, "fold"),
    ]));
    expect(v?.nome).toBe(A);
  });

  it("se todos foldaram, não houve vilão — e não há frase", () => {
    expect(vilaoPrincipalDaMao(mao([ev("Você", "raise", true), ev(A, "fold"), ev(B, "fold")]))).toBeUndefined();
  });

  it("o herói nunca é o vilão da própria mão", () => {
    expect(vilaoPrincipalDaMao(mao([ev("Você", "raise", true), ev("Você", "bet", true)]))).toBeUndefined();
  });

  it("MÃO IMPORTADA: oponente humano não tem perfil, então não há conselho", () => {
    // É a trava mais importante deste módulo. Contra gente de verdade o app não
    // tem parâmetro nenhum — dizer "ele paga demais" ali seria inventar.
    expect(vilaoPrincipalDaMao(mao([ev("Você", "raise", true), ev("jogador_4321", "call")]))).toBeUndefined();
  });

  it("o perfil devolvido é o perfil REAL do bot (é dele que sai o conselho)", () => {
    const v = vilaoPrincipalDaMao(mao([ev("Você", "raise", true), ev(A, "call")]))!;
    expect(v.profile.name).toBe(A);
    expect(v.profile.targetVpip).toBeGreaterThan(0);
  });

  it("mão vazia ou ausente não devolve nada", () => {
    expect(vilaoPrincipalDaMao(null)).toBeUndefined();
    expect(vilaoPrincipalDaMao(mao([]))).toBeUndefined();
  });
});
