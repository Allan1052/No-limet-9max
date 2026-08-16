// ---------------------------------------------------------------------------
// Legendas prontas para postar a mão no Instagram — estilo do Allan:
// curto, direto, caloroso, recreativo.
//
// Regras do conteúdo:
// - NUNCA mencionar o nome do Allan (usa "um recreativo qualquer").
// - NUNCA prometer dinheiro real; app é GRÁTIS, sem apostas.
// - PT-BR casual, com 🔥♠🍀.
// - Sempre termina com calloufold.com.br + hashtags.
// ---------------------------------------------------------------------------

export interface CaptionSuggestion {
  id: string;
  title: string;
  text: string;
}

const BASE_HASHTAGS =
  "#poker #pokerbrasil #pokeronline #aprendapoker #pokergrátis #calloufold";

/** Monta uma legenda com os dados da mão jogada. */
function handCaption(opts: {
  hand: string;
  board?: string;
  position: string;
  result: string;
  hasHistory: boolean;
}): string {
  const lines = [
    `Mão real: ${opts.hand}`,
    opts.board ? `Board: ${opts.board}` : null,
    `${opts.position} · ${opts.result}`,
    "",
    opts.hasHistory
      ? "Arrasta pro lado e vê a ação completa, rua por rua. 🃏"
      : "Joguei essa no Call ou Fold — o simulador grátis de poker.",
    "Sem dinheiro real. Só estudo.",
    "",
    "calloufold.com.br · link na bio ♠",
    "",
    BASE_HASHTAGS,
  ];
  return lines.filter((l) => l !== null).join("\n");
}

/** Legenda genérica para qualquer card compartilhado. */
export function buildCaption(
  data: {
    heroAction: string;
    position: string;
    stackBB?: string;
    street?: string;
    tournamentResult?: string;
    context?: string;
    actionLog?: unknown[];
  }
): string {
  const result = data.tournamentResult || "simulada no Call ou Fold";
  return handCaption({
    hand: `(${data.heroAction || "desafio"})`,
    position: `${data.position}${data.stackBB ? ` · ${data.stackBB}` : ""}${
      data.street ? ` · ${data.street}` : ""
    }`,
    result,
    hasHistory: !!data.actionLog && data.actionLog.length >= 3,
  });
}

/** Variações prontas para outros tipos de post (Drill, torneio, dica...). */
export const CAPTION_PRESETS: CaptionSuggestion[] = [
  {
    id: "drill",
    title: "Drill / Treino rápido",
    text: [
      "30 segundos pra decidir. É Drill, é pressão de verdade. ⏱️",
      "Treinador: o melhor treino de decisão pra quem curte torneio.",
      "Grátis, sem dinheiro real. Só estudo. 🃏",
      "",
      "calloufold.com.br · link na bio ♠",
      "",
      BASE_HASHTAGS,
    ].join("\n"),
  },
  {
    id: "torneio",
    title: "Campeão de torneio",
    text: [
      "Mais uma final cravada no Call ou Fold! 🏆",
      "Quem sonha treina. E quem treina aparece. 🍀",
      "Simulador grátis de poker, sem dinheiro real. Só estudo.",
      "",
      "calloufold.com.br · link na bio ♠",
      "",
      BASE_HASHTAGS,
    ].join("\n"),
  },
  {
    id: "recreativo",
    title: "Vida de recreativo",
    text: [
      "Sou um recreativo qualquer. Trabalho de dia, estudo de noite. 🃏",
      "Aqui o erro não custa dinheiro — ensina. E é assim que a gente evolui. 💪",
      "",
      "calloufold.com.br · Grátis · sem dinheiro real · link na bio ♠",
      "",
      BASE_HASHTAGS,
    ].join("\n"),
  },
];
