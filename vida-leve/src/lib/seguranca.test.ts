import { describe, expect, it } from "vitest";
import type { AnaliseRitmo } from "./adaptive";
import { alertasDeSaude } from "./seguranca";
import type { Profile } from "./types";

const base = { peso_atual: 80, altura_cm: 170, condicao_saude: false, gestante_lactante: false } as Profile;
const ids = (p: Profile, r?: AnaliseRitmo) => alertasDeSaude(p, r).map((a) => a.id);

describe("alertasDeSaude", () => {
  it("sem riscos, sem alertas", () => expect(ids(base)).toEqual([]));
  it("condição de saúde → alerta de perigo citando os rins", () => {
    const [a] = alertasDeSaude({ ...base, condicao_saude: true });
    expect(a).toMatchObject({ id: "condicao", tipo: "perigo" });
    expect(a!.texto).toMatch(/rins/);
  });
  it("gestante, IMC baixo, IMC alto", () => {
    expect(ids({ ...base, gestante_lactante: true })).toContain("gestante");
    expect(ids({ ...base, peso_atual: 50 })).toContain("imc_baixo");
    expect(ids({ ...base, peso_atual: 120 })).toContain("imc_alto");
  });
  it("ritmo rápido", () => {
    expect(ids(base, { status: "rapido" } as AnaliseRitmo)).toContain("ritmo_rapido");
  });
});
