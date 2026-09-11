// ---------------------------------------------------------------------------
// O teste que dá dente ao contrato.
//
// Ele NÃO testa texto. Ele percorre o registro de famílias e, para cada campo
// obrigatório, remove esse campo e exige que a frase deixe de ser permitida.
// Assim, uma frase nova só passa se declarar do que depende — e uma frase
// antiga não pode perder sua pré-condição sem o build reclamar.
// ---------------------------------------------------------------------------
import { describe, it, expect } from "vitest";
import { CONTRATO_DICAS, contratoDe, temDadoPara, type FamiliaDica } from "./coachContract";
import { buildCoachV2PostHandDecision } from "../ui/coachV2PostHand";
import type { FeedbackItem } from "./analyzer";

/** Fonte com todos os campos exigidos por uma família, preenchidos. */
function fonteCompleta(familia: FamiliaDica): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const campo of contratoDe(familia).exige) {
    out[campo] =
      campo === "blockers" ? [{ kind: "aceBlocker", label: "A♠" }]
      : campo === "outs" ? { outs: 9, chance: 0.19 }
      : campo === "adviceFam" ? "fold"
      : campo === "origem" ? "preco"
      : 0.5;
  }
  return out;
}

describe("contrato de dados das dicas", () => {
  it("toda família declara pelo menos um campo obrigatório e uma promessa", () => {
    expect(CONTRATO_DICAS.length).toBeGreaterThan(0);
    for (const c of CONTRATO_DICAS) {
      expect(c.exige.length, `${c.familia} sem campo obrigatório`).toBeGreaterThan(0);
      expect(c.promessa.length, `${c.familia} sem promessa escrita`).toBeGreaterThan(40);
    }
  });

  it("não existe família duplicada", () => {
    const nomes = CONTRATO_DICAS.map((c) => c.familia);
    expect(new Set(nomes).size).toBe(nomes.length);
  });

  it.each(CONTRATO_DICAS.map((c) => c.familia))(
    "%s: com todos os campos, a frase é permitida",
    (familia) => {
      expect(temDadoPara(familia, fonteCompleta(familia))).toBe(true);
    },
  );

  // O coração do contrato: tirar QUALQUER campo obrigatório mata a frase.
  it.each(
    CONTRATO_DICAS.flatMap((c) => c.exige.map((campo) => [c.familia, campo] as const)),
  )("%s: sem %s, a frase NÃO nasce", (familia, campo) => {
    const fonte = fonteCompleta(familia);
    delete fonte[campo];
    expect(temDadoPara(familia, fonte)).toBe(false);

    // undefined explícito conta igual a ausente (é o que o motor devolve).
    expect(temDadoPara(familia, { ...fonteCompleta(familia), [campo]: undefined })).toBe(false);
  });

  it("lista vazia não sustenta frase (bloqueador nenhum não é bloqueador)", () => {
    expect(temDadoPara("blocker", { blockers: [] })).toBe(false);
  });

  it("número inválido conta como ausente", () => {
    expect(temDadoPara("equityPreco", { equity: NaN })).toBe(false);
  });

  it("fonte inexistente não permite nada", () => {
    for (const c of CONTRATO_DICAS) {
      expect(temDadoPara(c.familia, null)).toBe(false);
      expect(temDadoPara(c.familia, undefined)).toBe(false);
    }
  });

  it("família sem contrato explode em vez de passar batido", () => {
    expect(() => contratoDe("inventada" as FamiliaDica)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// A ponte: as frases REAIS do pós-mão respeitam o contrato.
// ---------------------------------------------------------------------------
describe("as frases do pós-mão obedecem ao contrato", () => {
  const base: FeedbackItem = {
    street: "Flop",
    heroAction: "Call",
    advice: "Fold",
    rating: "ruim",
    text: "motivo",
    kind: "postflop",
    adviceFam: "fold",
    equity: 0.22,
    potOdds: 0.33,
    villainRangePct: 0.26,
    breakEvenCallBB: 2.1,
    outs: { outs: 9, chance: 0.19 },
  };

  it("com tudo presente, as quatro camadas aparecem", () => {
    const v = buildCoachV2PostHandDecision(base, "simple");
    expect(v.leitura).toBeDefined();
    expect(v.conta).toBeDefined();
    expect(v.oQueMudaria).toBeDefined();
    expect(v.cartasSalvadoras).toBeDefined();
  });

  it.each([
    ["villainRangePct", "leitura"],
    ["equity", "conta"],
    ["breakEvenCallBB", "oQueMudaria"],
    ["outs", "cartasSalvadoras"],
  ] as const)("sem %s, a camada %s some", (campo, camada) => {
    const v = buildCoachV2PostHandDecision({ ...base, [campo]: undefined }, "simple");
    expect(v[camada]).toBeUndefined();
  });
});
