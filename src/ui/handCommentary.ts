// ---------------------------------------------------------------------------
// Comentário PERSONALIZADO por mão — "a bancada dos 4 pros" (UI layer).
//
// Este módulo SÓ LÊ o estado da mão (cartas, ação, posição, stack) e
// devolve uma frase de comentário específica da mão jogada. NÃO decide nada,
// NÃO muda nota, NÃO toca no motor — é puramente um reforço de leitura,
// exibido no topo do modal de dicas (HandTipsModal).
//
// Voz anônima, estilo solver — não cita nomes de jogadores reais
// (por pedido do Allan, 15/08/2026).
//
// Modo Simples  → Coach (jogada certa) / Coach (jogada errada)
// Modo Técnico  → Coach (técnico) com números
// ---------------------------------------------------------------------------
import { rankOf, type Card } from "../engine/cards";

export type ProVoice = "yuri" | "negreanu" | "hellmuth" | "polk";

export interface HandCommentary {
  handName: string; // ex. "A♠ K♥ (AKs)"
  pro: ProVoice;
  proLabel: string; // ex. "Coach" / "Coach (técnico)"
  lines: string[]; // 1 linha de comentário específico da mão
}

export interface HandCommentCtx {
  heroHand: Card[]; // 2 cartas (encodagem (rank-2)*4+suit)
  /** Ação do herói neste spot (rótulo do item): Fold/Call/Raise/Aposta/3-bet/All-in */
  heroAction?: string;
  /** Posição do herói (UTG, UTG1, MP, CO, BTN, SB, BB...) */
  position?: string;
  /** Stack do herói em big blinds no momento da decisão */
  heroBB?: number;
  /** Rating deste item (boa/ok/imprecisa/ruim) — calibra a voz do pro */
  rating?: string;
  /** É a rua pré-flop? */
  preflop?: boolean;
}

// ---------------------------------------------------------------------------
// Classificação da mão
// ---------------------------------------------------------------------------

interface HandShape {
  rankHi: number;
  rankLo: number;
  suited: boolean;
  pair: boolean;
  label: string; // "AKs", "83o", "TT"
}

function classify(heroHand: Card[]): HandShape | null {
  if (heroHand.length !== 2) return null;
  const [c1, c2] = heroHand;
  const r1 = rankOf(c1);
  const r2 = rankOf(c2);
  const hi = Math.max(r1, r2);
  const lo = Math.min(r1, r2);
  const suited = (c1 & 3) === (c2 & 3);
  const pair = hi === lo;
  const R = "23456789TJQKA";
  const label = pair ? `${R[hi - 2]}${R[lo - 2]}` : `${R[hi - 2]}${R[lo - 2]}${suited ? "s" : "o"}`;
  return { rankHi: hi, rankLo: lo, suited, pair, label };
}

function isGood(rating?: string): boolean {
  return rating === "boa" || rating === "ok";
}

// Helpers de contexto
function earlyPos(ctx: HandCommentCtx): boolean {
  return /^(UTG|UTG1|MP)$/.test(ctx.position ?? "");
}
function latePos(ctx: HandCommentCtx): boolean {
  return /^(CO|BTN|HJ|LJ)$/.test(ctx.position ?? "");
}
function shortStack(ctx: HandCommentCtx): boolean {
  return (ctx.heroBB ?? 100) <= 25;
}
function posTag(ctx: HandCommentCtx): string {
  return ctx.position ? ctx.position : "";
}

// ---------------------------------------------------------------------------
// Frases por categoria de mão — específicas, com posição e stack
// ---------------------------------------------------------------------------

/** Trash: 72o, 83o, 27o, 32o, 73o, 92o, 82o, 42o, 63o, 53o, 43o, 52o... */
function trashPhrases(ctx: HandCommentCtx): string[] {
  const pos = posTag(ctx);
  if (ctx.preflop) {
    if (isGood(ctx.rating)) {
      return [
        pos
          ? `${pos}: esse ${ctx.heroAction === "Fold" ? "fold" : "call"} não é jogada, é sobrevivência. Mão assim só financia o stack de quem aperta.`
          : `Fold sem dó. Mãos assim só desperdiçam fichas — guarde as armas pra spots que valem.`,
        `Quem joga ${ctx.heroAction === "Fold" ? "fold" : "call"} aqui está pagando pra ser explorado. O fold é a única linha que não sangra.`,
      ];
    }
    return [
      pos
        ? `${pos}: ${ctx.heroAction === "Fold" ? "esse fold" : "esse raise"} define quem paga a conta${ctx.heroAction === "Fold" ? "" : " — quem joga assim financia o stack de quem aperta"}. De ${pos}, o range abre com menos de 20% das mãos — e essa nem chega perto.`
        : `${ctx.heroAction === "Fold" ? "Fold sem dó" : "Isso"} aqui é dinheiro na lixeira${ctx.heroAction === "Fold" ? ". Mãos assim só desperdiçam fichas" : " — nem em sonho"}.`,
      `Sem par, sem carta alta, sem backdoor.${ctx.heroAction === "Fold" ? " O fold é a única linha que não sangra." : " Raise com isso é entregar fichas de mão beijada pro pote de quem abriu."}`,
    ];
  }
  return [
    `Mão lixo${pos ? ` de ${pos}` : ""} + board que não ajudou = desistir. Ponto.`,
    `Carta alta nenhuma, draw nenhum. Continuar com essa mão é doar fichas — o fold é o que mantém você no torneio.`,
    `Sem draw, equity de ~5-8% contra aposta de 55% do pote (~35% de preço): o call precisaria de ~27% e a mão oferece nada — a conta fecha com fold sempre.`,
  ];
}

/** Pares premium: AA, KK, QQ */
function premiumPairPhrases(ctx: HandCommentCtx): string[] {
  const c = classify(ctx.heroHand) ?? { label: "AA/KK/QQ" };
  const pos = posTag(ctx);
  if (ctx.preflop) {
    const doingWell = /^(Raise|3-bet|All-in)$/.test(ctx.heroAction ?? "");
    if (doingWell) {
      return [
        pos
          ? `${pos}: ${c.label} pede ação SEMPRE. Fez crescer o pote com a mão mais forte do range — é exatamente assim que se constrói valor.`
          : `${c.label}: a melhor mão do pôquer. Abre sempre, de qualquer posição. O pote grande é SEU por direito.`,
        `~85% de equity contra um range aleatório. Aumentou o pote com a mão certa — maximiza EV e obriga o vilão a pagar caro pra te ver.`,
      ];
    }
    return [
      `Par premium${pos ? ` de ${pos}` : ""} e foldou. A única desculpa válida: 3-bet e 4-bet na sua frente — o range ali já te domina.`,
      `Par premium não é mão de espera. Se apareceu força enorme na sua frente, ok — mas mão assim raramente deveria sumir quieta.`,
    ];
  }
  if (isGood(ctx.rating)) {
    return ["Par premium no board: valorize devagar, mas valorize sempre. Aposte por valor em cada rua."];
  }
  return ["Par premium no pós-flop e a linha foi passiva? Overcards no board e vilão agressivo já são motivo de suspeita. Jogue rápido antes de virar segundo par."];
}

/** Pares médios: JJ, TT, 99 */
function mediumPairPhrases(ctx: HandCommentCtx): string[] {
  const c = classify(ctx.heroHand) ?? { label: "JJ/TT/99" };
  if (ctx.preflop) {
    if (earlyPos(ctx)) {
      return [
        `${posTag(ctx)}: ${c.label} de early position abre COM FORÇA${isGood(ctx.rating) ? " — e você abriu como manda" : ""}. De lá, não é mão de limpar: é raise ou fold.`,
        `${c.label} tem ~77% de equity contra um range aleatório e ~55% contra QQ+. De early, esse par merece raise: folda pra overpair+AK, mas abre contra o resto do range.`,
      ];
    }
    const doingWell = /^(Raise|3-bet)$/.test(ctx.heroAction ?? "");
    if (doingWell) {
      return [
        `${posTag(ctx)}: ${c.label} de posição tardia vira arma${isGood(ctx.rating) ? " — transformou em valor" : " — abre com frequência"}. TT-99 batem na maioria dos ranges de open.`,
        `${c.label} contra um range de open de BTN (~30%) tem equity de ~57%. Raise de 2.5x constrói o pote antes que um overcard transforme essa mão em dúvida.`,
      ];
    }
    return [
      `${posTag(ctx)}: pagar 3-bet com par médio é linha apertada. Se o vilão re-empurrou, você está correndo contra QQ+/AK${isGood(ctx.rating) ? " — e você evitou" : ""}.`,
      `Contra um range de 3-bet (~9%), ${c.label} roda com apenas ~38% de equity — dominado por QQ+ e AK. Pagar 3-bet com par médio custa EV no longo prazo.`,
    ];
  }
  return ["Par médio no pós-flop vive e morre com o flop: overcard muda tudo. Acertou o set? Valorize. Errou? Fold rápido.",
    `Sem overcard no board, ~80% de equity vs range de call. Overcard = equity cai para ~35% e cada street custa ~1/3 do stack: a decisão nasce no flop, não no turn.`];
}

/** Pares baixos: 22–88 */
function smallPairPhrases(ctx: HandCommentCtx): string[] {
  const c = classify(ctx.heroHand) ?? { label: "par baixo" };
  if (ctx.preflop) {
    if (shortStack(ctx)) {
      const shove = ctx.heroAction === "All-in" || ctx.heroAction === "Raise";
      return [
        `Com ${Math.round(ctx.heroBB ?? 0)}bb${ctx.position ? ` de ${ctx.position}` : ""}: ${c.label} ou vira shove, ou vira fold${shove ? " — shove correto" : ""}. Set mining com stack curto não existe: você nunca verá o flop barato.`,
        `Com ${Math.round(ctx.heroBB ?? 0)}bb, call com ${c.label} tem ~27% de equity vs um range de open — insuficiente. Shove com push/fold equity de ~33%+ é a linha que maximiza o EV da mão.`,
      ];
    }
    if (ctx.heroAction === "Fold" && earlyPos(ctx)) {
      return [`${posTag(ctx)}: par baixo de early position, mesa apertada — fold limpo. Set mining de UTG paga caro demais.`,
        `${c.label} acerta set em ~12% dos flops e implied odds de early são ~10:1 quando o raise vem de UTG (~15%): a matemática do set mining exige posição.`];
    }
    if (/^(Raise|Call)$/.test(ctx.heroAction ?? "")) {
      return [
        latePos(ctx)
          ? `${posTag(ctx)}: par baixo abre como mão de raise${isGood(ctx.rating) ? " — abriu certo" : ""}. O set mining só funciona DE POSIÇÃO, porque a vitória é silenciosa: acertou o set, levou o pote.`
          : `${posTag(ctx)}: par baixo de early position é arriscado abrir${isGood(ctx.rating) ? " — mas o spot aceitava" : ""}. Overcards na sua frente transformam essa mão em aposta cara.`,
        `${c.label} só acerta set em ~12% dos flops. De posição, implied odds de ~20:1 pagam o call; de early, a conta nunca fecha — você paga caro pra ver carta alta na sua frente.`,
      ];
    }
    return [`${posTag(ctx)}: par baixo: early position pede fold, late position paga ou abre. Sem plano claro, folda.`,
      `A regra do par baixo: stack < 20bb = shove/fold (~30% de equity vs open não paga call); stack > 50bb de early = fold; de BTN com flat prévio, call fecha com implied odds ~15:1.`];
  }
  return ["Par baixo no pós-flop só brilha com set. Sem set, é mão de fold rápido — não se apaixone.",
    `Apostar com par baixo sem set tem -EV contra qualquer range: ~20% de equity vs range de aposta. O set mining paga ~12% das vezes — o resto é disciplina.`];
}

/** Big aces: AKs, AKo, AQs, AQo */
function bigAcePhrases(ctx: HandCommentCtx): string[] {
  const pos = posTag(ctx);
  if (ctx.preflop) {
    if (/^(Raise|3-bet)$/.test(ctx.heroAction ?? "")) {
      return [
        `AK${pos ? ` de ${pos}` : ""}: 50/50 contra par, mas equity direta${isGood(ctx.rating) ? " — jogou como arma" : " — e você a jogou como arma"}. AK domina a maioria dos ranges abertos.`,
        `AK roda com ~46% de equity contra QQ+ e ~65% contra um range de open do BTN. Raise/3-bet sempre: o AK não quer ver flop — quer construir pote agora, quando ainda tem equity direta.`,
      ];
    }
    return [
      `AK dobrado${pos ? ` de ${pos}` : ""}: se o vilão mostrou força REAL (3-bet, 4-bet), até o Rei-Ás respeita${ctx.heroAction === "Fold" ? ". Respeitou: certo" : "."}.`,
      `Contra range de 4-bet (~2.5%), AK roda ~46% de equity — flip caro. Contra 3-bet de early (~9%), tem ~43%: call/4-bet depende da profundidade; fold não é vergonha.`,
    ];
  }
  return ["AK no pós-flop sem Ás nem Rei = fold fácil. Carta alta não paga pote — não se apaixone."];
}

/** Ax bom: AJs, ATo, AJo */
function goodAcePhrases(ctx: HandCommentCtx): string[] {
  const pos = posTag(ctx);
  if (ctx.preflop) {
    if (ctx.heroAction === "Fold" && earlyPos(ctx)) {
      return [`AT/AJ${pos ? ` de ${pos}` : ""} com stack fundo: fold é a linha limpa${isGood(ctx.rating) ? " — o fold te leva à final" : ""}. De early, o range tem que ser nobre.`];
    }
    if (/^(Raise|3-bet)$/.test(ctx.heroAction ?? "")) {
      return [
        `Ax bom${pos ? ` de ${pos}` : ""}: abre com confiança${isGood(ctx.rating) ? " — o flush backdoor dá escape quando o Ás não vem" : ""}.`,
        `AJ~AQ tem equity de ~60% vs range de open do BTN, mas fica dominado por AQ+/AK (~41%). De posição, raise de 2.5x; contra 3-bet, fold seletivo — o kicker baixo não paga.`,
      ];
    }
    return [
      `Ax${pos ? ` de ${pos}` : ""} é mão de UM Ás só: se o vilão já mostrou Ás na sua frente, o seu vira segundo${ctx.heroAction === "Fold" ? ". Foldou: correto" : "."}.`,
      `Ax vs range de 3-bet de early (~9% = QQ+, AK) tem ~30% de equity: dominado em kicker e fora de posição. Fold é a única linha +EV no longo prazo.`,
      `Vs open de BTN, AT-AJ roda ~44% de equity — paga 3-bet pequeno de posição, folda contra squeeze. Vs 4-bet, equity cai para ~38% e fold fecha a conta.`,
    ];
  }
  return ["Ax sem Ás no board = fold. Com Ás, valorize com moderação — o kicker decide tudo."];
}

/** Ax suited médio: A2s–A9s */
function suitedAceMediumPhrases(ctx: HandCommentCtx): string[] {
  if (ctx.preflop) {
    if (/^(Raise|Call)$/.test(ctx.heroAction ?? "")) {
      return [
        latePos(ctx)
          ? `Ax suited${ctx.position ? ` de ${ctx.position}` : ""}: abre de posição — o backdoor de flush dá fuga quando o Ás não vem${isGood(ctx.rating) ? ". Correto" : ""}.`
          : `Ax suited${ctx.position ? ` de ${ctx.position}` : ""} de early position: abre seletivo. O flush backdoor não paga agressividade de UTG.`,
        `Ax suited roda com ~45% de equity vs range de open do BTN e o flush draw (~11% de chegar no turn) soma implied odds de ~15:1. De posição o call fecha a conta; de early, não.`,
      ];
    }
    return [`Ax suited${ctx.position ? ` de ${ctx.position}` : ""} de early position: fold limpo. O flush backdoor não paga a fila inicial.`,
      `Ax suited de early roda ~38% de equity vs range de open de UTG (~15%) com kicker morto: raise ou fold, nunca call. A fila inicial não paga equity inversa.`];
  }
  return ["Ax suited pós-flop: sem Ás e sem flush draw, vira fold.",
    `Sem Ás no board, Ax vira kicker ~15% de vezes contra aposta de ~55% do pote: precisa ~35% de equity, tem ~20%. Fold fecha a conta.`];
}

/** Aces fracos off: A2o–A9o */
function weakAcePhrases(ctx: HandCommentCtx): string[] {
  if (ctx.preflop) {
    if (ctx.heroAction === "Fold") {
      return [
        earlyPos(ctx)
          ? `Ax fraco${ctx.position ? ` de ${ctx.position}` : ""}: fold é a linha limpa${isGood(ctx.rating) ? " — o fold te leva à final" : ""}. Não confunda Ás com mão boa.`
          : `Ax off baixo${ctx.position ? ` de ${ctx.position}` : ""}: quase sempre fold. Ás alto, kicker morto — receita de dominado.`
      ];
    }
    if (/^(Raise|Call)$/.test(ctx.heroAction ?? "")) {
      return [`Ax fraco${ctx.position ? ` de ${ctx.position}` : ""} só funciona suited e de posição — o flush backdoor é o verdadeiro valor dessa mão.`,
        `Ax off baixo tem ~30% de equity contra qualquer Ax — kicker morto = dominado. Raise de early tem EV negativo até contra o range mais apertado: fold é a única linha +EV.`,
      ];
    }
    return ["Ax off baixo: quase sempre fold. Ás alto, kicker morto.",
      `Ax off baixo tem ~30% de equity vs range de open de BTN e ~25% vs UTG: sem flush draw, não há equity implícita que pague o call de ~2.5bb.`];
  }
  return ["Ax fraco pós-flop: sem Ás, sem flush draw — desiste rápido.",
    `Kicker morto sem board de Ás: ~15% de equity vs aposta de 2/3 do pote (~33% de preço). Fold é a única linha que não sangra.`];
}

/** Suited connectors: 98s, 87s, 76s, 65s, 54s */
function suitedConnectorPhrases(ctx: HandCommentCtx): string[] {
  const pos = posTag(ctx);
  const scLabel = classify(ctx.heroHand)?.label ?? "suited connector";
  if (ctx.preflop) {
    if (shortStack(ctx)) {
      return [
        `Suited connector${pos ? ` de ${pos}` : ""} com ${Math.round(ctx.heroBB ?? 0)}bb perde valor${ctx.heroAction === "Fold" ? " — foldou certo" : ""}. Essa mão PRECISA ver flop barato — e stack curto não deixa.`,
        `Com ${Math.round(ctx.heroBB ?? 0)}bb, a equity implícita de ${scLabel} desaparece: flush (~11% no turn) e straight (~16% no open-end) não pagam um shove sem fold equity. Push/fold range decide: < 10bb shove com essa mão é aceitável, call nunca.`,
      ];
    }
    if (/^(Raise|Call)$/.test(ctx.heroAction ?? "")) {
      return [
        latePos(ctx)
          ? `Suited connector${pos ? ` de ${pos}` : ""}: mão de 'pós-flop bom'${isGood(ctx.rating) ? " — abriu certo" : " — abre com plano"}. De BTN, ${scLabel} é linda: acerta straight, acerta flush, acerta par com kicker jogável.`
          : `Suited connector${pos ? ` de ${pos}` : ""} de early position: abre como aposta${isGood(ctx.rating) ? ", não como call" : ""}. O 98s de BTN é ouro; de UTG, é risco caro.`,
          `${scLabel} de BTN tem ~44% de equity vs range de open (~30%) e implied odds de ~20:1 quando o flat vem — o raise de 2.2x captura equity; de early, o mesmo raise custa ~-0.4bb/mão.`,
      ];
    }
    if (ctx.heroAction === "Fold") {
      if (isGood(ctx.rating)) {
        const scLabel = classify(ctx.heroHand)?.label ?? "suited connector";
        return [pos ? `Suited connector de ${pos}: fold sem culpa${pos === "BTN" || pos === "CO" ? ", mas atenção — de late essa mão abre com frequência; quem abriu com ela não errou" : " — de early, é luxo que a posição não paga"}. O fold guarda a ficha pro spot certo.` : `Fold sem culpa. Suited connector precisa ver flop barato — com força na frente, pagar é pagar caro.`,
          `${scLabel} precisa de equity implícita: call de 3-bet custa ~22% do stack para ver flop, e a mão só acerta ~30% das vezes com equity de ~40%. A matemática do fold fecha.`];
      }
      return [pos ? `Suited connector de ${pos}: pagou 3-bet?${pos === "BTN" || pos === "CO" ? " — de late, essa mão se paga em chamada" : ""}. Mas sem plano claro, o fold já foi melhor.` : `Sem plano, suited connector vira call desesperado. O fold foi a saída mais barata.`];
    }
    return ["Suited connector de early position: fold é aceitável — a mão precisa de visão de flop.",
      `De early, o range abre ~15% e sua equity de ~38% vs open de UTG não paga raise sem posição; a mão precisa de implied odds que early position não entrega.`];
  }
  return ["Suited connector brilhou no flop? Continua. Errou o board? Desiste — o valor está na textura.",
    `Draw de straight aberto (~16%) + flush draw (~19%) = ~35% de equity contra aposta de ~70% do pote (~41% de preço): a matemática do call vive no número de outs.`];
}

/** Broadways fracos: KQo, KJo, QJo, KTo, QTo, JTo off... */
function weakBroadwayPhrases(ctx: HandCommentCtx, c: HandShape = classify([0, 1])!): string[] {
  const pos = posTag(ctx);
  if (ctx.preflop) {
    if (/^(Raise|3-bet)$/.test(ctx.heroAction ?? "")) {
      if (latePos(ctx) && isGood(ctx.rating)) {
        return [`${pos}: ${c.label} abre com valor${c.label.startsWith("KQ") ? " — domina a maioria dos Ax fracos e paga call de qualquer raise" : " — força que domina a maioria dos ranges abertos"}.`,
          `${c.label} roda com ~62% de equity vs range de open do BTN (~30%) e ~50% vs CO: raise de 2.5x extrai valor de Kx/Qx/par baixo e mantém a iniciativa com 2 overcards no board ~55% das vezes.`,
        ];
      }
      return [`${pos}: ${c.label} aqui não é mão de raise — o padrão era esperar cadeira melhor e segurar o fold.`,
        `${c.label} tem ~36% de equity contra um range de 3-bet e ~43% contra open de UTG: raise sem posição cria spot onde você joga dominado e fora de posição — -EV dos dois lados.`];
    }
    if (ctx.heroAction === "Fold") {
      if (isGood(ctx.rating)) {
        return [`${pos}: ${c.label} — fold limpo${pos === "BTN" || pos === "CO" ? ", mas sem abrir mão do botão: essa é mão de abrir de late" : ""}. De early, o range tem que ser nobre; com força na sua frente, qualquer cadeira pede fold.`,
          `${c.label} abre em ~100% do range de BTN, mas em ~0% de UTG: posição explica ~30% do VPIP do range. O fold economiza ~2.5bb/mão que viram diferença na bolha.`];
      }
      return [`${pos}: ${c.label} não era pra essa cadeira${ctx.heroAction === "Fold" ? " — mas foldou, e folded é melhor do que pagar caro" : ""}. Fichas guardadas são fichas pra final.`,
        `Dominada por AQ+ (~34% de equity) e jogada dominando nada: qualquer ação com essa mão de early é +EV negativo no longo prazo.`];
    }
    return [`${pos}: ${c.label} — valor depende da cadeira: de early, folda; de late, abre. KQo de BTN é arma; de UTG, é peso morto.`,
      `KQo entra em ~25% dos ranges de BTN e ~0% de UTG: a mesma mão vale ~+0.3bb/mão de late e ~-1.2bb/mão de early. A cadeira muda a conta.`];
  }
  return ["Broadway fraco pós-flop sem acertar: fold rápido. Carta alta não paga pote."];
}

/** Mãos médias genéricas (Q9s, T8s, 97s, T9o, 87o, Q8s...) */
function mediumHandPhrases(ctx: HandCommentCtx, c: HandShape = classify([0, 1])!): string[] {
  if (ctx.preflop) {
    if (ctx.heroAction === "Fold") {
      if (isGood(ctx.rating)) {
        return [`${posTag(ctx)}: ${c.label} — fold certeiro${posTag(ctx) === "BTN" ? " — com 3-bet na sua frente, pagar é comprar briga cara; você guardou a ficha" : ""}. De early, o range é nobre e essa não passa. Disciplina${ctx.position ? ` de ${ctx.position}` : ""} é o que separa quem vai à final de quem já era.`];
      }
      return [`${posTag(ctx)}: ${c.label} — fold é disciplina, não medo. De early, cada ficha vale ouro.`];
    }
    if (/^(Raise|Call)$/.test(ctx.heroAction ?? "")) {
      if (latePos(ctx) && isGood(ctx.rating)) {
        return [`${posTag(ctx)}: ${c.label} abre ou paga com plano. Com plano, deu certo — sem plano, é só chamar para perder.`,
          `De ${posTag(ctx)}, o range abre ~35%: ${c.label} entra com ~44% de equity vs open do CO — raise de 2.2x-2.5x captura equity sem inflar o pote.`];
      }
      if (!isGood(ctx.rating)) {
        return [`${posTag(ctx)}: ${c.label} não era pra essa cadeira${ctx.heroAction === "Raise" ? " — o padrão era foldar" : " — pagar aqui é só chamar pra perder"}. Fichas guardadas são fichas pra final.`,
          `~39% de equity vs range de 3-bet e jogada fora de posição: cada call aqui custa ~-0.8bb de EV. A ficha guardada comprou 20 mãos a mais de torneio.`];
      }
      return [`${posTag(ctx)}: ${c.label} de early position: abre seletivo ou folda. O range de UTG não tem espaço pra mão de meio-termo.`,
        `De UTG o range abre ~15%: ${c.label} fica fora — call de early contra esse range tem equity de ~35% e zero fold equity. A conta não fecha.`];
    }
    return [`${posTag(ctx)}: ${c.label} — valor depende da cadeira: de early, é fold; de late, abre com plano.`];
  }
  return [`${c.label} pós-flop: acertou algo? Joga. Errou? Fold sem drama.`];
}

type PhraseFn = (ctx: HandCommentCtx, c?: HandShape) => string[];

interface Category {
  name: string;
  phrases: PhraseFn;
}

const CATEGORIES: Category[] = [
  { name: "trash", phrases: trashPhrases },
  { name: "premium", phrases: premiumPairPhrases },
  { name: "mediumPair", phrases: mediumPairPhrases },
  { name: "smallPair", phrases: smallPairPhrases },
  { name: "bigAce", phrases: bigAcePhrases },
  { name: "goodAce", phrases: goodAcePhrases },
  { name: "suitedConnector", phrases: suitedConnectorPhrases },
  { name: "weakBroadway", phrases: weakBroadwayPhrases },
  { name: "mediumHand", phrases: mediumHandPhrases },
  { name: "suitedAceMedium", phrases: suitedAceMediumPhrases },
  { name: "weakAce", phrases: weakAcePhrases },
];

// Lixo clássico — qualquer naipe (72o/s, 83o/s, 27s etc.)
const TRASH_RANKS: [number, number][] = [
  [7, 2], [8, 3], [8, 2], [9, 2], [9, 3], [4, 2], [5, 2], [5, 3],
  [6, 2], [6, 3], [7, 3], [3, 2], [4, 3],
];

// Lixo OFFSUITS adicional: kicker morto + desconexo — suited vira suitedConnector/
// suitedAce e merece outra leitura; offsuit aqui quase nunca abre.
const TRASH_OFFSUIT_RANKS: [number, number][] = [
  [10, 4], [10, 3], [10, 2],
  [9, 5], [9, 4],
  [8, 5], [8, 4],
  [7, 4], [7, 5],
  [6, 4], [5, 4],
  [11, 8], [11, 7], [11, 6],
  [12, 8], [12, 7], [12, 6],
];

function findCategory(c: HandShape): Category {
  if (c.pair) {
    if (c.rankHi >= 12) return CATEGORIES.find((x) => x.name === "premium")!;
    if (c.rankHi >= 9) return CATEGORIES.find((x) => x.name === "mediumPair")!;
    return CATEGORIES.find((x) => x.name === "smallPair")!;
  }
  if (c.rankHi === 14) {
    if (c.suited) {
      if (c.rankLo >= 10) return CATEGORIES.find((x) => x.name === "bigAce")!;
      if (c.rankLo >= 7) return CATEGORIES.find((x) => x.name === "goodAce")!;
      return CATEGORIES.find((x) => x.name === "suitedAceMedium")!;
    }
    return CATEGORIES.find((x) => x.name === "weakAce")!;
  }
  if (c.rankHi === 13 || c.rankHi === 12 || c.rankHi === 11) {
    if (c.rankHi === 13 && c.rankLo === 12 && c.suited) return CATEGORIES.find((x) => x.name === "bigAce")!; // só KQs é "big ace" premium
    return CATEGORIES.find((x) => x.name === "weakBroadway")!;
  }
  if (c.suited && c.rankHi - c.rankLo === 1) {
    return CATEGORIES.find((x) => x.name === "suitedConnector")!;
  }
  for (const [hi, lo] of TRASH_RANKS) {
    if (c.rankHi === hi && c.rankLo === lo) {
      return CATEGORIES.find((x) => x.name === "trash")!;
    }
  }
  if (!c.suited) {
    for (const [hi, lo] of TRASH_OFFSUIT_RANKS) {
      if (c.rankHi === hi && c.rankLo === lo) {
        return CATEGORIES.find((x) => x.name === "trash")!;
      }
    }
  }
  return CATEGORIES.find((x) => x.name === "mediumHand")!;
}

// ---------------------------------------------------------------------------
// Vozes dos pros
// ---------------------------------------------------------------------------

const PRO_LABEL: Record<ProVoice, string> = {
  yuri: "Coach",
  negreanu: "Coach",
  hellmuth: "Coach (técnico)",
  polk: "Coach (técnico)",
};

/** Escolhe o pro pela combinação modo (Simples/Técnico) + rating. */
export function pickPro(mode: "free" | "technical", rating?: string): ProVoice {
  const bad = rating === "ruim" || rating === "imprecisa";
  if (mode === "free") return bad ? "negreanu" : "yuri";
  return bad ? "polk" : "hellmuth";
}

/** Renderiza o nome bonito da mão (ex.: "A♠ K♥ (AKs)" ou "8♠ 3♦ (83o)"). */
export function handNamePretty(heroHand: Card[]): string {
  const c = classify(heroHand);
  if (!c) return "";
  const R = "23456789TJQKA";
  const SUIT = ["♣", "♦", "♥", "♠"];
  const hiCard = c.pair ? heroHand[0] : heroHand.find((x) => rankOf(x) === c.rankHi) ?? heroHand[0];
  const loCard = c.pair ? heroHand[1] : heroHand.find((x) => rankOf(x) === c.rankLo) ?? heroHand[1];
  return `${R[rankOf(hiCard) - 2]}${SUIT[hiCard & 3]} ${R[rankOf(loCard) - 2]}${SUIT[loCard & 3]}${c.pair ? "" : ` (${c.label})`}`;
}

/**
 * Gera o comentário hand-specific para o spot.
 * @returns null quando não há exatamente 2 cartas
 */
export function getHandCommentary(ctx: HandCommentCtx, mode: "free" | "technical" = "free"): HandCommentary | null {
  const c = classify(ctx.heroHand);
  if (!c) return null;
  const cat = findCategory(c);
  const rawLines =
    cat.name === "mediumHand" || cat.name === "weakBroadway"
      ? (cat.phrases as (x: HandCommentCtx, s?: HandShape) => string[])(ctx, c)
      : cat.phrases(ctx);
  const line = mode === "technical" ? (rawLines[1] ?? rawLines[0]) : rawLines[0];
  const voice = pickPro(mode, ctx.rating);
  return {
    handName: handNamePretty(ctx.heroHand),
    pro: voice,
    proLabel: PRO_LABEL[voice],
    lines: [line],
  };
}
