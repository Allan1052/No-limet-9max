// ---------------------------------------------------------------------------
// O SPOT QUE DIVIDE — pós-flop difícil, com a mão inteira à vista.
//
// 14/10/2026. O Allan jogou ~15 spots do Alvo e reclamou, com razão:
//   *"foi só aqueles de mão lixo, não teve nenhum que chegasse mais próximo da
//   realidade de torneio, aquele que fizesse eu gastar todo meu time bank e
//   ficar desconfortável pra tomar a decisão. Quero que abra o leque, mostre
//   spots da decisão a ser tomada no flop, turn e river, mostrando toda a ação
//   da mão."*
//
// ---------------------------------------------------------------------------
// POR QUE ISTO PRECISOU SER UM BANCO MONTADO (medido antes de construir)
//
// A primeira hipótese era filtrar o Alvo pela régua de importância. A medição
// (sim/_spotDificilRun.test.ts, 10 torneios, 994 decisões) DERRUBOU isso:
//
//   decisões de acumulação por nível:  obvia 0 · interessante 152 · excepcional 15
//
// Ou seja: o Alvo JÁ estava filtrado — nenhum spot óbvio passava. O problema é
// outro e é estrutural:
//
//   por rua:  preflop 869 (345 difíceis) · flop 73 (51) · turn 35 (27) · river 17 (11)
//
// 87% das decisões de um torneio são PRÉ-FLOP, porque o jogo é assim. Pós-flop
// difícil aparece ~9 vezes por torneio inteiro. O fluxo natural NUNCA vai dar
// volume de flop/turn/river difícil — então, para treinar isso, os spots têm
// de ser montados. Foi a medição que decidiu, não o gosto.
//
// ---------------------------------------------------------------------------
// O QUE O APP PODE E NÃO PODE AFIRMAR AQUI
//
// PODE: a equity sai de `equityHandVsRange`, que é Monte Carlo de verdade —
// sorteia o board e avalia as mãos. O preço exigido é aritmética do pote.
//
// NÃO PODE: dizer qual é "a jogada certa". O range do vilão é uma ESTIMATIVA, e
// num spot que divide a resposta muda conforme esse range. Então este modo não
// dá veredito: ele mostra a conta inteira, diz o que inclina para cada lado, e
// deixa a decisão com o jogador. É o oposto de um drill de certo/errado — e é
// a única forma honesta de tratar um spot que é disputado de verdade.
// ---------------------------------------------------------------------------

import { cardsFromString, type Card } from "../engine/cards";
import { equityHandVsRange } from "../engine/equity";
import { handTypeCombos } from "../ranges/types";
import type { Stage } from "../tournament/structure";

export type RuaDoSpot = "flop" | "turn" | "river";
export type EscolhaDoSpot = "fold" | "call" | "raise";

export interface AcaoNaMao {
  rua: "preflop" | RuaDoSpot;
  /** "Você" ou a posição do vilão. */
  quem: string;
  /** O que aconteceu, em português: "abre 2,5bb", "aposta 6bb (60% do pote)". */
  texto: string;
  /** Destaca a linha na tela (a ação que criou a decisão). */
  marco?: boolean;
}

export interface SpotQueDivide {
  id: string;
  titulo: string;
  /** O nome do arquétipo — é o que se aprende, não a mão específica. */
  arquetipo: string;
  stage: Stage;
  /** Contexto curto do torneio, para a cabeça entrar no lugar. */
  contexto: string;
  posicaoHeroi: string;
  posicaoVilao: string;
  stackHeroiBB: number;
  stackVilaoBB: number;
  /** "As Qd" */
  maoHeroi: string;
  /** "Kh 7c 2d 9s 4h" — só as cartas já abertas no momento da decisão. */
  board: string;
  acoes: AcaoNaMao[];
  rua: RuaDoSpot;
  potBB: number;
  paraPagarBB: number;
  opcoes: EscolhaDoSpot[];
  /**
   * O range do vilão, SEPARADO em valor e blefe.
   *
   * A separação não é organização: é o que permite responder a pergunta que
   * de fato decide um spot disputado — *quanto ele precisa estar blefando para
   * o meu call empatar*. Com um range único só dá para cuspir um veredito, e
   * veredito é exatamente o que um spot que divide não tem.
   */
  rangeValor: string[];
  rangeBlefe: string[];
  /** Como esse range foi deduzido — o jogador precisa poder discordar. */
  comoLiORange: string;
  porQueDivide: string;
  inclinaCall: string[];
  inclinaFold: string[];
}

// ---------------------------------------------------------------------------
// O BANCO. Cada spot é um ARQUÉTIPO que divide opinião no mundo real — não a
// reprodução de uma mão famosa. Reproduzir mão célebre de memória, com stacks e
// cartas específicos, seria inventar detalhe; o arquétipo ensina mais e é
// verificável.
// ---------------------------------------------------------------------------

export const SPOTS: SpotQueDivide[] = [
  {
    id: "bluffcatcher_river_overbet",
    titulo: "Ás alto contra um overbet no river",
    arquetipo: "Bluff-catcher: a mão que só ganha de blefe",
    stage: "meio",
    contexto: "Meio de torneio, 300 inscritos, restam 92. Ninguém está curto.",
    posicaoHeroi: "BB",
    posicaoVilao: "CO",
    stackHeroiBB: 48,
    stackVilaoBB: 52,
    maoHeroi: "As Qd",
    board: "Kh 7c 2d 9s 4h",
    acoes: [
      { rua: "preflop", quem: "CO", texto: "abre 2,5bb" },
      { rua: "preflop", quem: "Você", texto: "paga no BB" },
      { rua: "flop", quem: "Você", texto: "check" },
      { rua: "flop", quem: "CO", texto: "aposta 2bb (⅓ do pote)" },
      { rua: "flop", quem: "Você", texto: "paga" },
      { rua: "turn", quem: "Você", texto: "check" },
      { rua: "turn", quem: "CO", texto: "check" },
      { rua: "river", quem: "Você", texto: "check" },
      { rua: "river", quem: "CO", texto: "aposta 14bb — overbet, 1,5× o pote", marco: true },
    ],
    rua: "river",
    potBB: 9.5,
    paraPagarBB: 14,
    opcoes: ["fold", "call"],
    rangeValor: ["KK", "77", "22", "99", "AKs", "AKo", "KQs", "K9s"],
    rangeBlefe: ["QJs", "JTs", "T8s", "87s", "65s", "A5s", "A4s"],
    comoLiORange:
      "Ele abriu do CO, apostou pequeno no flop e DESISTIU no turn — o check do turn tira muita mão forte. Aí ele overbeta o river, num board em que quase nada melhorou. Isso parte o range dele em dois: ou ele escondeu um monstro, ou está transformando um projeto que morreu em blefe.",
    porQueDivide:
      "Você tem ÁS ALTO. Essa mão não ganha de nenhuma mão feita — só de blefe puro. O overbet é justamente o tamanho que um blefe escolhe quando quer o máximo de fold equity, e também o que um monstro escolhe quando sabe que você tem bluff-catcher. O tamanho não te diz nada, e é por isso que o spot divide.",
    inclinaCall: [
      "O check dele no turn tira KK e AK do range — quem tem monstro não dá check numa rua inteira com dinheiro para tirar.",
      "A sua Q bloqueia QJs, um dos blefes naturais dele.",
      "Se ele blefa com todos os projetos que morreram, há muito mais blefe que valor nesse board seco.",
    ],
    inclinaFold: [
      "No campo recreativo quase ninguém overbeta de blefe — overbet é quase sempre valor.",
      "Ás alto não ganha de par nenhum, e ele pode estar apostando um K fraco por valor fino.",
      "Você está pagando 14bb para ganhar 9,5: precisa estar certo em mais de 1 de cada 2,7 vezes.",
    ],
  },
  {
    id: "set_under_set",
    titulo: "Set de 7 e ele não para de apostar",
    arquetipo: "Set under set: a mão forte demais para foldar e fraca demais para pagar",
    stage: "meio",
    contexto: "Começo do meio, stacks ainda fundos — é o pior momento para errar.",
    posicaoHeroi: "BTN",
    posicaoVilao: "UTG",
    stackHeroiBB: 95,
    stackVilaoBB: 88,
    maoHeroi: "7d 7c",
    board: "7s 9h Kd 2c 5s",
    acoes: [
      { rua: "preflop", quem: "UTG", texto: "abre 2,5bb" },
      { rua: "preflop", quem: "Você", texto: "paga no botão" },
      { rua: "flop", quem: "UTG", texto: "aposta 4bb (⅔ do pote)" },
      { rua: "flop", quem: "Você", texto: "paga" },
      { rua: "turn", quem: "UTG", texto: "aposta 11bb (¾ do pote)" },
      { rua: "turn", quem: "Você", texto: "paga" },
      { rua: "river", quem: "UTG", texto: "all-in, 70bb num pote de 36bb", marco: true },
    ],
    rua: "river",
    potBB: 36,
    paraPagarBB: 70,
    opcoes: ["fold", "call"],
    rangeValor: ["KK", "99", "AA", "QQ", "JJ", "TT", "AQs", "KQs", "AJs"],
    rangeBlefe: ["AKs", "AKo"],
    comoLiORange:
      "Ele abriu de UTG, a posição mais apertada da mesa, e apostou TRÊS ruas crescendo até o all-in. Esse é o padrão de quem tem uma mão grande e quer o stack — mas é o mesmo padrão de um overpair que não quer dar chance ao projeto.",
    porQueDivide:
      "Você tem a terceira melhor mão possível no board. Ela é forte demais para foldar sem dor, e perde para exatamente duas mãos: KK e 99. O problema é que o jeito dele de apostar é idêntico com AA, KK e 99 — e você não tem como separar. É o spot em que o jogador gasta o time bank inteiro.",
    inclinaCall: [
      "Overpair (AA, QQ, JJ) é muito mais frequente que set, e você bate todas elas.",
      "Muita gente shova AK que virou blefe no river, e você ganha disso.",
      "Foldar set em pote grande é o tipo de fold que, se estiver errado, custa o torneio.",
    ],
    inclinaFold: [
      "Três apostas crescendo até all-in, vindas de UTG, é a linha mais honesta que existe.",
      "Com AA ou KK muita gente dá check no river temendo justamente o seu set — quem shova costuma ter o nuts.",
      "Você precisa estar certo em 40% das vezes; contra um range de set-pesado isso não se sustenta.",
    ],
  },
  {
    id: "top_pair_vs_shove_turn",
    titulo: "Top pair e ele empurra tudo no turn",
    arquetipo: "Top pair contra agressão polarizada",
    stage: "meio",
    contexto: "Meio de torneio, stacks médios. Ele tinha pagado o flop sem resistência.",
    posicaoHeroi: "CO",
    posicaoVilao: "BB",
    stackHeroiBB: 40,
    stackVilaoBB: 38,
    maoHeroi: "Ah Kd",
    board: "Ks 8d 3c 2h",
    acoes: [
      { rua: "preflop", quem: "Você", texto: "abre 2,5bb do CO" },
      { rua: "preflop", quem: "BB", texto: "paga" },
      { rua: "flop", quem: "BB", texto: "check" },
      { rua: "flop", quem: "Você", texto: "aposta 3bb (½ do pote)" },
      { rua: "flop", quem: "BB", texto: "paga" },
      { rua: "turn", quem: "BB", texto: "check" },
      { rua: "turn", quem: "Você", texto: "aposta 7bb" },
      { rua: "turn", quem: "BB", texto: "all-in, mais 27bb", marco: true },
    ],
    rua: "turn",
    potBB: 40,
    paraPagarBB: 27,
    opcoes: ["fold", "call"],
    rangeValor: ["88", "33", "22", "KK", "K8s", "K3s", "A8s"],
    rangeBlefe: ["87s", "65s", "54s", "76s", "97s"],
    comoLiORange:
      "Ele defendeu o BB, pagou o flop num board seco e só acordou no turn — quando a carta mais inofensiva do baralho caiu. Quem sai do check-call direto para all-in num 2 ou tem set, ou está representando um que não tem.",
    porQueDivide:
      "Top pair com o melhor kicker é uma mão boa demais para jogar fora com 40bb no pote. Mas o turn que ele escolheu para empurrar não mudou nada — e é aí que mora a dúvida: ele acertou set no flop e esperou, ou está usando a carta inofensiva como desculpa para blefar?",
    inclinaCall: [
      "O preço é bom: 27bb para ganhar 40, você precisa acertar 40% das vezes.",
      "Projetos (87s, 65s, 76s) chegam nesse spot e shovam como blefe.",
      "Foldar top pair top kicker com 40bb no pote te deixa curto e sem stack para agir depois.",
    ],
    inclinaFold: [
      "Check-call no flop e check-shove no turn é a linha mais forte que existe no campo recreativo.",
      "Num board K-8-3-2 sem naipe, há poucos projetos de verdade — o range de blefe é fino.",
      "Se você estiver errado, acabou o torneio. O fold te deixa com 13bb ainda jogáveis.",
    ],
  },
  {
    id: "bolha_icm_aq",
    titulo: "AQ na bolha contra um all-in",
    arquetipo: "ICM: quando a matemática da mão e a do torneio discordam",
    stage: "bolha",
    contexto: "BOLHA. Restam 44 e pagam 42. Dois jogadores muito curtos em outras mesas.",
    posicaoHeroi: "BB",
    posicaoVilao: "CO",
    stackHeroiBB: 14,
    stackVilaoBB: 12,
    maoHeroi: "Ad Qs",
    board: "",
    acoes: [
      { rua: "preflop", quem: "CO", texto: "all-in, 12bb" },
      { rua: "preflop", quem: "BTN", texto: "folda" },
      { rua: "preflop", quem: "SB", texto: "folda" },
      { rua: "preflop", quem: "Você", texto: "no BB, 14bb atrás — decisão sua", marco: true },
    ],
    rua: "flop",
    potBB: 13.5,
    paraPagarBB: 11,
    opcoes: ["fold", "call"],
    rangeValor: ["22","33","44","55","66","77","88","99","TT","JJ","QQ","KK","AA","A2s","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","A9o","ATo","AJo","AQo","AKo"],
    rangeBlefe: ["KTs","KJs","KQs","QJs","JTs","T9s","98s","KQo","KJo"],
    comoLiORange:
      "Ele está com 12bb no CO, na bolha, com a mesa toda apertando para não bustar. Esse é o spot clássico de empurrar largo — e com razão: ele rouba os blinds na maioria das vezes sem resistência.",
    porQueDivide:
      "Contra o range de shove dele, AQ é favorita. Pela matemática da MÃO, é call fácil. Mas na bolha as fichas que você ganha valem menos que as que você perde — se você bustar aqui, perde o prêmio inteiro, e se você sobreviver mais 3 lugares ele vem sozinho. É o único spot do poker em que ganhar dinheiro e ganhar fichas são coisas diferentes.",
    inclinaCall: [
      "Você é favorito contra o range dele. Pagar é lucro em fichas, e fichas ganham torneios.",
      "Se você foldar, fica com 13bb e a bolha pode durar mais meia hora — você sangra sem jogar.",
      "Tem dois jogadores mais curtos que você em outras mesas: você não é o próximo a cair.",
    ],
    inclinaFold: [
      "Na bolha, bustar custa o prêmio inteiro — e o prêmio vale mais que o lucro em fichas.",
      "Com 14bb você ainda tem jogo; com 2 jogadores curtos prestes a cair, esperar é lucro garantido.",
      "Se você paga e perde, não existe 'segunda mão' — e você estava dentro do dinheiro.",
    ],
  },
  {
    id: "spr_critico_top_pair",
    titulo: "Pote inchado, stack curto, top pair",
    arquetipo: "SPR crítico: a mão em que não existe meio-termo",
    stage: "meio",
    contexto: "Pote já grande depois de uma guerra de 3-bet no pré-flop.",
    posicaoHeroi: "BTN",
    posicaoVilao: "SB",
    stackHeroiBB: 22,
    stackVilaoBB: 24,
    maoHeroi: "Kh Qs",
    board: "Qd 8c 5h",
    acoes: [
      { rua: "preflop", quem: "Você", texto: "abre 2,5bb do botão" },
      { rua: "preflop", quem: "SB", texto: "3-bet para 8bb" },
      { rua: "preflop", quem: "Você", texto: "paga" },
      { rua: "flop", quem: "SB", texto: "all-in, mais 16bb num pote de 17bb", marco: true },
    ],
    rua: "flop",
    potBB: 17,
    paraPagarBB: 16,
    opcoes: ["fold", "call"],
    rangeValor: ["AA", "KK", "QQ", "JJ", "TT", "99", "88", "55", "AQs", "AQo", "KQs"],
    rangeBlefe: ["AKs", "AKo", "AJs", "ATs", "A5s", "A4s", "76s", "65s"],
    comoLiORange:
      "Ele 3-betou do SB e empurrou o flop inteiro num board Q-8-5. Com o pote já do tamanho do stack, ele não tem como apostar pequeno — qualquer aposta dele é all-in na prática. Então o range é tudo que ele 3-betou e quer jogar: overpairs, AQ, e os blefes que não queriam ver turn.",
    porQueDivide:
      "Com o pote igual ao stack (SPR 1), não existe 'jogar com cuidado'. Você tem top pair com kicker decente e o preço está quase 1 para 1 — você precisa acertar só 48% das vezes. Mas metade do range dele te bate de lavada, e a outra metade é blefe puro. Não há mão intermediária.",
    inclinaCall: [
      "O preço é quase 1 para 1: 16bb para ganhar 17. Precisa de 48%, e KQ não está longe disso.",
      "Ele 3-betou do SB, onde o range de blefe é mais largo que em qualquer outra posição.",
      "Foldar aqui te deixa com 6bb — praticamente o mesmo que estar eliminado.",
    ],
    inclinaFold: [
      "Contra overpair você tem 2 outs. Contra AQ você está dominado.",
      "O campo recreativo 3-beta por valor e empurra flop com mão feita, não com ar.",
      "6bb ainda é um shove com fold equity; 0bb não é nada.",
    ],
  },
  {
    id: "blocker_river",
    titulo: "O ás de espadas que não virou flush",
    arquetipo: "Blocker: a carta que você não usa, mas que muda tudo",
    stage: "meio",
    contexto: "Mesa final se formando. Ele vem jogando muito agressivo há 20 minutos.",
    posicaoHeroi: "BB",
    posicaoVilao: "BTN",
    stackHeroiBB: 36,
    stackVilaoBB: 44,
    maoHeroi: "As 5h",
    board: "Ks 9s 4d 7s 2h",
    acoes: [
      { rua: "preflop", quem: "BTN", texto: "abre 2,2bb" },
      { rua: "preflop", quem: "Você", texto: "paga no BB" },
      { rua: "flop", quem: "Você", texto: "check" },
      { rua: "flop", quem: "BTN", texto: "aposta 1,5bb (⅓ do pote)" },
      { rua: "flop", quem: "Você", texto: "paga" },
      { rua: "turn", quem: "Você", texto: "check" },
      { rua: "turn", quem: "BTN", texto: "aposta 5bb (⅔ do pote)" },
      { rua: "turn", quem: "Você", texto: "paga" },
      { rua: "river", quem: "Você", texto: "check" },
      { rua: "river", quem: "BTN", texto: "aposta 18bb — pote inteiro", marco: true },
    ],
    rua: "river",
    potBB: 18,
    paraPagarBB: 18,
    opcoes: ["fold", "call"],
    rangeValor: ["KK", "99", "44", "77", "22", "KQs", "KJs", "K9s", "AKs", "AKo"],
    rangeBlefe: ["QJs", "JTs", "T8s", "86s", "65s", "QTs"],
    comoLiORange:
      "Ele abriu do botão, apostou as três ruas crescendo e terminou com aposta do tamanho do pote num board de três espadas. Com três espadas na mesa, a mão que ele mais quer representar é o flush — e justamente essa é a que você sabe que ele não tem no topo.",
    porQueDivide:
      "Você tem ÁS ALTO numa mesa com três espadas. Não ganha de absolutamente nenhuma mão feita. Mas o A♠ na sua mão é o bloqueador do nut flush: ele não pode ter A♠x♠. Isso tira do range dele a melhor mão possível e aumenta, em proporção, a fatia de blefe. Pagar com ás alto um pote inteiro parece absurdo — e pode ser exatamente certo.",
    inclinaCall: [
      "O A♠ bloqueia o nut flush: a mão mais forte que ele representa está na sua mão.",
      "Ele vem muito agressivo há 20 minutos, e a terceira barrela do tamanho do pote é onde o blefe mora.",
      "Você paga 18 para ganhar 36: precisa estar certo 1 em cada 3 vezes.",
    ],
    inclinaFold: [
      "Ás alto não ganha de par nenhum. Qualquer K, qualquer 9, qualquer 7 te bate.",
      "Ele apostou três ruas crescendo — o padrão mais comum de valor que existe.",
      "Bloqueador é argumento de range, e o range dele pode simplesmente ser flush e trincas.",
    ],
  },
];

// ---------------------------------------------------------------------------
// A CONTA — o que o motor calcula de verdade.
// ---------------------------------------------------------------------------

export interface ContaDoSpot {
  /** Equity do herói contra o range inteiro (valor + blefe), via Monte Carlo. */
  equity: number;
  /** Equity só contra a parte de VALOR do range. */
  equityVsValor: number;
  /** Equity só contra a parte de BLEFE. */
  equityVsBlefe: number;
  /** Quanto você precisa ganhar para o call empatar (pot odds). */
  precoExigido: number;
  /** equity − precoExigido. Positivo = o call paga, com ESTE range. */
  margem: number;
  /** Quantas vezes em 100 você precisa estar certo. */
  acertosEm100: number;
  /** Fração de blefe que o range TEM, como ele foi estimado (0..1). */
  blefeEstimado: number;
  /**
   * A PERGUNTA QUE DECIDE O SPOT: que fração do range dele precisa ser blefe
   * para o seu call empatar (0..1). Indefinida quando o call já paga mesmo
   * contra o range de valor puro, ou quando nem blefe puro salva.
   */
  blefeNecessario?: number;
  /** Combos de cada lado, para a tela poder mostrar a estimativa. */
  combosValor: number;
  combosBlefe: number;
}

/** Preço exigido (pot odds): paraPagar ÷ (pote + paraPagar). */
export function precoExigido(potBB: number, paraPagarBB: number): number {
  const total = potBB + paraPagarBB;
  return total > 0 ? paraPagarBB / total : 0;
}

/** Expande o range escrito em tipos de mão para os combos de carta. */
export function combosDoRange(tipos: string[]): Card[][] {
  const out: Card[][] = [];
  for (const t of tipos) {
    try {
      for (const c of handTypeCombos(t)) out.push(c);
    } catch {
      /* tipo inválido no banco: ignora em vez de derrubar a tela */
    }
  }
  return out;
}

/**
 * Quanto do range precisa ser blefe para o call empatar.
 *
 * A equity contra um range é a MÉDIA das equities por combo, então ela é linear
 * no peso dos blefes — não precisa simular de novo para cada proporção:
 *
 *   eq(w) = (nV·eqV + nB·w·eqB) / (nV + nB·w)
 *
 * Igualando a eq(w) ao preço e isolando w, sai direto a proporção. Devolve a
 * FRAÇÃO de blefe no range resultante (que é o número que o jogador entende),
 * ou `undefined` quando a pergunta não faz sentido naquele spot.
 */
export function blefeNecessario(
  eqValor: number,
  nValor: number,
  eqBlefe: number,
  nBlefe: number,
  preco: number,
): number | undefined {
  if (nValor <= 0 || nBlefe <= 0) return undefined;
  // Já paga contra valor puro: não precisa de blefe nenhum.
  if (eqValor >= preco) return 0;
  // Nem blefe puro cobre o preço: não existe proporção que salve.
  if (eqBlefe <= preco) return undefined;
  const w = (nValor * (preco - eqValor)) / (nBlefe * (eqBlefe - preco));
  const fracao = (nBlefe * w) / (nValor + nBlefe * w);
  return Math.min(1, Math.max(0, fracao));
}

/**
 * Roda a conta do spot. `iteracoes` fica alto porque isto roda uma vez só,
 * quando o jogador abre o resultado — não a cada render.
 */
export function contaDoSpot(
  spot: SpotQueDivide,
  iteracoes = 20_000,
  rng: () => number = Math.random,
): ContaDoSpot {
  const hero = cardsFromString(spot.maoHeroi);
  const board = spot.board.trim() ? cardsFromString(spot.board) : [];
  const cValor = combosDoRange(spot.rangeValor);
  const cBlefe = combosDoRange(spot.rangeBlefe);
  const eqV = equityHandVsRange(hero, cValor, board, iteracoes, rng).equity;
  const eqB = equityHandVsRange(hero, cBlefe, board, iteracoes, rng).equity;
  const nV = cValor.length;
  const nB = cBlefe.length;
  const equity = (nV * eqV + nB * eqB) / Math.max(1, nV + nB);
  const preco = precoExigido(spot.potBB, spot.paraPagarBB);
  return {
    equity,
    equityVsValor: eqV,
    equityVsBlefe: eqB,
    precoExigido: preco,
    margem: equity - preco,
    acertosEm100: Math.round(preco * 100),
    blefeEstimado: nV + nB > 0 ? nB / (nV + nB) : 0,
    blefeNecessario: blefeNecessario(eqV, nV, eqB, nB, preco),
    combosValor: nV,
    combosBlefe: nB,
  };
}

export function spotPorId(id: string): SpotQueDivide | undefined {
  return SPOTS.find((s) => s.id === id);
}

/** Os spots na ordem em que fazem sentido estudar: do mais simples ao mais fino. */
export function spotsEmOrdem(): SpotQueDivide[] {
  return SPOTS;
}
