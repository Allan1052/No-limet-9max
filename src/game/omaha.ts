/**
 * Tipos base de Omaha (PLO - Pot Limit Omaha).
 *
 * Diferenças críticas do Omaha vs Texas Hold'em:
 * 1. Cada jogador recebe 4 cartas (não 2).
 * 2. DEVE usar exatamente 2 cartas da mão + 3 do board (não pode 1 ou 4).
 * 3. Equity mais complexa (combinações 2-de-4 vs 2-de-2).
 * 4. Ranges diferentes (mais mãos viáveis).
 * 5. Pot Limit (aposta máxima = tamanho do pote).
 *
 * A avaliação de mão fica em `omahaEvaluator.ts`, a equity (Monte Carlo com a
 * regra 2+3) em `engine/equity.ts`, e o cérebro de pré-flop por FORÇA de mão em
 * `ranges/omahaPreflop.ts`.
 */

export type OmahaHole = [string, string, string, string]; // 4 cartas
