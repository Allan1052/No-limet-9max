// ---------------------------------------------------------------------------
// DO DIAGNÓSTICO AO TREINO — fecha o ciclo do "Jogar sozinho".
//
// O modo sozinho passou a dizer ONDE o Allan erra sem ajuda ("Stack curto
// ≤12bb: 33% de acerto"). Este módulo traduz esse balde no treino certo.
//
// A regra é chata de propósito: **só existe alvo quando o app sabe treinar
// aquilo de verdade.** Onde a tradução seria chute, devolvemos null e a tela
// simplesmente não oferece botão — melhor não oferecer do que mandar o jogador
// para um treino que não é o do problema dele.
// ---------------------------------------------------------------------------

export type AlvoTreino =
  | {
      /** Drill pré-flop na PROFUNDIDADE em que ele erra. */
      tipo: "drill";
      /** Stack efetivo das mãos do treino, em bb. */
      effectiveBB: number;
      /** Frase que a tela mostra ao abrir o treino. */
      foco: string;
    }
  | {
      /** Treino de mesa final (o app já tem um, com ICM). */
      tipo: "mesaFinal";
      foco: string;
    };

/**
 * Profundidade REPRESENTATIVA de cada faixa — o meio dela, não a borda.
 * Treinar 12bb quando o balde é "≤12bb" pegaria só o caso mais fácil da faixa.
 */
const PROFUNDIDADE: Record<string, { bb: number; nome: string }> = {
  stk_curto: { bb: 9, nome: "stack curto (≤12bb)" },
  stk_1020: { bb: 16, nome: "12–20bb" },
  stk_2040: { bb: 30, nome: "20–40bb" },
  stk_fundo: { bb: 55, nome: "stack fundo (40bb+)" },
};

export function treinoParaBalde(bucketId: string): AlvoTreino | null {
  const p = PROFUNDIDADE[bucketId];
  if (p) {
    return {
      tipo: "drill",
      effectiveBB: p.bb,
      foco: `Decisões de ${p.nome} — é onde você mais erra jogando sozinho.`,
    };
  }
  // Bolha e mesa final têm treino PRÓPRIO no app (com ICM), melhor que um drill
  // genérico: mandamos para lá em vez de fingir profundidade.
  if (bucketId === "stg_bolha" || bucketId === "stg_mesa_final") {
    return {
      tipo: "mesaFinal",
      foco:
        bucketId === "stg_bolha"
          ? "Perto da bolha é onde você mais erra sozinho — treine a pressão do prêmio."
          : "Mesa final é onde você mais erra sozinho — treine com o ICM apertando.",
    };
  }
  // "rua_pre"/"rua_pos" e "stg_inicio"/"stg_meio" não viram treino: dizer
  // "treine pré-flop" não é alvo, é o app inteiro. Sem alvo, sem botão.
  return null;
}
