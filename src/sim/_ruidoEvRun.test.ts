// O EV deixado na mesa é um sinal LIMPO? CF_REGUA=1 npx vitest run src/sim/_ruidoEvRun.test.ts
import { describe, it } from "vitest";
import { profileById } from "../bots/profiles";
import { medirEvPerdido } from "./evDeixadoNaMesa";

const MAOS = Number(process.env.CF_MAOS || 150);
const SEM = Number(process.env.CF_SEM || 6);

function dp(v: number[]) {
  const m = v.reduce((s, x) => s + x, 0) / v.length;
  const d = Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, v.length - 1));
  return { media: Math.round(m * 10) / 10, dp: Math.round(d * 100) / 100 };
}

describe("ruído do EV deixado na mesa", () => {
  it("mede o mesmo perfil várias vezes e vê o quanto o número balança", () => {
    for (const id of ["station", "tag", "lag"]) {
      const p = profileById(id);
      const vals: number[] = [];
      let decisoes = 0;
      for (let i = 0; i < SEM; i++) {
        const r = medirEvPerdido(p, MAOS, 2000 + i * 613, 10300, 140);
        vals.push(r.evPor100);
        decisoes += r.decisoes;
      }
      const s = dp(vals);
      console.log(
        `${id.padEnd(10)} EV perdido/100 = ${s.media}  ±${s.dp}   ` +
        `(${Math.round(decisoes / SEM)} decisões por medida)`,
      );
    }
  }, 1_800_000);
});
