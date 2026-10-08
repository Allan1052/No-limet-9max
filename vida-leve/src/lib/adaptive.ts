import { AJUSTE_MAX_KCAL } from "./calculations";
import type { WeightLog } from "./types";

/**
 * Recálculo ADAPTATIVO: compara o ritmo real de perda com o que a conta previa
 * e ajusta as calorias em passos pequenos (±100 kcal), no máximo a cada 14 dias.
 *
 * Por que assim:
 * - O peso do dia varia 1–2 kg por água/sal; por isso usamos a INCLINAÇÃO de uma
 *   regressão linear das últimas semanas, não "peso de hoje − peso anterior".
 * - ~7700 kcal ≈ 1 kg de gordura é uma aproximação clássica; serve de régua, não
 *   de verdade absoluta — daí os passos pequenos e o intervalo mínimo.
 * - Perder mais de 1% do peso por semana de forma sustentada aumenta a perda de
 *   massa magra → o app DEVOLVE calorias.
 */

export const KCAL_POR_KG = 7700;
export const JANELA_DIAS = 35;
export const MIN_REGISTROS = 3;
export const MIN_INTERVALO_DIAS = 14;
export const PASSO_AJUSTE_KCAL = 100;
export const DIAS_ENTRE_AJUSTES = 14;
/** Abaixo desta fração do ritmo previsto, consideramos "lento". */
export const FRACAO_LENTO = 0.4;
/** Acima deste % do peso por semana, consideramos "rápido demais". */
export const PCT_SEMANA_RAPIDO = 1;

export type StatusRitmo = "dados_insuficientes" | "no_ritmo" | "lento" | "rapido";

export interface AnaliseRitmo {
  status: StatusRitmo;
  /** kg/semana observados (negativo = perdendo). null se dados insuficientes. */
  ritmo_kg_semana: number | null;
  /** kg/semana previstos pelo déficit (negativo). */
  esperado_kg_semana: number;
  /** % do peso corporal por semana (positivo = perdendo). */
  pct_peso_semana: number | null;
  /** Sugestão de ajuste nas calorias: −100, 0 ou +100. */
  sugestao_kcal: number;
  /** Explicação curta, em português, para mostrar ao usuário. */
  mensagem: string;
}

const DIA_MS = 864e5;
const diasEntre = (a: string, b: string): number => Math.round((Date.parse(b) - Date.parse(a)) / DIA_MS);
const r2 = (n: number): number => Math.round(n * 100) / 100;

/** Inclinação (kg/dia) por mínimos quadrados. */
export function inclinacao(pontos: { x: number; y: number }[]): number {
  const n = pontos.length;
  if (n < 2) return 0;
  const mx = pontos.reduce((s, p) => s + p.x, 0) / n;
  const my = pontos.reduce((s, p) => s + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of pontos) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

export function esperadoKgSemana(deficit_kcal: number): number {
  return r2(-(deficit_kcal * 7) / KCAL_POR_KG);
}

export function analisarRitmo(logs: WeightLog[], deficit_kcal: number, hoje: string): AnaliseRitmo {
  const esperado = esperadoKgSemana(deficit_kcal);
  const recentes = logs.filter((l) => diasEntre(l.data_registro, hoje) <= JANELA_DIAS);
  const primeiro = recentes[0];
  const ultimo = recentes[recentes.length - 1];
  const span = primeiro && ultimo ? diasEntre(primeiro.data_registro, ultimo.data_registro) : 0;

  if (!primeiro || !ultimo || recentes.length < MIN_REGISTROS || span < MIN_INTERVALO_DIAS) {
    return {
      status: "dados_insuficientes",
      ritmo_kg_semana: null,
      esperado_kg_semana: esperado,
      pct_peso_semana: null,
      sugestao_kcal: 0,
      mensagem: "Com 3 check-ins em pelo menos 2 semanas o app passa a ajustar o plano ao seu ritmo real.",
    };
  }

  const ritmo = r2(
    inclinacao(recentes.map((l) => ({ x: diasEntre(primeiro.data_registro, l.data_registro), y: l.peso_kg }))) * 7,
  );
  const pct = r2((-ritmo / ultimo.peso_kg) * 100);
  const fmt = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(2).replace(".", ",")} kg/sem`;

  if (pct > PCT_SEMANA_RAPIDO) {
    return {
      status: "rapido",
      ritmo_kg_semana: ritmo,
      esperado_kg_semana: esperado,
      pct_peso_semana: pct,
      sugestao_kcal: PASSO_AJUSTE_KCAL,
      mensagem: `Você está perdendo ${fmt(ritmo)} (mais de 1% do peso por semana). Rápido demais pode custar músculo — o app devolve um pouco de calorias.`,
    };
  }

  // Só faz sentido falar em "lento" quando há déficit previsto.
  if (esperado < 0 && ritmo > esperado * FRACAO_LENTO) {
    return {
      status: "lento",
      ritmo_kg_semana: ritmo,
      esperado_kg_semana: esperado,
      pct_peso_semana: pct,
      sugestao_kcal: -PASSO_AJUSTE_KCAL,
      mensagem: `Seu ritmo (${fmt(ritmo)}) está abaixo do previsto (${fmt(esperado)}). O app reduz um pouco as calorias — o gasto real costuma ser menor que a fórmula.`,
    };
  }

  return {
    status: "no_ritmo",
    ritmo_kg_semana: ritmo,
    esperado_kg_semana: esperado,
    pct_peso_semana: pct,
    sugestao_kcal: 0,
    mensagem: `Ritmo saudável: ${fmt(ritmo)} (previsto ${fmt(esperado)}). Plano mantido.`,
  };
}

export interface DecisaoAjuste {
  novo_ajuste_kcal: number;
  aplicado: boolean;
  motivo: string;
}

/** Decide se aplica o ajuste agora (respeita intervalo mínimo e limites). */
export function decidirAjuste(
  analise: AnaliseRitmo,
  ajusteAtual: number,
  ultimoAjusteEm: string | null,
  hoje: string,
  emManutencao: boolean,
): DecisaoAjuste {
  if (emManutencao) {
    return { novo_ajuste_kcal: 0, aplicado: ajusteAtual !== 0, motivo: "Plano em manutenção: sem ajuste de déficit." };
  }
  if (analise.sugestao_kcal === 0) {
    return { novo_ajuste_kcal: ajusteAtual, aplicado: false, motivo: analise.mensagem };
  }
  if (ultimoAjusteEm && diasEntre(ultimoAjusteEm, hoje) < DIAS_ENTRE_AJUSTES) {
    const faltam = DIAS_ENTRE_AJUSTES - diasEntre(ultimoAjusteEm, hoje);
    return {
      novo_ajuste_kcal: ajusteAtual,
      aplicado: false,
      motivo: `${analise.mensagem} (Próximo ajuste possível em ${faltam} dia(s), para dar tempo de o corpo responder.)`,
    };
  }
  const novo = Math.max(-AJUSTE_MAX_KCAL, Math.min(AJUSTE_MAX_KCAL, ajusteAtual + analise.sugestao_kcal));
  if (novo === ajusteAtual) {
    return {
      novo_ajuste_kcal: ajusteAtual,
      aplicado: false,
      motivo: `${analise.mensagem} O ajuste já está no limite (±${AJUSTE_MAX_KCAL} kcal) — vale conversar com um nutricionista.`,
    };
  }
  return { novo_ajuste_kcal: novo, aplicado: true, motivo: analise.mensagem };
}

/**
 * Linha de tendência (média móvel exponencial). Suaviza a variação diária para
 * mostrar a direção real. Começa no primeiro valor.
 */
export function tendencia(valores: number[], alfa = 0.35): number[] {
  const out: number[] = [];
  let atual: number | undefined;
  for (const v of valores) {
    atual = atual === undefined ? v : atual + alfa * (v - atual);
    out.push(Math.round(atual * 10) / 10);
  }
  return out;
}
