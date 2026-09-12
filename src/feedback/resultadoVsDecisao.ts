// ---------------------------------------------------------------------------
// "RESULTADO ≠ DECISÃO" — a frase mais importante que faltava no app.
//
// Ideia da auditoria do canal do Carmanhani (12/09/2026). O vício número 1 do
// jogador recreativo é julgar a jogada pelo que saiu no river: perdeu, foi
// burrice; ganhou, foi gênio. O app sempre soube as DUAS coisas — quanto você
// ganhou ou perdeu na mão, e se a decisão estava no padrão — e nunca as colocou
// na mesma frase.
//
// A hora de dizer isso é justamente quando as duas DISCORDAM:
//   • perdeu e decidiu certo → "é assim mesmo; não mude o que você fez";
//   • ganhou e errou        → "ganhar escondeu o erro; olha qual foi".
//
// Nada é recalculado: o veredito sai dos FeedbackItems que o motor já produziu
// e do resultado que a mesa já conhece. Sem resultado conhecido, não há
// comparação — e a faixa não nasce.
// ---------------------------------------------------------------------------

import type { FeedbackItem } from "./analyzer";
import { temDadoPara } from "./coachContract";

export type VereditoMao =
  | "acertouEPerdeu"   // o caso que mais ensina
  | "errouEGanhou"     // o caso que mais engana
  | "acertouEGanhou"
  | "errouEPerdeu";

/** O que se sabe do desfecho. Pelo menos um dos dois precisa existir. */
export interface ResultadoDaMao {
  /** Ganho LÍQUIDO em big blinds (negativo = perdeu). Só quando medido. */
  netBB?: number;
  /** Levou (parte d)o pote? Usado quando o líquido não é reconstruível. */
  levouOPote?: boolean;
}

export interface ResultadoVsDecisao {
  veredito: VereditoMao;
  /** Todas as suas decisões ficaram no padrão (boa/ok)? */
  decisaoOk: boolean;
  /** Ganhou fichas nesta mão? */
  ganhou: boolean;
  /** Linha do resultado, pronta ("−18bb", "Levou o pote"). */
  linhaResultado: string;
  /** Linha da decisão, pronta ("Decisão: no padrão"). */
  linhaDecisao: string;
  /** O recado — a parte que combate o vício de julgar pelo resultado. */
  texto: string;
}

function bb(valor: number): string {
  const v = Math.round(valor * 10) / 10;
  const txt = Math.abs(v).toFixed(1).replace(".", ",").replace(/,0$/, "");
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${txt}bb`;
}

export function compararResultadoEDecisao(
  items: FeedbackItem[],
  resultado: ResultadoDaMao,
): ResultadoVsDecisao | undefined {
  if (items.length === 0) return undefined; // sem decisão avaliada, nada a comparar

  // O número em bb só é afirmado quando existe de verdade (porta do contrato).
  const temNet = temDadoPara("resultado", { netBB: resultado.netBB });
  const net = temNet ? resultado.netBB! : undefined;

  let ganhou: boolean;
  let linhaResultado: string;
  if (net !== undefined) {
    // Empate EXATO não é resultado: a mão não subiu nem desceu a sua pilha, e
    // sem resultado não existe o confronto que esta faixa serve para mostrar.
    // (Sem esta trava a tela dizia "Mão empatada" e "perdeu a mão" juntas.)
    if (net === 0) return undefined;
    ganhou = net > 0;
    linhaResultado = bb(net);
  } else if (resultado.levouOPote !== undefined) {
    ganhou = resultado.levouOPote;
    // Curto de propósito: na Revisão a linha de cima já diz o desfecho por
    // extenso, e a faixa fica ao lado dela. Repetir a frase inteira era eco.
    linhaResultado = ganhou ? "Levou o pote" : "Não levou o pote";
  } else {
    return undefined; // desfecho desconhecido: sem comparação honesta
  }

  const decisaoOk = items.every((i) => i.rating === "boa" || i.rating === "ok");
  const veredito: VereditoMao = decisaoOk
    ? ganhou ? "acertouEGanhou" : "acertouEPerdeu"
    : ganhou ? "errouEGanhou" : "errouEPerdeu";

  return {
    veredito,
    decisaoOk,
    ganhou,
    linhaResultado,
    linhaDecisao: decisaoOk ? "Decisão: no padrão" : "Decisão: saiu do padrão",
    texto: TEXTOS[veredito],
  };
}

const TEXTOS: Record<VereditoMao, string> = {
  acertouEPerdeu:
    "Você não levou esse pote — e jogou certo. O resultado de UMA mão depende " +
    "da carta que vem; a decisão é a única parte que é sua. Não mude o que " +
    "você fez por causa de uma mão.",
  errouEGanhou:
    "Ganhou a mão, mas a jogada não era essa. Ganhar esconde erro — e erro " +
    "escondido é o que mais custa caro depois. Olha embaixo qual decisão saiu " +
    "do padrão.",
  acertouEGanhou: "Resultado e decisão andaram juntos aqui: você jogou no padrão e levou.",
  errouEPerdeu:
    "Aqui os dois apontam para o mesmo lado: houve decisão fora do padrão e o " +
    "pote foi embora. Olha embaixo onde a mão saiu do caminho.",
};
