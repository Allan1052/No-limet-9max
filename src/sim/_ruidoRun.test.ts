// Quanto de RUÍDO tem cada medição? CF_REGUA=1 npx vitest run src/sim/_ruidoRun.test.ts
import { describe, it } from "vitest";
import { profileById } from "../bots/profiles";
import { contraOBaseline, ganhoPareado } from "./arena";

const MAOS = Number(process.env.CF_MAOS || 250);
const SEMENTES = Number(process.env.CF_SEM || 8);

function desvio(v: number[]): { media: number; dp: number } {
  const m = v.reduce((s, x) => s + x, 0) / v.length;
  const dp = Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, v.length - 1));
  return { media: Math.round(m * 10) / 10, dp: Math.round(dp * 10) / 10 };
}

describe("ruído da medição", () => {
  it("compara bb/100 solto com bb/100 pareado (duplicate)", () => {
    const tag = profileById("tag");
    const solto: number[] = [];
    const pareado: number[] = [];
    for (let i = 0; i < SEMENTES; i++) {
      solto.push(contraOBaseline(tag, MAOS, 1000 + i * 977));
      pareado.push(ganhoPareado(tag, MAOS, 1000 + i * 977));
    }
    const s = desvio(solto);
    const p = desvio(pareado);
    console.log(`\n${MAOS} mãos · ${SEMENTES} sementes · perfil TAG`);
    console.log(`  bb/100 SOLTO    média ${s.media}  desvio ${s.dp}`);
    console.log(`  bb/100 PAREADO  média ${p.media}  desvio ${p.dp}`);
    console.log(`  corte de ruído: ${s.dp > 0 ? Math.round((1 - p.dp / s.dp) * 100) : 0}%\n`);
  }, 1_800_000);
});
