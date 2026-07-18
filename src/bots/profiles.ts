// ---------------------------------------------------------------------------
// Perfis de bot.
//
// Cada um dos 8 assentos (fora o herói) usa um destes perfis como BASE de
// comportamento. São INSPIRADOS em estilos conhecidos de MTT — não cópias, e
// sem qualquer relação oficial com os jogadores citados. Servem só para dar a
// cada bot uma "personalidade" coerente e distinta.
//
// Cada parâmetro modula, de forma principiada, decisões que outros módulos
// tomam. Nada aqui é aleatório: o mesmo perfil na mesma situação decide igual.
//
//  - rfiWidth        : largura da range de abertura (1.0 = base "solver-like";
//                      >1 abre mais mãos, <1 abre menos).
//  - threeBetFactor  : frequência de 3-bet (e 3-bet de blefe) relativa à base.
//  - defendFactor    : quanto defende (call) contra aberturas.
//  - cbetFactor      : frequência de continuation bet no flop (usado no pós-flop).
//  - bluffFactor     : propensão a blefar no pós-flop e a 3-bet de blefe.
//  - aggression      : tendência geral a apostar/aumentar vs. passar/pagar (0..1).
//  - adaptability    : quanto ajusta o jogo à profundidade de stack (0..1).
//  - icmSensitivity  : quanto respeita a pressão de ICM perto da bolha (0..1;
//                      apostadores de risco respeitam menos).
//  - skill           : precisão técnica; quanto maior, menos "erros" e menos
//                      ruído nas decisões (0..1). Usado no pós-flop e no feedback.
// ---------------------------------------------------------------------------

/** Arquétipo genérico, para rótulos e agrupamentos na interface. */
export type Archetype = "LAG" | "TAG" | "nit" | "maníaco" | "GTO";

export interface BotProfile {
  id: string;
  /** Nome de exibição do bot (fictício/derivado, não o jogador real). */
  name: string;
  /** Estilo que inspirou o comportamento (apenas referência de estilo). */
  inspiration: string;
  archetype: Archetype;
  description: string;

  rfiWidth: number;
  threeBetFactor: number;
  defendFactor: number;
  cbetFactor: number;
  bluffFactor: number;
  aggression: number;
  adaptability: number;
  icmSensitivity: number;
  skill: number;
}

// Os 8 perfis. Os valores foram calibrados para refletir as descrições de
// estilo — hiperagressivo abre e 3-beta muito mais; o TAG preciso abre menos e
// blefa menos; o "quase-GTO" fica perto da base com pouca variância.
export const PROFILES: BotProfile[] = [
  {
    id: "astedt",
    name: "Nik A. (Hyper-LAG)",
    inspiration: "estilo Niklas Astedt",
    archetype: "LAG",
    description:
      "Hiperagressivo e altíssimo volume. Ranges muito largas em posição tardia, pressão constante com 3-bet e c-bet.",
    rfiWidth: 1.35,
    threeBetFactor: 1.6,
    defendFactor: 1.1,
    cbetFactor: 1.3,
    bluffFactor: 1.5,
    aggression: 0.95,
    adaptability: 0.8,
    icmSensitivity: 0.5,
    skill: 0.9,
  },
  {
    id: "moorman",
    name: "Chris M. (Sólido)",
    inspiration: "estilo Chris Moorman",
    archetype: "TAG",
    description:
      "Equilibrado e consistente. Decisões sólidas repetidas, sem desvios exploradores arriscados.",
    rfiWidth: 1.0,
    threeBetFactor: 1.0,
    defendFactor: 1.0,
    cbetFactor: 1.0,
    bluffFactor: 1.0,
    aggression: 0.6,
    adaptability: 0.7,
    icmSensitivity: 0.85,
    skill: 0.9,
  },
  {
    id: "sikorski",
    name: "Seb S. (Técnico)",
    inspiration: "estilo Sebastian Sikorski",
    archetype: "TAG",
    description:
      "Técnico e adaptável a diferentes profundidades de stack. Regular disciplinado.",
    rfiWidth: 1.0,
    threeBetFactor: 1.05,
    defendFactor: 1.0,
    cbetFactor: 1.05,
    bluffFactor: 1.0,
    aggression: 0.65,
    adaptability: 0.95,
    icmSensitivity: 0.8,
    skill: 0.88,
  },
  {
    id: "addamo",
    name: "Mike A. (Agressivo)",
    inspiration: "estilo Michael Addamo",
    archetype: "LAG",
    description:
      "Agressivo e adaptável, muito forte em spots complexos pós-flop.",
    rfiWidth: 1.2,
    threeBetFactor: 1.3,
    defendFactor: 1.05,
    cbetFactor: 1.2,
    bluffFactor: 1.25,
    aggression: 0.85,
    adaptability: 0.95,
    icmSensitivity: 0.7,
    skill: 0.95,
  },
  {
    id: "holz",
    name: "Fed H. (Quase-GTO)",
    inspiration: "estilo Fedor Holz",
    archetype: "GTO",
    description:
      "Jogo próximo de GTO, muito balanceado. Pouco explorador, poucos desvios.",
    rfiWidth: 1.05,
    threeBetFactor: 1.1,
    defendFactor: 1.0,
    cbetFactor: 1.1,
    bluffFactor: 1.05,
    aggression: 0.7,
    adaptability: 0.85,
    icmSensitivity: 0.9,
    skill: 0.97,
  },
  {
    id: "kenney",
    name: "Bryn K. (Maníaco)",
    inspiration: "estilo Bryn Kenney",
    archetype: "maníaco",
    description:
      "Extremamente agressivo, muito blefe e alta tolerância a risco.",
    rfiWidth: 1.3,
    threeBetFactor: 1.7,
    defendFactor: 1.1,
    cbetFactor: 1.3,
    bluffFactor: 1.7,
    aggression: 1.0,
    adaptability: 0.75,
    icmSensitivity: 0.4,
    skill: 0.85,
  },
  {
    id: "chidwick",
    name: "Steve C. (TAG preciso)",
    inspiration: "estilo Stephen Chidwick",
    archetype: "TAG",
    description:
      "Sólido e preciso. Poucos erros e range de abertura mais fechada.",
    rfiWidth: 0.85,
    threeBetFactor: 0.95,
    defendFactor: 0.95,
    cbetFactor: 1.05,
    bluffFactor: 0.85,
    aggression: 0.6,
    adaptability: 0.85,
    icmSensitivity: 0.9,
    skill: 0.96,
  },
  {
    id: "smith",
    name: "Dan S. (Disciplinado)",
    inspiration: "estilo Dan Smith",
    archetype: "TAG",
    description:
      "Técnico, disciplinado e racional. Baixa variância nas decisões.",
    rfiWidth: 0.95,
    threeBetFactor: 1.0,
    defendFactor: 0.95,
    cbetFactor: 1.0,
    bluffFactor: 0.9,
    aggression: 0.6,
    adaptability: 0.85,
    icmSensitivity: 0.9,
    skill: 0.93,
  },
];

export function profileById(id: string): BotProfile {
  const p = PROFILES.find((x) => x.id === id);
  if (!p) throw new Error(`Perfil desconhecido: ${id}`);
  return p;
}

/** Perfil "neutro" (base) — usado como referência de GTO e para o herói-bot. */
export const BASELINE_PROFILE: BotProfile = {
  id: "baseline",
  name: "Base (referência)",
  inspiration: "referência neutra",
  archetype: "GTO",
  description: "Perfil neutro usado como linha de base de comparação.",
  rfiWidth: 1.0,
  threeBetFactor: 1.0,
  defendFactor: 1.0,
  cbetFactor: 1.0,
  bluffFactor: 1.0,
  aggression: 0.7,
  adaptability: 0.85,
  icmSensitivity: 0.85,
  skill: 1.0,
};
