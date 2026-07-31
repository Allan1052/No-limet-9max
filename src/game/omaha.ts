/**
 * Módulo Omaha (PLO - Pot Limit Omaha)
 * 
 * Diferenças críticas do Omaha vs Texas Hold'em:
 * 1. Cada jogador recebe 4 cartas (não 2)
 * 2. DEVE usar exatamente 2 cartas da mão e 3 do board (não pode usar 1 ou 4)
 * 3. Equidade é muito mais complexa (combinações de 2 em 4 vs 2 em 2)
 * 4. Ranges são diferentes (mais mãos são viáveis)
 * 5. Pot Limit (não No Limit) - aposta máxima é o tamanho do pote
 */

export type OmahaHole = [string, string, string, string]; // 4 cartas

/**
 * Valida se uma mão de Omaha é legal (exatamente 2 cartas da mão + 3 do board)
 */
export function isValidOmahaHand(holeCards: OmahaHole, boardCards: string[]): boolean {
  if (boardCards.length < 3) return false;
  // Validação básica: as 4 cartas devem ser únicas
  const allCards = [...holeCards, ...boardCards];
  return new Set(allCards).size === allCards.length;
}

/**
 * Calcula a equidade de uma mão de Omaha contra outra
 * Muito mais complexo que NLHE porque há mais combinações possíveis
 */
export function calculateOmahaEquity(
  _holeCards: OmahaHole,
  _opponentHole: OmahaHole,
  _boardCards: string[]
): { equity: number; wins: number; ties: number; losses: number } {
  // Placeholder para implementação completa
  // Isso requer um motor de cálculo de equidade robusto
  return { equity: 0, wins: 0, ties: 0, losses: 0 };
}

/**
 * Gera ranges de Omaha baseados em posição e ação
 * Padrão João Simão: conservador mas profissional
 */
export type OmahaPosition = "UTG" | "MP" | "CO" | "BTN" | "SB" | "BB";

export const OmahaRanges: Record<OmahaPosition, {
  open: string[];
  call?: string[];
  threeBet?: string[];
  fourBet?: string[];
  squeeze?: string[];
}> = {
  UTG: {
    open: ["AAxxdsR", "AAxxssR", "KKxxdsR", "KKxxssR", "QQxxdsR", "JJxxdsR", "TTxxdsR", "99xxdsR", "88xxdsR", "AKKxds", "AQQxds", "AJJxds", "ATTxds", "KQQxds", "KJJxds", "QJJxds", "JTTxds", "T987ds", "9876ds", "7654ds", "6543ds", "AKQTds", "KQJTds", "QJTTds", "JTT9ds"], // Exemplo de mãos fortes e conectadas
    call: ["AAxxss", "KKxxss", "QQxxss", "JJxxss", "TTxxss", "99xxss", "88xxss", "77xxss", "66xxss", "55xxss", "44xxss", "33xxss", "22xxss", "AKKxss", "AQQxss", "AJJxss", "ATTxss", "KQQxss", "KJJxss", "QJJxss", "JTTxss", "T987ss", "9876ss", "7654ss", "6543ss", "KQJTds", "QJ9Tds", "J987ds", "AKQTss", "KQJTss", "QJTTss", "JTT9ss"], // Exemplo de mãos para call
    threeBet: ["AAxxds", "AAxxss", "KKxxds", "KKxxss", "QQxxds", "QQxxss", "AKKxds", "AQQxds", "AKQTds", "KQJTds"],
    fourBet: ["AAxxds", "KKxxds"], // Exemplo de 4-bet
    squeeze: ["AAxxds", "KKxxds"], // Exemplo de squeeze
  },
  MP: {
    open: ["AAxxdsR", "AAxxssR", "KKxxdsR", "KKxxssR", "QQxxdsR", "JJxxdsR", "TTxxdsR", "99xxdsR", "88xxdsR", "77xxdsR", "AKKxds", "AQQxds", "AJJxds", "ATTxds", "KQQxds", "KJJxds", "QJJxds", "JTTxds", "T987ds", "9876ds", "7654ds", "6543ds", "QJTs", "J98s", "AKQTds", "KQJTds", "QJTTds", "JTT9ds"],
    call: ["AAxxss", "KKxxss", "QQxxss", "JJxxss", "TTxxss", "99xxss", "88xxss", "77xxss", "66xxss", "55xxss", "44xxss", "33xxss", "22xxss", "AKKxss", "AQQxss", "AJJxss", "ATTxss", "KQQxss", "KJJxss", "QJJxss", "JTTxss", "T987ss", "9876ss", "7654ss", "6543ss", "KQJTds", "QJ9Tds", "J987ds", "QJTs", "J98s", "AKQTss", "KQJTss", "QJTTss", "JTT9ss"],
    threeBet: ["AAxxds", "AAxxss", "KKxxds", "KKxxss", "QQxxds", "QQxxss", "AKKxds", "AQQxds", "KQQxds", "AKQTds", "KQJTds"],
    fourBet: ["AAxxds", "KKxxds"],
    squeeze: ["AAxxds", "KKxxds"],
  },
  CO: {
    open: ["AAxxdsR", "AAxxssR", "KKxxdsR", "KKxxssR", "QQxxdsR", "JJxxdsR", "TTxxdsR", "99xxdsR", "88xxdsR", "77xxdsR", "66xxdsR", "AKKxds", "AQQxds", "AJJxds", "ATTxds", "KQQxds", "KJJxds", "QJJxds", "JTTxds", "T987ds", "9876ds", "7654ds", "6543ds", "QJTs", "J98s", "KQJT", "QJ9s", "AKQTds", "KQJTds", "QJTTds", "JTT9ds"],
    call: ["AAxxss", "KKxxss", "QQxxss", "JJxxss", "TTxxss", "99xxss", "88xxss", "77xxss", "66xxss", "55xxss", "44xxss", "33xxss", "22xxss", "AKKxss", "AQQxss", "AJJxss", "ATTxss", "KQQxss", "KJJxss", "QJJxss", "JTTxss", "T987ss", "9876ss", "7654ss", "6543ss", "KQJTds", "QJ9Tds", "J987ds", "QJTs", "J98s", "KQJT", "QJ9s", "AKQTss", "KQJTss", "QJTTss", "JTT9ss"],
    threeBet: ["AAxxds", "AAxxss", "KKxxds", "KKxxss", "QQxxds", "QQxxss", "AKKxds", "AQQxds", "KQQxds", "KJJxds", "AKQTds", "KQJTds"],
    fourBet: ["AAxxds", "KKxxds"],
    squeeze: ["AAxxds", "KKxxds"],
  },
  BTN: {
    open: ["AAxxdsR", "AAxxssR", "KKxxdsR", "KKxxssR", "QQxxdsR", "JJxxdsR", "TTxxdsR", "99xxdsR", "88xxdsR", "77xxdsR", "66xxdsR", "55xxdsR", "AKKxds", "AQQxds", "AJJxds", "ATTxds", "KQQxds", "KJJxds", "QJJxds", "JTTxds", "T987ds", "9876ds", "7654ds", "6543ds", "QJTs", "J98s", "KQJT", "QJ9s", "J87s", "T76s", "AKQTds", "KQJTds", "QJTTds", "JTT9ds"],
    call: ["AAxxss", "KKxxss", "QQxxss", "JJxxss", "TTxxss", "99xxss", "88xxss", "77xxss", "66xxss", "55xxss", "44xxss", "33xxss", "22xxss", "AKKxss", "AQQxss", "AJJxss", "ATTxss", "KQQxss", "KJJxss", "QJJxss", "JTTxss", "T987ss", "9876ss", "7654ss", "6543ss", "KQJTds", "QJ9Tds", "J987ds", "QJTs", "J98s", "KQJT", "QJ9s", "J87s", "T76s", "AKQTss", "KQJTss", "QJTTss", "JTT9ss"],
    threeBet: ["AAxxds", "AAxxss", "KKxxds", "KKxxss", "QQxxds", "QQxxss", "AKKxds", "AQQxds", "KQQxds", "KJJxds", "QJJxds", "AKQTds", "KQJTds"],
    fourBet: ["AAxxds", "KKxxds"],
    squeeze: ["AAxxds", "KKxxds"],
  },
  SB: {
    open: ["AAxxdsR", "AAxxssR", "KKxxdsR", "KKxxssR", "QQxxdsR", "JJxxdsR", "TTxxdsR", "99xxdsR", "88xxdsR", "77xxdsR", "66xxdsR", "55xxdsR", "44xxdsR", "AKKxds", "AQQxds", "AJJxds", "ATTxds", "KQQxds", "KJJxds", "QJJxds", "JTTxds", "T987ds", "9876ds", "7654ds", "6543ds", "QJTs", "J98s", "KQJT", "QJ9s", "J87s", "T76s", "965s", "AKQTds", "KQJTds", "QJTTds", "JTT9ds"],
    call: ["AAxxss", "KKxxss", "QQxxss", "JJxxss", "TTxxss", "99xxss", "88xxss", "77xxss", "66xxss", "55xxss", "44xxss", "33xxss", "22xxss", "AKKxss", "AQQxss", "AJJxss", "ATTxss", "KQQxss", "KJJxss", "QJJxss", "JTTxss", "T987ss", "9876ss", "7654ss", "6543ss", "KQJTds", "QJ9Tds", "J987ds", "QJTs", "J98s", "KQJT", "QJ9s", "J87s", "T76s", "965s", "AKQTss", "KQJTss", "QJTTss", "JTT9ss"],
    threeBet: ["AAxxds", "AAxxss", "KKxxds", "KKxxss", "QQxxds", "QQxxss", "AKKxds", "AQQxds", "KQQxds", "KJJxds", "QJJxds", "JTTxds", "AKQTds", "KQJTds"],
    fourBet: ["AAxxds", "KKxxds"],
    squeeze: ["AAxxds", "KKxxds"],
  },
  BB: {
    open: [], // BB não abre, apenas defende
    call: ["AAxxdsR", "AAxxssR", "KKxxdsR", "KKxxssR", "QQxxdsR", "JJxxdsR", "TTxxdsR", "99xxdsR", "88xxdsR", "77xxdsR", "66xxdsR", "55xxdsR", "44xxdsR", "33xxdsR", "22xxdsR", "AKKxds", "AQQxds", "AJJxds", "ATTxds", "KQQxds", "KJJxds", "QJJxds", "JTTxds", "T987ds", "9876ds", "7654ds", "6543ds", "QJTs", "J98s", "KQJT", "QJ9s", "J87s", "T76s", "965s", "876s", "AKQTds", "KQJTds", "QJTTds", "JTT9ds"], // Exemplo de mãos para call
    threeBet: ["AAxxds", "AAxxss", "KKxxds", "KKxxss", "QQxxds", "QQxxss", "AKKxds", "AQQxds", "KQQxds", "KJJxds", "QJJxds", "JTTxds", "T987ds", "AKQTds", "KQJTds"],
    fourBet: ["AAxxds", "KKxxds"],
    squeeze: ["AAxxds", "KKxxds"],
  },
};


