// ---------------------------------------------------------------------------
// SELO DE CONFIANÇA POR DECISÃO
//
// A nossa regra nº 1 é honestidade: nada de número inventado nem certeza onde
// só há aproximação. Este módulo torna isso VISÍVEL — cada decisão carrega um
// nível de confiança derivado de sinais REAIS do spot, não de marketing:
//
//   • alta        — território bem estabelecido (shove-or-fold curto, mão clara
//                   em pré-flop coberto pela referência).
//   • media       — decisão sólida, mas com ranges de referência (não solver) ou
//                   ICM com os stacks reais informados.
//   • aproximacao — o motor AVISA que é chute educado: fronteira (~50/50), ICM
//                   estimado por mesa representativa, ou faixa de re-shove onde a
//                   fronteira exata é heurística.
//
// Isto responde à crítica honesta "números sem margem de erro": em vez de esconder
// a incerteza, a gente mostra — e diz como reduzi-la (informar os stacks reais).
// ---------------------------------------------------------------------------

import type { SituationKey, StageKey } from "./stage";

export type ConfidenceLevel = "alta" | "media" | "aproximacao";

export interface DecisionConfidence {
  level: ConfidenceLevel;
  /** Rótulo curto pra UI: "Confiança alta" / "Confiança média" / "Aproximação". */
  label: string;
  /** Frase honesta de uma linha explicando o nível (e, quando dá, como subir). */
  reason: string;
}

// Mãos que tornam a decisão "clara" por si (premium de verdade — nunca marginais).
const CLEAR_HANDS = new Set(["AA", "KK", "QQ", "JJ", "AKs", "AKo", "AQs"]);

export interface ConfidenceInput {
  situation: SituationKey;
  stage: StageKey;
  stackBB: number;
  handType: string;
  /** Spot de fronteira (equity ~ preço). */
  borderline: boolean;
  /** O estágio tem pressão de ICM (bolha/mesa final). */
  icmActive: boolean;
  /** O usuário informou os stacks REAIS da mesa (sobe a confiança do ICM). */
  hasRealStacks: boolean;
}

function make(level: ConfidenceLevel, reason: string): DecisionConfidence {
  const label =
    level === "alta" ? "Confiança alta" : level === "media" ? "Confiança média" : "Aproximação";
  return { level, label, reason };
}

export function decisionConfidence(inp: ConfidenceInput): DecisionConfidence {
  // 1) Fronteira derruba a confiança — é o sinal mais honesto que temos.
  if (inp.borderline) {
    return make(
      "aproximacao",
      "É fronteira: sua equity está quase colada no preço (~50/50). Escolher o outro lado perde muito pouco.",
    );
  }

  // 2) ICM ativo SEM stacks reais = estimativa por mesa representativa.
  if (inp.icmActive && !inp.hasRealStacks) {
    return make(
      "aproximacao",
      "ICM estimado por uma mesa representativa. Informe os stacks reais da sua mesa pra subir a confiança.",
    );
  }

  // 3) Faixa de re-shove (13–22bb enfrentando abertura): a direção (jam-ou-fold)
  //    é clara, mas a fronteira EXATA da range é heurística.
  const reshoveBand =
    inp.situation === "vsopen" && inp.stackBB >= 13 && inp.stackBB < 22 && !CLEAR_HANDS.has(inp.handType);
  if (reshoveBand) {
    return make(
      "media",
      "Faixa de re-shove (13–22bb): a direção é clara, mas a fronteira exata da range é estimada.",
    );
  }

  // 4) Push/fold curto puro: shove-or-fold é território bem estabelecido.
  if (inp.stackBB < 13) {
    return make("alta", "Stack curto: shove-or-fold é território bem estabelecido no poker de torneio.");
  }

  // 5) ICM COM stacks reais informados: boa base (mas ICM é sensível).
  if (inp.icmActive && inp.hasRealStacks) {
    return make(
      "media",
      "ICM com os stacks reais que você informou — boa base; lembre que o ICM é sensível a mudanças de stack.",
    );
  }

  // 6) Mão clara em pré-flop legível.
  if (CLEAR_HANDS.has(inp.handType)) {
    return make("alta", "Mão clara em spot de pré-flop bem coberto pela nossa referência.");
  }

  // 7) Padrão: decisão sólida com ranges de referência (não solver exato).
  return make(
    "media",
    "Spot de pré-flop padrão: decisão sólida, baseada em ranges de referência — não é solver exato.",
  );
}
