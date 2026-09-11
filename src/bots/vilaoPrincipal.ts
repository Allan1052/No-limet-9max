// ---------------------------------------------------------------------------
// QUEM FOI O VILÃO DESTA MÃO.
//
// O app já sabe explicar como bater cada bot da mesa (`exploit.ts`) — e sabe de
// um jeito honesto, porque deriva o vazamento dos PARÂMETROS REAIS que o bot usa
// para jogar, não de uma frase genérica. Só que isso vivia escondido atrás de um
// toque no assento, e ninguém descobria.
//
// Para trazer esse conselho para as dicas da mão, falta responder uma pergunta:
// contra QUEM foi essa mão? A resposta aqui é a mais simples que é defensável:
// o último vilão que agiu SEM foldar. É quem continuou com você até o ponto mais
// longe da mão — o oponente que a mão de fato foi.
//
// ⚠️ Só devolve algo quando o nome bate com um perfil conhecido da mesa de
// treino. Em mão IMPORTADA o oponente é uma pessoa de verdade, de quem o app não
// tem parâmetro nenhum: ali a frase corretamente não nasce (é a mesma regra do
// contrato — sem dado, sem frase).
// ---------------------------------------------------------------------------

import type { HandHistory } from "../app/replay";
import { PROFILES, profileById, type BotProfile } from "./profiles";

export interface VilaoPrincipal {
  nome: string;
  profile: BotProfile;
}

/** Ações que significam "continuou na mão" (blind postado não conta). */
const CONTINUOU = new Set(["call", "raise", "bet", "allin", "check"]);

export function vilaoPrincipalDaMao(hand: HandHistory | null | undefined): VilaoPrincipal | undefined {
  if (!hand || !hand.events || hand.events.length === 0) return undefined;

  let nome: string | undefined;
  for (const ev of hand.events) {
    if (ev.isHero) continue;
    if (!CONTINUOU.has(ev.actionType)) continue;
    nome = ev.name;
  }
  if (!nome) return undefined;

  const perfil = PROFILES.find((p) => p.name === nome);
  if (!perfil) return undefined; // oponente humano importado: sem parâmetro, sem frase
  return { nome, profile: profileById(perfil.id) };
}
