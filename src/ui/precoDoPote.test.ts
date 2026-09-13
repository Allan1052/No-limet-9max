// ---------------------------------------------------------------------------
// O PREÇO DO POTE — a única coisa que sobreviveu de um prompt de fora.
//
// O prompt trazia a conta certa (toCall ÷ (pote + toCall)) e a conclusão
// errada: "a 11,5 para 1, paga com qualquer duas cartas". Estes testes travam a
// conta E o antídoto: em pote multiway a frase tem de dizer contra quantos a
// chance precisa valer, porque é isso que derruba a conclusão.
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import { construirCamadas, type FonteCamadas } from "./coachCamadas";

const simples = (f: FonteCamadas) => construirCamadas(f, "simple", "aoVivo").precoDoPote;
const tecnico = (f: FonteCamadas) => construirCamadas(f, "technical", "aoVivo").precoDoPote;

describe("preço do pote", () => {
  it("faz a conta do jeito certo: 1bb num pote de 11,5bb pede 8%", () => {
    expect(simples({ potBB: 11.5, toCallBB: 1 })).toContain("8%");
  });

  it("2 para 1 pede 33%; 4,5 para 1 pede 18%", () => {
    expect(simples({ potBB: 2, toCallBB: 1 })).toContain("33%");
    expect(simples({ potBB: 4.5, toCallBB: 1 })).toContain("18%");
  });

  it("sem nada a pagar não existe preço", () => {
    expect(simples({ potBB: 10, toCallBB: 0 })).toBeUndefined();
    expect(simples({ potBB: 10 })).toBeUndefined();
    expect(simples({ toCallBB: 2 })).toBeUndefined();
  });

  it("EM POTE MULTIWAY AVISA CONTRA QUANTOS — é o antídoto do erro", () => {
    const f = simples({ potBB: 11.5, toCallBB: 1, oponentes: 5 })!;
    expect(f).toContain("5 oponentes");
    expect(f).toContain("não contra um");
  });

  it("heads-up não carrega o aviso (não haveria o que avisar)", () => {
    expect(simples({ potBB: 6, toCallBB: 2, oponentes: 1 })).not.toContain("oponentes");
  });

  it("NÃO recomenda nada — é aritmética, não veredito", () => {
    const f = simples({ potBB: 11.5, toCallBB: 1, oponentes: 5 })!;
    for (const palavra of ["pague", "paga com", "call", "folda", "qualquer duas", "vale a pena"]) {
      expect(f.toLowerCase(), `a frase virou recomendação: "${f}"`).not.toContain(palavra);
    }
  });

  it("no modo técnico fala a língua do jogador de números", () => {
    expect(tecnico({ potBB: 11.5, toCallBB: 1 })).toContain("pot odds");
  });

  it("existe MESMO SEM equity — é o caso do pré-flop, onde 'A conta' não nasce", () => {
    const v = construirCamadas({ potBB: 5.5, toCallBB: 1 }, "simple", "aoVivo");
    expect(v.conta).toBeUndefined();      // o motor não estima equity no pré-flop
    expect(v.precoDoPote).toBeDefined();  // mas o preço é fato
  });
});
