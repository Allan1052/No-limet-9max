// ---------------------------------------------------------------------------
// PLACAR DE ROUBO — quanto VOCÊ abre, contra quanto o MOTOR abriria.
//
// Nasceu em 14/09/2026 das estatísticas REAIS do Allan no GGPoker (45.027
// mãos). Duas delas apontavam para o mesmo lugar:
//
//   • VPIP 27% × PFR 16% — onze pontos de diferença. Ele ENTRA em onze mãos a
//     cada cem sem aumentar: limp e call.
//   • ATS 29% — tentativa de roubo abaixo da faixa de MTT. Com ante na mesa,
//     é dinheiro parado.
//
// Os dois vazamentos se encontram no MESMO spot: a ação chega em você no CO, no
// BTN ou no SB e ninguém entrou.
//
// ⚠️ A RÉGUA É O PRÓPRIO MOTOR, NAS MESMAS MÃOS. O placar não compara o jogador
// com "35–45%, que é o que dizem por aí": ele conta quantas daquelas mãos
// exatas o motor abriria. É a única comparação que a casa consegue provar, e
// ela não depende de tabela de fora nenhuma.
//
// (Medido em 3.600 mãos geradas: o motor abre 37,4% nesses spots — CO 26,8%,
// BTN 44,3%, SB 41,0%. Bate com a faixa usada no ambiente de MTT, mas quem
// manda na tela é a contagem da sessão, não este parágrafo.)
// ---------------------------------------------------------------------------

export interface PlacarRoubo {
  /** Mãos que você já respondeu nesta sessão. */
  respondidas: number;
  /** Quantas você ABRIU (aumento ou all-in). */
  abriuVoce: number;
  /** Quantas o MOTOR abriria, nas mesmas mãos. */
  abriuMotor: number;
  /** Sua frequência de roubo (%). */
  pctVoce: number;
  /** A frequência do motor nas mesmas mãos (%). */
  pctMotor: number;
  /** Diferença em pontos (você − motor). Negativo = você rouba de menos. */
  diferenca: number;
}

/** Amostra mínima para o placar virar frase. Abaixo disso é sorteio, não jogo. */
export const MINIMO_PARA_LER = 10;

export function placarDeRoubo(respondidas: number, abriuVoce: number, abriuMotor: number): PlacarRoubo {
  const pct = (n: number) => (respondidas > 0 ? Math.round((n / respondidas) * 100) : 0);
  return {
    respondidas,
    abriuVoce,
    abriuMotor,
    pctVoce: pct(abriuVoce),
    pctMotor: pct(abriuMotor),
    diferenca: pct(abriuVoce) - pct(abriuMotor),
  };
}

/**
 * A frase do placar, pronta para a tela — ou `undefined` enquanto a amostra não
 * fecha. Uma diferença de 8 pontos é o limiar para chamar de tendência; abaixo
 * disso, num punhado de mãos, é ruído.
 */
export function lerPlacarDeRoubo(p: PlacarRoubo): string | undefined {
  if (p.respondidas < MINIMO_PARA_LER) return undefined;
  const base = `Você abriu ${p.pctVoce}% · o motor abriria ${p.pctMotor}% nestas mesmas mãos`;
  if (p.diferenca <= -8) return `${base}. Você está roubando de MENOS — é o vazamento mais barato de corrigir.`;
  if (p.diferenca >= 8) return `${base}. Você está abrindo MAIS que o padrão daqui.`;
  return `${base}. Está no padrão.`;
}
