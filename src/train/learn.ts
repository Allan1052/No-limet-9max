// ---------------------------------------------------------------------------
// APRENDA DO ZERO — trilha de 7 lições para quem está começando no poker.
//
// Conceito aprovado pelo Allan (15/08/2026):
//   - Trilha progressiva: a lição N só abre depois de a lição N−1 ser
//     concluída com quiz aprovado (mínimo de 3 acertos em 5 perguntas).
//   - Conteúdo curto, voz de amigo (sem jargão de pro), em PT-BR.
//   - Tudo local (localStorage) — sem backend, sem dev-unlock: a trilha é
//     pública para todos os jogadores, pois é o portal de entrada de
//     novatos no app.
//   - Regra de progresso: responder o quiz com ≥ 60% destrava a próxima.
// ---------------------------------------------------------------------------

/** Exemplo VISUAL com cartas de verdade (mão do herói + board) e uma legenda. */
export interface LearnExample {
  label: string;   // rótulo da mão formada, ex.: "Dois pares"
  hero?: string;   // cartas da mão, ex.: "Ks9h"
  board?: string;  // cartas da mesa, ex.: "Kc7s2h4d9c"
  note?: string;   // frase curta explicando o que as cartas formam
}

export interface LearnLesson {
  id: string;
  title: string;
  icon: string;
  /** Corpo da lição: parágrafos curtos, voz de amigo, sem jargão pesado. */
  body: string[];
  /** Exemplos visuais (cartas) mostrados na leitura — ensina vendo, não lendo. */
  examples?: LearnExample[];
  /** Perguntas de verificação (5 por lição). Podem trazer cartas pra ilustrar. */
  quiz: { question: string; choices: string[]; answer: number; hero?: string; board?: string }[];
}

/** Tabela de FORÇA das mãos — referência visual (da mais forte à mais fraca). */
export interface HandRank {
  rank: number;   // 1 = mais forte
  name: string;
  cards: string;  // 5 cartas de exemplo, ex.: "ThJhQhKhAh"
  note: string;   // uma linha explicando
}

export const HAND_RANKINGS: HandRank[] = [
  { rank: 1, name: "Royal Flush", cards: "Th Jh Qh Kh Ah", note: "A maior de todas: do 10 ao Ás, todas do mesmo naipe." },
  { rank: 2, name: "Straight Flush", cards: "5c 6c 7c 8c 9c", note: "Sequência inteira do mesmo naipe." },
  { rank: 3, name: "Quadra", cards: "9s 9h 9d 9c Ks", note: "Quatro cartas do mesmo valor." },
  { rank: 4, name: "Full House", cards: "Ks Kh Kd 9c 9s", note: "Uma trinca + um par juntos." },
  { rank: 5, name: "Flush", cards: "Ad Jd 8d 5d 2d", note: "Cinco cartas do mesmo naipe (sem estar em sequência)." },
  { rank: 6, name: "Sequência", cards: "5d 6s 7h 8c 9d", note: "Cinco cartas em ordem, naipes variados." },
  { rank: 7, name: "Trinca", cards: "Qs Qh Qd 7c 2s", note: "Três cartas do mesmo valor." },
  { rank: 8, name: "Dois Pares", cards: "Ks Kh 9d 9c 4s", note: "Dois pares diferentes na mesma mão." },
  { rank: 9, name: "Par", cards: "As Ah Kd 7c 2s", note: "Duas cartas do mesmo valor." },
  { rank: 10, name: "Carta Alta", cards: "As Jh 8d 5c 2s", note: "Nenhuma combinação — vale a carta mais alta." },
];

export const LEARN_LESSONS: LearnLesson[] = [
  {
    id: "maos",
    title: "As mãos do poker",
    icon: "🃏",
    body: [
      "No Hold'em você recebe 2 cartas na mão e tenta formar a melhor combinação de 5 cartas usando o board (as 5 cartas da mesa) junto com as suas.",
      "A hierarquia, da mais fraca à mais forte: carta alta, par, dois pares, trinca, sequência, flush (5 do mesmo naipe), full house, quadra, sequência de flush.",
      "Exemplo prático: se o board tem um A e você tem um A na mão, você tem um par de ases — quanto maior o par, melhor. E se o board traz 5 cartas do mesmo naipe, quem tiver a carta mais alta desse naipe ganha.",
      "Dica de ouro: não decore só o nome das mãos — decore o que BATE com o board. Par no board não é par na mão. Quem enxerga isso primeiro toma decisões melhores.",
    ],
    examples: [
      { label: "Dois pares", hero: "Ks9h", board: "Kc7s2h4d9c", note: "Seu K casa com o K do board e seu 9 com o 9 — dois pares (reis e noves)." },
      { label: "Sequência", hero: "5d6c", board: "4h7s8c2d9s", note: "5-6-7-8-9 seguidos formam sequência, mesmo com naipes diferentes." },
      { label: "Flush", hero: "Ah3h", board: "Kh8h2h9c4s", note: "5 cartas de copas usando as suas — flush, e o seu Ás é o mais alto." },
    ],
    quiz: [
      { question: "Com esta mão e este board, o que você tem?", hero: "Kd9s", board: "Kc7s2h4d9c", choices: ["Par de reis", "Dois pares (reis e noves)", "Sequência", "Carta alta"], answer: 1 },
      { question: "Qual mão é mais forte?", choices: ["Flush", "Sequência", "Trinca", "Full house"], answer: 3 },
      { question: "O board tem 5 cartas de copas e você tem A♥ na mão. O que isso significa?", choices: ["Você tem flush com a carta mais alta", "Você perdeu", "Você tem par de ases", "Nada — o flush não conta"], answer: 0 },
      { question: "Com esta mão e este board, o que você formou?", hero: "5d6c", board: "4h7s8c2d9s", choices: ["Par", "Sequência de 4 a 8", "Sequência de 5 a 9", "Flush"], answer: 2 },
      { question: "Quantas cartas compõem a melhor mão no Hold'em?", choices: ["2", "4", "5", "7"], answer: 2 },
    ],
  },
  {
    id: "posicao",
    title: "Posição é poder",
    icon: "🪑",
    body: [
      "No poker, a ordem em que você joga muda tudo. Quem age por último em cada rua (o botão, ou BTN) vê primeiro as decisões dos outros — e informação vale fichas.",
      "Pense numa fila de caixa: quem está no fim da fila vê quanto cada pessoa pagou antes de decidir. Quem está no começo decide no escuro.",
      "Na prática: do BTN você pode jogar mais mãos, porque age depois de todos nas rodadas seguintes. De UTG (primeiro a falar), jogue mais seletivo — qualquer decisão errada sua pode ser enfrentada por até 8 jogadores que ainda vão falar.",
      "Regra para começar: posição inicial = mãos fortes; botão = mãos variadas. Se a dúvida apertar, foldar cedo dói menos do que foldar caro depois.",
    ],
    examples: [
      { label: "Forte de qualquer cadeira", hero: "AhKh", note: "AK vale de UTG ao botão — mão premium não depende de posição." },
      { label: "Só no botão", hero: "9s8s", note: "9♠8♠ é lixo de UTG (8 falam depois de você), mas do botão abre fácil — a posição libera mãos médias." },
    ],
    quiz: [
      { question: "Qual posição age por último em todas as ruas pós-flop?", choices: ["UTG", "Small blind", "Botão (BTN)", "Cutoff"], answer: 2 },
      { question: "Por que UTG deve jogar menos mãos que o BTN?", choices: ["Porque UTG aposta mais caro", "Porque todos os outros jogadores ainda vão falar depois", "Porque UTG tem menos fichas", "Não há diferença"], answer: 1 },
      { question: "Você está no botão e ninguém aumentou antes. O que isso permite?", choices: ["Abrir com mais mãos", "Só abrir com AA", "Fazer all-in sempre", "Nada"], answer: 0 },
      { question: "O que a posição oferece de vantagem?", choices: ["Cartas melhores", "Mais fichas", "Informação sobre as ações dos adversários", "Nenhuma"], answer: 2 },
      { question: "De UTG com esta mão, qual a melhor decisão na maioria dos casos?", hero: "7d2s", choices: ["Aumentar", "Pagar", "Foldar", "All-in"], answer: 2 },
    ],
  },
  {
    id: "ranges",
    title: "Ranges de abertura",
    icon: "📊",
    body: [
      "Range é o conjunto de mãos que um jogador pode ter numa situação. Ninguém joga com UMA mão só na cabeça — joga com um leque de possibilidades.",
      "Na abertura sem aumento antes (RFI), a largura muda muito com posição, stack, ante, sizing e perfil. Como referência do motor-base do Call ou Fold em 100bb, a enumeração encontrou cerca de 11% de abertura em UTG e 45% no BTN — não são números universais nem uma promessa de solver.",
      "Por quê? Porque de UTG ainda há 8 jogadores para falar — mão média vira dor de cabeça. No botão, só os blinds respondem, então dá para abrir mais.",
      "Na aba Ranges, você pode tocar na grade para comparar as recomendações do motor por posição e profundidade. Use-a como referência educativa; o contexto real sempre pode mudar a decisão.",
    ],
    examples: [
      { label: "Dentro do range de UTG", hero: "AsKs", note: "Ases fortes e pares grandes: a base do range apertado de quem fala primeiro." },
      { label: "Só entra do botão", hero: "7h6h", note: "76 suited não abre de UTG, mas do botão sim — mão média que a posição justifica." },
    ],
    quiz: [
      { question: "O que é um 'range' no poker?", choices: ["A distância entre as fichas", "O conjunto de mãos possíveis numa situação", "O valor do pote", "A posição do jogador"], answer: 1 },
      { question: "Aproximadamente quanto um profissional abre de UTG?", choices: ["15% das mãos", "42% das mãos", "Todas as mãos", "50% das mãos"], answer: 0 },
      { question: "Por que o botão abre mais mãos que o UTG?", choices: ["O botão joga por último e só os blinds respondem", "O botão ganha mais fichas", "As cartas do botão são melhores", "Não há motivo"], answer: 0 },
      { question: "Quais mãos fazem parte do range de UTG?", choices: ["Qualquer duas cartas", "Mãos fortes (pares grandes, Ax forte)", "Só conectores baixos", "Mãos do mesmo naipe apenas"], answer: 1 },
      { question: "Onde no app você pode comparar ranges de abertura por posição?", choices: ["Ranking", "Ranges", "Anatomia", "Perfil"], answer: 1 },
    ],
  },
  {
    id: "apostas",
    title: "Apostas e valor do pote",
    icon: "🪙",
    body: [
      "Cada aposta define um preço para você continuar na mão. A pergunta certa nunca é 'será que eu tenho a melhor mão?' — é 'o preço que estão me cobrando compensa?'",
      "Exemplo real: pote de 100 fichas, adversário aposta 50. Você precisa pagar 50 para disputar 200 (100 do pote + 50 da aposta + suas 50 se pagar). O ponto de equilíbrio é 50 ÷ 200 = 25% — você precisa ganhar cerca de 1 em cada 4 vezes, antes de considerar rake, empates e outros fatores.",
      "Regra prática para novatos: contra aposta pequena (metade do pote ou menos), você pode pagar com mais mãos. Contra aposta grande (pote inteiro ou mais), só continue com mãos realmente fortes ou projetos com muitas cartas de saída (outs).",
      "E lembre: foldar não é perder fichas — é GUARDAR fichas para chegar na final. Quem dobra demais para defender orgulho quebra no meio do torneio.",
    ],
    examples: [
      { label: "Projeto forte (9 outs)", hero: "Ah7h", board: "Kh8h2c", note: "Duas copas na mão + duas no board: 9 cartas te dão o flush. Projeto com muitas saídas tolera pagar um preço." },
    ],
    quiz: [
      { question: "Pote de 100, adversário aposta 50. Quanto você precisa pagar para continuar?", choices: ["25", "50", "100", "150"], answer: 1 },
      { question: "Se você paga 50 num pote que valerá 200, qual é o ponto de equilíbrio aproximado?", choices: ["1 em cada 2", "1 em cada 4", "1 em cada 5", "Sempre"], answer: 1 },
      { question: "Contra uma aposta grande (pote inteiro), qual a postura correta com mão média?", choices: ["Pagar sempre", "Foldar na maioria dos casos", "Dar all-in", "Aumentar sempre"], answer: 1 },
      { question: "O que significa 'guardar fichas para a final'?", choices: ["Não apostar nunca", "Foldar mãos ruins em vez de pagar caro", "Acumular fichas no início", "Jogar só no final"], answer: 1 },
      { question: "O que a pergunta certa antes de pagar deve ser?", choices: ["'Será que ele está blefando?'", "'O preço compensa?', ou seja, quanto preciso ganhar para pagar a conta", "'Tenho sorte hoje?'", "'Qual o buy-in?'"], answer: 1 },
    ],
  },
  {
    id: "fold",
    title: "Fold não é fraqueza",
    icon: "🛡️",
    body: [
      "O fold é a decisão mais subestimada do poker — e a mais praticada pelos campeões. Nos torneios, você sobrevive dobrando fichas que NÃO valem o preço.",
      "Matemática simples: no início do torneio cada aposta errada custa blind; no meio, custa metade do stack; no fim, custa o sonho. Foldar cedo é exatamente o que separa quem chega na final de quem 'quase' chegou.",
      "Mãos de exemplo que pedem fold sem pensar: 7-2, 8-3, cartas baixas desconectadas de posições iniciais. Guardar essas fichas vale mais do que tentar 'ver o flop com qualquer coisa'.",
      "O coach do app vai te dizer quando o fold é a linha principal — se ele disser isso de uma mão ruim, é padrão, não erro. Não espere aplauso por fazer o óbvio: espere resultado no final do torneio.",
    ],
    examples: [
      { label: "Fold sem pensar", hero: "7s2c", note: "7-2 offsuit: a pior mão do poker. De qualquer posição, vai pro lixo." },
      { label: "Fold sem pensar", hero: "8h3d", note: "Cartas baixas e desconectadas: guardar a ficha vale mais que 'ver o flop com qualquer coisa'." },
    ],
    quiz: [
      { question: "Por que o fold é tão importante em torneios?", choices: ["Porque é divertido", "Porque cada aposta errada custa fichas preciosas ao longo do torneio", "Porque acelera o jogo", "Não é importante"], answer: 1 },
      { question: "Você está de UTG com esta mão. Qual a decisão padrão?", hero: "7s2c", choices: ["Aumentar", "Pagar", "Foldar", "All-in"], answer: 2 },
      { question: "Foldar uma mão ruim significa:", choices: ["Fraqueza", "Erro de leitura", "Guardar fichas para decisões melhores", "Desistir do torneio"], answer: 2 },
      { question: "O que separa quem chega na final de quem 'quase' chegou?", choices: ["Sorte nas cartas", "Foldar cedo o que não merece fichas", "Jogar todas as mãos", "Apostar mais"], answer: 1 },
      { question: "Quando o coach diz que o fold é 'a linha principal' de uma mão fraca, isso é:", choices: ["Um erro do coach", "O padrão correto — não espere aplauso pelo óbvio", "Motivo para pagar", "Sinal de blefe"], answer: 1 },
    ],
  },
  {
    id: "leitura",
    title: "Lendo o adversário",
    icon: "🔍",
    body: [
      "Cada ação do adversário encolhe o leque de mãos que ele pode ter. Quando alguém aumenta de UTG, o range dele é forte (pares grandes, Ax). Quando o botão aumenta, o range é largo — até cartas médias entram.",
      "No pós-flop, a leitura continua: quem paga uma aposta num board com A no topo pode ter um Ás, um projeto ou uma mão que aguenta pressão. Uma ação isolada não prova força: contexto, sizing e textura importam.",
      "Padrões ajudam, mas não são certeza: jogador que só aumenta com mãos enormes é previsível; jogador que aumenta com qualquer carta pode exagerar. Observe antes de explorar.",
      "Na aba Sua Mão, você revisa o spot e vê a explicação do motor; no replayer disponível, acompanhe a sequência sem tratar a estimativa como leitura infalível. Criar hipóteses sobre o range do vilão antes de decidir é um hábito que acelera a evolução.",
    ],
    examples: [
      { label: "Aumento de UTG = forte", hero: "AsKs", note: "Quando alguém abre lá do começo, pense em mãos assim: pares grandes, AK, ases fortes. Dê respeito." },
      { label: "Aumento do botão = largo", hero: "Ts9c", note: "Do botão o range abre — até T9 entra. Não dê tanto respeito: pague e reaja com mais mãos." },
    ],
    quiz: [
      { question: "Um aumento de UTG geralmente indica:", choices: ["Range largo com qualquer mão", "Range forte (pares grandes, Ax)", "Um blefe garantido", "Nada específico"], answer: 1 },
      { question: "Um aumento do botão indica:", choices: ["Só cartas premium", "Range largo, incluindo mãos médias", "Sempre blefe", "Sempre value"], answer: 1 },
      { question: "O que cada ação do adversário faz com o range dele?", choices: ["Aumenta", "Encolhe (filtra as mãos possíveis)", "Não muda", "Zera"], answer: 1 },
      { question: "Contra um jogador que só aumenta com mãos enormes, o que fazer?", choices: ["Pagar tudo", "Foldar sem pensar", "Aguardar mão forte e explorar a previsibilidade", "Blefar sempre"], answer: 2 },
      { question: "Onde no app você revisa a leitura do spot e a explicação do motor?", choices: ["Ranking", "Sua Mão", "Campanha", "Perfil"], answer: 1 },
    ],
  },
  {
    id: "torneio",
    title: "Sobrevivendo ao torneio",
    icon: "🏆",
    body: [
      "Torneio tem quatro contextos importantes, e não uma receita única: início, meio, bolha e mesa final. No início, com stacks mais profundos, jogue seletivo e observe; a decisão depende da posição, da ação e do stack.",
      "No meio, blinds e antes pesam mais: roubar em posição ganha importância, mas não significa abrir qualquer mão. Ajuste o range conforme stacks, jogadores e ação anterior.",
      "Na bolha, sobreviver e pressionar têm valor diferente para cada stack. Na mesa final, a distribuição de prêmios pode adicionar pressão de ICM. Com 10–15bb, push ou fold aparece com frequência, mas posição, ante, ICM e ação anterior definem o range — não existe 'qualquer par, Ax e carta conectada' automático.",
      "O coach do app mostra o veredito considerando o estágio escolhido e o stack em blinds. Use os torneios de treino, sem dinheiro real, para comparar decisões e entender onde a pressão muda o plano.",
    ],
    examples: [
      { label: "Possível shove com stack curto (~12bb)", hero: "Ad9c", note: "A9 pode entrar em um range de shove em alguns spots de 10–15bb, mas posição, ante, ação e ICM mudam a resposta." },
      { label: "Par em stack curto (~12bb)", hero: "6s6d", note: "Pares médios podem ser bons candidatos a shove em alguns cenários, mas não são automáticos: o range do vilão e a pressão de torneio contam." },
    ],
    quiz: [
      { question: "Qual a estratégia correta no início do torneio (stacks profundos)?", choices: ["All-in com qualquer mão", "Jogo sólido: mãos fortes e fold sem culpa", "Roubar blinds sem parar", "Pagar todos os aumentos"], answer: 1 },
      { question: "O que acontece com quem não rouba blinds na fase média?", choices: ["Nada", "Morre aos poucos comendo os blinds", "Ganha mais", "Sobe no ranking"], answer: 1 },
      { question: "Com 12 blinds, qual a natureza da decisão na maioria das mãos?", choices: ["Call ou fold", "Push ou fold (all-in ou desistir)", "Check ou call", "Fold sempre"], answer: 1 },
      { question: "Com 12 blinds, o que mais importa antes de decidir entre shove e fold?", choices: ["Só a sua mão", "Posição, antes, ICM e ação anterior", "O buy-in real", "Se a mão é do mesmo naipe"], answer: 1 },
      { question: "O que o coach do app considera no veredito de um torneio?", choices: ["Só a mão", "O estágio do torneio e seu stack em blinds", "O buy-in", "A sorte do dia"], answer: 1 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Progresso — localStorage, chave por jogador (anônimo).
// ---------------------------------------------------------------------------

export interface LearnProgress {
  /** lições com quiz aprovado */
  cleared: string[];
  /** acertos por lição (melhor tentativa) */
  best: Record<string, number>;
}

const KEY = "cof-learn-v1";
const PASS_SCORE = 3; // mínimo de 3 em 5 para aprovar

export function loadLearn(): LearnProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (Array.isArray(p.cleared)) return { cleared: p.cleared, best: p.best ?? {} };
    }
  } catch {
    /* ignore */
  }
  return { cleared: [], best: {} };
}

export function saveLearn(p: LearnProgress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

/** Lição N destrava quando a N−1 está concluída (a primeira sempre aberta). */
export function isLessonUnlocked(index: number, p: LearnProgress): boolean {
  if (index <= 0) return true;
  const prev = LEARN_LESSONS[index - 1];
  return p.cleared.includes(prev.id);
}

/** Registra tentativa de quiz; devolve se aprovou e o progresso atualizado. */
export function recordLesson(
  p: LearnProgress,
  lessonId: string,
  correct: number,
): { passed: boolean; progress: LearnProgress } {
  const passed = correct >= PASS_SCORE;
  const best = Math.max(p.best[lessonId] ?? 0, correct);
  const cleared =
    passed && !p.cleared.includes(lessonId)
      ? [...p.cleared, lessonId]
      : p.cleared;
  return { passed, progress: { cleared, best: { ...p.best, [lessonId]: best } } };
}

export function learnStats(p: LearnProgress): { done: number; total: number } {
  return { done: p.cleared.length, total: LEARN_LESSONS.length };
}
