// ---------------------------------------------------------------------------
// CONTRATO DE DADOS DAS DICAS — "sem dado, sem frase".
//
// Ideia adotada da auditoria do Coach feita pelo ChatGPT (11/09/2026), e a
// melhor coisa daquele documento. A regra da casa sempre foi "não inventar
// número"; o contrato transforma essa DISCIPLINA em MECANISMO.
//
// Antes: cada frase decidia sozinha, no meio do código, se tinha dado para
// existir. Funcionava enquanto quem escrevia lembrasse — e é exatamente o tipo
// de coisa que um agente distraído (eu, num dia ruim) quebra escrevendo um
// template bonito sem lastro.
//
// Agora: cada família de frase declara AQUI o que precisa. O teste
// `coachContract.test.ts` percorre este registro e, para cada família, remove
// um campo obrigatório por vez e exige que a frase suma. Uma frase nova sem
// entrada no contrato não passa no teste.
//
// O que o contrato NÃO faz: ele não julga se a frase está bem escrita nem se o
// número está certo — isso é dos bancos de referência. Ele garante só uma
// coisa, a mais importante: a frase não existe sem o dado que a sustenta.
// ---------------------------------------------------------------------------

/** As famílias de frase que o coach sabe produzir. */
export type FamiliaDica =
  | "leituraRange"
  | "equityPreco"
  | "breakEven"
  | "outs"
  | "blocker"
  | "ev"
  | "sizing"
  | "spr"
  | "origem"
  | "topoRange"
  | "icmDelta"
  | "exploit";

export interface ContratoDica {
  familia: FamiliaDica;
  /** Nome humano, para mensagem de teste e para quem for ler o registro. */
  rotulo: string;
  /** Campos que PRECISAM existir (não-undefined, não-null) para a frase nascer. */
  exige: string[];
  /** Por que a frase existe e o que ela promete — fica no código, não na cabeça. */
  promessa: string;
}

export const CONTRATO_DICAS: ContratoDica[] = [
  {
    familia: "leituraRange",
    rotulo: "A leitura (range do vilão)",
    exige: ["villainRangePct"],
    promessa:
      "Diz quão largo é o range do vilão naquele ponto. O número vem do mesmo " +
      "modelo que o motor usa para decidir — nunca de uma estimativa paralela.",
  },
  {
    familia: "equityPreco",
    rotulo: "A conta (equity x preço)",
    exige: ["equity"],
    promessa:
      "Diz sua chance de ganhar e, quando há aposta para pagar, a chance que o " +
      "preço exige. Sem equity não existe conta — e no pré-flop o motor não " +
      "estima equity, então a frase corretamente não nasce lá.",
  },
  {
    familia: "breakEven",
    rotulo: "O que mudaria (ponto de virada)",
    exige: ["breakEvenCallBB", "adviceFam"],
    promessa:
      "Diz com qual tamanho de aposta a decisão viraria. Sai da régua do próprio " +
      "motor (invertida por busca), então nunca contradiz o veredito. Exige " +
      "também a família da ação porque só faz sentido quando o padrão era foldar.",
  },
  {
    familia: "outs",
    rotulo: "Cartas que te salvavam",
    exige: ["outs"],
    promessa:
      "Conta quantas cartas colocam o herói na frente. Só é calculável com as " +
      "cartas reais (o naipe muda as outs de flush), e só existe quando ele " +
      "estava atrás e ainda havia carta por vir.",
  },
  {
    familia: "blocker",
    rotulo: "Bloqueadores",
    exige: ["blockers"],
    promessa:
      "Afirma remoção de combinações do vilão a partir de um detector concreto. " +
      "Pode dizer 'seu A♠ reduz o flush máximo dele'; NÃO pode concluir sozinho " +
      "'logo, é um bom blefe' — a ação continua vindo do motor.",
  },
  {
    familia: "ev",
    rotulo: "Custo em bb (EV)",
    exige: ["evBB"],
    promessa:
      "Mostra o custo da decisão em big blinds. Só aparece quando concorda com a " +
      "nota — a trava de consistência já existente evita dizer 'fold boa' e " +
      "'pagar valia +3bb' na mesma tela.",
  },
  {
    familia: "sizing",
    rotulo: "Tamanho recomendado",
    exige: ["betSizePct", "betSizeBB"],
    promessa: "Mostra o tamanho sugerido pelo motor, em fração do pote e em bb.",
  },
  {
    familia: "spr",
    rotulo: "SPR",
    exige: ["spr"],
    promessa:
      "Mostra a relação entre stack e pote. NÚMERO apenas: transformar SPR em " +
      "regra ('SPR baixo = jogar por stacks') seria conclusão que o app não calcula.",
  },
  {
    familia: "topoRange",
    rotulo: "O topo do range dele (range limitado)",
    exige: ["topoRangePct"],
    promessa:
      "Diz que fração do range dele forma trinca ou melhor NESTE board. É " +
      "contagem sobre o mesmo range que o motor usou para calcular a equity. " +
      "Entrega o número e para: não conclui 'logo, blefe' — a ação é do motor.",
  },
  {
    familia: "icmDelta",
    rotulo: "O ICM medido",
    exige: ["icmDelta"],
    promessa:
      "Só afirma que o ICM mudou a decisão quando o motor, rodado DUAS VEZES " +
      "(com e sem os prêmios na conta), devolve respostas diferentes. Sem essa " +
      "diferença medida, o app não fala em ICM — é a regra que criou este campo.",
  },
  {
    familia: "exploit",
    rotulo: "Como explorar este vilão",
    exige: ["profileId"],
    promessa:
      "Deriva o vazamento do vilão dos PARÂMETROS REAIS do perfil que o bot " +
      "usa para jogar. Só existe contra bot conhecido da mesa de treino; em mão " +
      "importada o oponente é humano desconhecido e a frase corretamente some.",
  },
  {
    familia: "origem",
    rotulo: "Base da recomendação",
    exige: ["origem"],
    promessa:
      "Diz de onde veio a recomendação (preço, força da mão, range da posição, " +
      "push/fold). Só valores que são verdadeiros por construção — ICM fica de " +
      "fora até o motor conseguir provar que foi ele quem mudou a decisão.",
  },
];

const POR_FAMILIA = new Map(CONTRATO_DICAS.map((c) => [c.familia, c]));

export function contratoDe(familia: FamiliaDica): ContratoDica {
  const c = POR_FAMILIA.get(familia);
  if (!c) throw new Error(`Família de dica sem contrato: ${familia}`);
  return c;
}

/**
 * A porta de entrada de toda frase do coach.
 *
 * Devolve `true` só quando TODOS os campos exigidos pela família existem na
 * fonte. Campo presente mas `undefined`/`null` conta como ausente — é o caso
 * real (o motor devolve `undefined` quando não calculou).
 *
 * Arrays e objetos vazios também contam como ausentes: uma lista de
 * bloqueadores vazia não sustenta a frase "você bloqueia...".
 */
export function temDadoPara(
  familia: FamiliaDica,
  fonte: Record<string, unknown> | null | undefined,
): boolean {
  if (!fonte) return false;
  const { exige } = contratoDe(familia);
  return exige.every((campo) => {
    const v = fonte[campo];
    if (v === undefined || v === null) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "number") return Number.isFinite(v);
    return true;
  });
}
