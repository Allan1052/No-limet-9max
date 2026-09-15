// ---------------------------------------------------------------------------
// "ELE TE LEU" — a leitura só fala quando tem base, e nunca vira invenção.
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import { lerOHeroi, dossieVazio, anotar, type DossieDoHeroi } from "./leituraDoHeroi";
import { profileById, adjustProfileForBuyIn } from "./profiles";

const reg = profileById("tag");
const peixe = profileById("station");

const base = (over: Partial<DossieDoHeroi> = {}): DossieDoHeroi => ({
  ...dossieVazio(), maos: 60, vpip: 0.22, pfr: 0.17, threeBet: 0.06, ...over,
});

describe("a leitura que o bot faz do jogador", () => {
  it("peixe não lê ninguém", () => {
    expect(lerOHeroi(peixe, base({ flopsComAposta: 20, flopsLargados: 19 }), "Paga-Tudo")).toBeNull();
  });

  it("sem amostra, ninguém fala", () => {
    expect(lerOHeroi(reg, base({ maos: 10, flopsComAposta: 20, flopsLargados: 19 }), "O Certinho")).toBeNull();
    // Mãos suficientes, mas poucos flops medidos: a leitura de flop não sai.
    const r = lerOHeroi(reg, base({ flopsComAposta: 4, flopsLargados: 4 }), "O Certinho");
    expect(r?.id).not.toBe("folda-flop");
  });

  it("larga flop demais: a leitura mais lucrativa da mesa", () => {
    const r = lerOHeroi(reg, base({ flopsComAposta: 20, flopsLargados: 16 }), "Furacão");
    expect(r?.id).toBe("folda-flop");
    expect(r?.texto).toContain("Furacão");
    expect(r?.texto).toContain("80%");
    expect(r?.consequencia).toMatch(/apostar mais/i);
  });

  it("nunca aumenta depois de passar", () => {
    const r = lerOHeroi(reg, base({ passouEEnfrentou: 12, checkRaisesDele: 0 }), "Metódico");
    expect(r?.id).toBe("nunca-check-raise");
  });

  it("apertado demais vira alvo de roubo", () => {
    const r = lerOHeroi(reg, base({ vpip: 0.13, pfr: 0.11 }), "Muralha");
    expect(r?.id).toBe("muito-apertado");
    expect(r?.texto).toContain("13%");
  });

  it("solto e passivo: ele para de blefar", () => {
    const r = lerOHeroi(reg, base({ vpip: 0.42, pfr: 0.11 }), "Livro Aberto");
    expect(r?.id).toBe("solto-passivo");
    expect(r?.consequencia).toMatch(/parar de blefar/i);
  });

  it("jogador equilibrado não recebe leitura (não há o que explorar)", () => {
    const r = lerOHeroi(reg, base({
      vpip: 0.24, pfr: 0.19, threeBet: 0.07,
      flopsComAposta: 20, flopsLargados: 9,
      passouEEnfrentou: 12, checkRaisesDele: 2,
    }), "O Certinho");
    expect(r).toBeNull();
  });

  it("o dossiê soma certo", () => {
    let d = dossieVazio();
    d = anotar(d, { tipo: "flopComAposta", largou: true });
    d = anotar(d, { tipo: "flopComAposta", largou: false });
    d = anotar(d, { tipo: "passouEEnfrentou", aumentou: true });
    expect(d.flopsComAposta).toBe(2);
    expect(d.flopsLargados).toBe(1);
    expect(d.passouEEnfrentou).toBe(1);
    expect(d.checkRaisesDele).toBe(1);
  });

  it("no campo do 10,3K até o perfil mais simples ganha cabeça para ler", () => {
    const abcElite = adjustProfileForBuyIn(profileById("abc"), 10300);
    const r = lerOHeroi(abcElite, base({ flopsComAposta: 20, flopsLargados: 16 }), "O Cartilha");
    expect(r).not.toBeNull();
  });
});
