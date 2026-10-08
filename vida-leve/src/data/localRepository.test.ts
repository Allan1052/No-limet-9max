import { beforeEach, describe, expect, it } from "vitest";
import type { ProfileInput } from "../lib/types";
import { LocalRepository } from "./localRepository";

// localStorage mínimo para rodar no Node.
const mem = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
} as Storage;

const ana: ProfileInput = {
  nome: "Ana",
  idade: 30,
  sexo: "feminino",
  altura_cm: 165,
  peso_inicial: 70,
  nivel_atividade: "leve",
  transporte: "onibus",
  horas_sentado: 8,
  sobe_escadas: false,
  pratica_atividade: false,
  gestante_lactante: false,
  condicao_saude: false,
};

describe("LocalRepository — recálculo a cada check-in", () => {
  let repo: LocalRepository;
  beforeEach(() => {
    mem.clear();
    repo = new LocalRepository();
  });

  it("cadastro já grava as metas no perfil", async () => {
    const p = await repo.saveProfile(ana);
    expect(p).toMatchObject({ peso_atual: 70, tmb: 1420, meta_agua_ml: 2450, meta_proteina_g: 126, calorias_meta: 1503 });
  });

  it("novo peso recalcula TMB, água, proteína e calorias e salva no perfil", async () => {
    await repo.saveProfile(ana);
    const p = await repo.addWeightLog(68, "2026-10-08");
    expect(p).toMatchObject({ peso_atual: 68, tmb: 1400, meta_agua_ml: 2380, meta_proteina_g: 122 });
    expect(await repo.getProfile()).toEqual(p); // persistido
  });

  it("o registro de data mais recente é o peso atual, mesmo inserido fora de ordem", async () => {
    await repo.saveProfile(ana);
    await repo.addWeightLog(67, "2026-10-08");
    const p = await repo.addWeightLog(69, "2026-10-01");
    expect(p.peso_atual).toBe(67);
    expect((await repo.listWeightLogs()).map((w) => w.peso_kg)).toEqual([69, 67]);
  });

  it("apagar o último registro volta o plano para o peso anterior", async () => {
    await repo.saveProfile(ana);
    await repo.addWeightLog(69, "2026-10-01");
    await repo.addWeightLog(67, "2026-10-08");
    const ultimo = (await repo.listWeightLogs()).at(-1)!;
    const p = await repo.deleteWeightLog(ultimo.id);
    expect(p.peso_atual).toBe(69);
    const semNada = await repo.deleteWeightLog((await repo.listWeightLogs())[0]!.id);
    expect(semNada.peso_atual).toBe(70);
  });

  it("editar o perfil não perde o peso atual do check-in", async () => {
    await repo.saveProfile(ana);
    await repo.addWeightLog(66, "2026-10-08");
    const p = await repo.saveProfile({ ...ana, nivel_atividade: "moderado" });
    expect(p.peso_atual).toBe(66);
  });

  it("peso absurdo é rejeitado e nada é gravado", async () => {
    await repo.saveProfile(ana);
    await expect(repo.addWeightLog(5, "2026-10-08")).rejects.toThrow();
    expect(await repo.listWeightLogs()).toHaveLength(0);
  });

  it("ajuste adaptativo entra nas calorias e é persistido", async () => {
    const antes = await repo.saveProfile(ana);
    const p = await repo.setAjuste(-100, "2026-10-08");
    expect(p.calorias_meta).toBe(antes.calorias_meta - 100);
    expect(p).toMatchObject({ ajuste_kcal: -100, ultimo_ajuste_em: "2026-10-08" });
    expect((await repo.addWeightLog(69, "2026-10-09")).ajuste_kcal).toBe(-100);
  });

  it("gestante: plano em manutenção (sem déficit)", async () => {
    const p = await repo.saveProfile({ ...ana, gestante_lactante: true });
    expect(p.calorias_meta).toBe(1953); // = gasto total
  });

  it("água: lista do dia e totais por dia", async () => {
    await repo.saveProfile(ana);
    const a = await repo.addWater(250, "2026-10-08");
    await repo.addWater(250, "2026-10-08");
    await repo.addWater(500, "2026-10-07");
    await repo.deleteWater(a.id);
    expect(await repo.listWaterLogs("2026-10-08")).toHaveLength(1);
    expect(await repo.listWaterTotals("2026-10-01")).toEqual([
      { data: "2026-10-07", total: 500 },
      { data: "2026-10-08", total: 250 },
    ]);
  });

  it("missões do dia: regravar mantém as concluídas", async () => {
    await repo.saveProfile(ana);
    const m = (id: string) => ({ missao_id: id, nivel: 1, tipo: "movimento" as const, descricao_habito: id });
    const [a] = await repo.setDayHabits("2026-10-08", [m("a"), m("b")]);
    await repo.setHabitDone(a!.id, true);
    const novas = await repo.setDayHabits("2026-10-08", [m("a"), m("c")]);
    expect(novas.map((h) => [h.missao_id, h.concluido_hoje])).toEqual([
      ["a", true],
      ["c", false],
    ]);
    await repo.setDayHabits("2026-10-09", [m("x")]);
    expect(await repo.listHabits("2026-10-09")).toHaveLength(1);
    expect(await repo.listHabits("2026-10-01")).toHaveLength(3);
  });

  it("comida: totais de proteína e calorias por dia", async () => {
    await repo.saveProfile(ana);
    await repo.addFood({ nome: "Ovo", proteina_g: 7, calorias: 73 }, "2026-10-08");
    const f = await repo.addFood({ nome: "Frango", proteina_g: 32, calorias: 159 }, "2026-10-08");
    expect(await repo.listFoodTotals("2026-10-01")).toEqual([{ data: "2026-10-08", proteina_g: 39, calorias: 232 }]);
    await repo.deleteFood(f.id);
    expect(await repo.listFood("2026-10-08")).toHaveLength(1);
  });

  it("medidas e exportação/apagar tudo", async () => {
    await repo.saveProfile(ana);
    await repo.addMeasurement({ data: "2026-10-08", cintura_cm: 88, quadril_cm: 102 });
    expect(await repo.listMeasurements()).toHaveLength(1);
    const exp = await repo.exportAll();
    expect(exp).toHaveProperty("measurements");
    await repo.deleteAll();
    expect(await repo.getProfile()).toBeNull();
  });
});
