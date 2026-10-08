import type { NovoAlimento } from "./types";

/**
 * Atalhos de alimentos comuns no Brasil. Valores APROXIMADOS, calculados a
 * partir da Tabela Brasileira de Composição de Alimentos (TACO/Unicamp, 4ª ed.)
 * para a porção indicada; o whey usa um rótulo típico (varia por marca).
 * Servem para estimar o dia, não para contagem clínica.
 */
export interface AlimentoCatalogo extends NovoAlimento {
  id: string;
  porcao: string;
  emoji: string;
}

export const ALIMENTOS: readonly AlimentoCatalogo[] = [
  { id: "ovo", emoji: "🥚", nome: "Ovo cozido", porcao: "1 unidade (50 g)", proteina_g: 7, calorias: 73 },
  { id: "frango", emoji: "🍗", nome: "Peito de frango grelhado", porcao: "100 g (1 filé médio)", proteina_g: 32, calorias: 159 },
  { id: "patinho", emoji: "🥩", nome: "Carne (patinho) grelhada", porcao: "100 g", proteina_g: 36, calorias: 219 },
  { id: "atum", emoji: "🐟", nome: "Atum em conserva", porcao: "1/2 lata (60 g)", proteina_g: 16, calorias: 100 },
  { id: "feijao", emoji: "🫘", nome: "Feijão carioca", porcao: "1 concha (86 g)", proteina_g: 4, calorias: 65 },
  { id: "lentilha", emoji: "🥣", nome: "Lentilha cozida", porcao: "1 concha (100 g)", proteina_g: 6, calorias: 93 },
  { id: "arroz", emoji: "🍚", nome: "Arroz branco", porcao: "4 colheres de sopa (100 g)", proteina_g: 3, calorias: 128 },
  { id: "leite", emoji: "🥛", nome: "Leite integral", porcao: "1 copo (200 ml)", proteina_g: 6, calorias: 120 },
  { id: "iogurte", emoji: "🍶", nome: "Iogurte natural", porcao: "1 pote (170 g)", proteina_g: 7, calorias: 87 },
  { id: "queijo", emoji: "🧀", nome: "Queijo minas frescal", porcao: "1 fatia (30 g)", proteina_g: 5, calorias: 79 },
  { id: "pao", emoji: "🥖", nome: "Pão francês", porcao: "1 unidade (50 g)", proteina_g: 4, calorias: 150 },
  { id: "whey", emoji: "🥤", nome: "Whey protein", porcao: "1 dose (30 g)", proteina_g: 24, calorias: 120 },
  { id: "banana", emoji: "🍌", nome: "Banana prata", porcao: "1 unidade (70 g)", proteina_g: 1, calorias: 69 },
];

export const FONTE_ALIMENTOS = "Valores aproximados — Tabela TACO (Unicamp). Whey: rótulo típico.";
