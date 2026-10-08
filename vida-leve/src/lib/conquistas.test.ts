import { describe, expect, it } from "vitest";
import {
  calcularConquistas,
  diaAnterior,
  diasAguaOk,
  diasMissoesOk,
  melhorSequencia,
  sequenciaAtual,
  type DadosConquistas,
} from "./conquistas";
import type { Profile, RoutineHabit } from "./types";

const dias = (...ds: string[]) => new Set(ds);

describe("sequências", () => {
  it("dia anterior atravessa mês e ano", () => {
    expect(diaAnterior("2026-03-01")).toBe("2026-02-28");
    expect(diaAnterior("2027-01-01")).toBe("2026-12-31");
  });

  it("conta até hoje quando hoje já foi cumprido", () => {
    expect(sequenciaAtual(dias("2026-10-06", "2026-10-07", "2026-10-08"), "2026-10-08")).toBe(3);
  });

  it("não quebra se hoje ainda não foi cumprido (conta até ontem)", () => {
    expect(sequenciaAtual(dias("2026-10-06", "2026-10-07"), "2026-10-08")).toBe(2);
  });

  it("quebra quando falhou ontem", () => {
    expect(sequenciaAtual(dias("2026-10-05", "2026-10-06"), "2026-10-08")).toBe(0);
  });

  it("melhor sequência da história", () => {
    expect(melhorSequencia(dias("2026-09-01", "2026-09-02", "2026-09-03", "2026-09-10", "2026-09-11"))).toBe(3);
    expect(melhorSequencia(new Set())).toBe(0);
  });
});

describe("dias cumpridos", () => {
  it("água: total ≥ meta", () => {
    expect([...diasAguaOk([{ data: "a", total: 2000 }, { data: "b", total: 3000 }], 2500)]).toEqual(["b"]);
  });

  it("missões: pelo menos 3 feitas", () => {
    const h = (data: string, feito: boolean, i: number): RoutineHabit => ({
      id: `${data}${i}`,
      user_id: "u",
      data,
      missao_id: `m${i}`,
      nivel: 1,
      descricao_habito: "",
      tipo: "movimento",
      concluido_hoje: feito,
    });
    const hist = [h("d1", true, 1), h("d1", true, 2), h("d1", true, 3), h("d1", false, 4), h("d2", true, 1), h("d2", true, 2), h("d2", false, 3)];
    expect([...diasMissoesOk(hist)]).toEqual(["d1"]);
  });
});

describe("conquistas", () => {
  const profile = { peso_inicial: 100, peso_atual: 96, meta_agua_ml: 3000, meta_proteina_g: 170 } as Profile;
  const base: DadosConquistas = { profile, pesos: [], agua: [], missoes: [], comida: [] };
  const ids = (d: DadosConquistas) => calcularConquistas(d, "2026-10-08").filter((c) => c.desbloqueada).map((c) => c.id);

  it("perder 4 kg de 100 desbloqueia 1 kg e 3 kg, mas não 5%", () => {
    const ok = ids(base);
    expect(ok).toContain("kg_1");
    expect(ok).toContain("kg_3");
    expect(ok).not.toContain("pct_5");
  });

  it("3 dias de água desbloqueia 'Hidratado'", () => {
    const agua = ["2026-10-06", "2026-10-07", "2026-10-08"].map((data) => ({ data, total: 3000 }));
    expect(ids({ ...base, agua })).toContain("agua_3");
    expect(ids({ ...base, agua })).not.toContain("agua_7");
  });

  it("mostra progresso das bloqueadas", () => {
    const c = calcularConquistas(base, "2026-10-08").find((x) => x.id === "pct_5")!;
    expect(c.progresso).toBe("4,0/5%");
  });
});
