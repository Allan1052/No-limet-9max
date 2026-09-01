// ---------------------------------------------------------------------------
// "O QUE MUDA ESTA DECISÃO?" — varredura de UMA variável por vez.
//
// Decorar "call ou fold" não gruda. Ver POR QUE a resposta vira — "a 15bb é
// all-in, a 25bb é fold; vs UTG folda, vs BTN jama; no início paga, na mesa
// final solta" — ensina o raciocínio que serve pra qualquer mão nova.
//
// É CONSERVADOR: não cria decisão nova. Só re-roda o MESMO analyzeHand mudando
// uma variável e agrupa as faixas onde a ação é constante. A verdade continua
// sendo a do motor.
// ---------------------------------------------------------------------------
import { analyzeHand, STAGE_LABEL, SITUATION_LABEL, type HandLabSpec, type StageKey } from "./stage";
import { POSITIONS, type Position } from "../ranges/types";

export interface SweepBand {
  /** Rótulo da faixa (ex.: "8–15bb", "vs UTG", "Bolha"). */
  label: string;
  /** Ação recomendada nesta faixa (fold/call/raise/allin). */
  action: string;
  /** É a faixa onde o spot ATUAL cai? (o "você está aqui"). */
  current: boolean;
}

export interface DecisionSweep {
  key: "stack" | "stage" | "opener";
  /** Título curto pra UI. */
  title: string;
  bands: SweepBand[];
}

const STACK_LO = 6;
const STACK_HI = 60;
const STAGES_ORDER: StageKey[] = ["inicio", "meio", "bolha", "mesa_final"];

function actLabel(a: string): string {
  return a === "allin" ? "ALL-IN" : a.toUpperCase();
}

/** Varre o stack efetivo e agrupa faixas de ação constante. */
function stackSweep(spec: HandLabSpec): DecisionSweep {
  const rows: { bb: number; action: string }[] = [];
  for (let bb = STACK_LO; bb <= STACK_HI; bb++) {
    rows.push({ bb, action: analyzeHand({ ...spec, stackBB: bb }).recommended });
  }
  const cur = Math.round(spec.stackBB);
  const bands: SweepBand[] = [];
  let start = 0;
  for (let i = 1; i <= rows.length; i++) {
    if (i === rows.length || rows[i].action !== rows[start].action) {
      const lo = rows[start].bb;
      const hi = rows[i - 1].bb;
      const label =
        lo === STACK_LO ? `até ${hi}bb` : hi === STACK_HI ? `${lo}bb+` : lo === hi ? `${lo}bb` : `${lo}–${hi}bb`;
      bands.push({ label, action: actLabel(rows[start].action), current: cur >= lo && cur <= hi });
      start = i;
    }
  }
  return { key: "stack", title: "Se o seu stack fosse…", bands };
}

/** Varre a fase do torneio (mostra o efeito do ICM). */
function stageSweep(spec: HandLabSpec): DecisionSweep {
  const bands: SweepBand[] = STAGES_ORDER.map((stage) => ({
    label: STAGE_LABEL[stage].split(" ·")[0],
    action: actLabel(analyzeHand({ ...spec, stage }).recommended),
    current: spec.stage === stage,
  }));
  return { key: "stage", title: "Se a fase do torneio fosse…", bands };
}

/** Varre a posição de QUEM ABRIU/DEU ALL-IN (só quando há um vilão agindo antes). */
function openerSweep(spec: HandLabSpec): DecisionSweep {
  // Posições possíveis pro vilão que age antes do herói (todas menos o próprio herói).
  const villains = POSITIONS.filter((p) => p !== spec.heroPosition) as Position[];
  const bands: SweepBand[] = villains.map((villainPosition) => ({
    label: `vs ${villainPosition}`,
    action: actLabel(analyzeHand({ ...spec, villainPosition }).recommended),
    current: spec.villainPosition === villainPosition,
  }));
  return { key: "opener", title: "Se quem agiu antes fosse…", bands };
}

/**
 * Devolve as varreduras RELEVANTES pro spot. Stack sempre; fase quando o ICM
 * pesa ou o spot enfrenta ação; quem abriu só quando há vilão agindo antes
 * (vsopen/vs3bet/vsallin). Cada varredura tem ≥2 ações distintas pra valer a
 * pena mostrar (se a resposta nunca muda, a gente não polui a tela).
 */
export function decisionSweeps(spec: HandLabSpec): DecisionSweep[] {
  const out: DecisionSweep[] = [];
  const facing = spec.situation !== "open";

  out.push(stackSweep(spec));
  out.push(stageSweep(spec));
  if (facing) out.push(openerSweep(spec));

  // Só mantém a varredura se a resposta REALMENTE muda em algum ponto — senão
  // não ensina nada ("mudar isso não muda a decisão" a gente diz à parte).
  return out.filter((s) => new Set(s.bands.map((b) => b.action)).size >= 2);
}

/** Texto honesto quando NENHUMA variável muda a decisão (spot "sólido"). */
export function sweepIsFlat(spec: HandLabSpec): boolean {
  return decisionSweeps(spec).length === 0;
}

export { SITUATION_LABEL };
