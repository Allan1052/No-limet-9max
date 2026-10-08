import type { FoodTotalDia, Profile, RoutineHabit, TotalDia, WeightLog } from "./types";

/** Mínimo de missões feitas para o dia contar na sequência. */
export const MISSOES_PARA_CONTAR = 3;

const DIA_MS = 864e5;

export function diaAnterior(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d) - DIA_MS);
  return dt.toISOString().slice(0, 10);
}

/**
 * Sequência atual de dias cumpridos. Se HOJE ainda não foi cumprido, a
 * sequência não quebra — conta até ontem (o dia ainda não acabou).
 */
export function sequenciaAtual(diasOk: ReadonlySet<string>, hoje: string): number {
  let dia = diasOk.has(hoje) ? hoje : diaAnterior(hoje);
  let n = 0;
  while (diasOk.has(dia)) {
    n++;
    dia = diaAnterior(dia);
  }
  return n;
}

/** Maior sequência já feita. */
export function melhorSequencia(diasOk: ReadonlySet<string>): number {
  let melhor = 0;
  for (const d of diasOk) {
    if (diasOk.has(diaAnterior(d))) continue; // não é início de sequência
    let n = 0;
    let dia = d;
    while (diasOk.has(dia)) {
      n++;
      const [y, m, dd] = dia.split("-").map(Number) as [number, number, number];
      dia = new Date(Date.UTC(y, m - 1, dd) + DIA_MS).toISOString().slice(0, 10);
    }
    melhor = Math.max(melhor, n);
  }
  return melhor;
}

export function diasAguaOk(totais: readonly TotalDia[], meta: number): Set<string> {
  return new Set(totais.filter((t) => meta > 0 && t.total >= meta).map((t) => t.data));
}

export function diasProteinaOk(totais: readonly FoodTotalDia[], meta: number): Set<string> {
  return new Set(totais.filter((t) => meta > 0 && t.proteina_g >= meta).map((t) => t.data));
}

/** Dias com pelo menos 3 missões concluídas (ou todas, se houver menos de 3). */
export function diasMissoesOk(historico: readonly RoutineHabit[]): Set<string> {
  const porDia = new Map<string, { feitas: number; total: number }>();
  for (const h of historico) {
    const d = porDia.get(h.data) ?? { feitas: 0, total: 0 };
    d.total++;
    if (h.concluido_hoje) d.feitas++;
    porDia.set(h.data, d);
  }
  const ok = new Set<string>();
  for (const [data, { feitas, total }] of porDia) {
    if (feitas >= Math.min(MISSOES_PARA_CONTAR, total) && feitas > 0) ok.add(data);
  }
  return ok;
}

export interface Conquista {
  id: string;
  emoji: string;
  titulo: string;
  descricao: string;
  desbloqueada: boolean;
  /** Ex.: "3/7" para mostrar quanto falta. */
  progresso?: string;
}

export interface DadosConquistas {
  profile: Profile;
  pesos: readonly WeightLog[];
  agua: readonly TotalDia[];
  missoes: readonly RoutineHabit[];
  comida: readonly FoodTotalDia[];
}

export interface ResumoSequencias {
  agua: number;
  missoes: number;
  proteina: number;
  melhorAgua: number;
  melhorMissoes: number;
  melhorProteina: number;
}

export function calcularSequencias(d: DadosConquistas, hoje: string): ResumoSequencias {
  const agua = diasAguaOk(d.agua, d.profile.meta_agua_ml);
  const missoes = diasMissoesOk(d.missoes);
  const proteina = diasProteinaOk(d.comida, d.profile.meta_proteina_g);
  return {
    agua: sequenciaAtual(agua, hoje),
    missoes: sequenciaAtual(missoes, hoje),
    proteina: sequenciaAtual(proteina, hoje),
    melhorAgua: melhorSequencia(agua),
    melhorMissoes: melhorSequencia(missoes),
    melhorProteina: melhorSequencia(proteina),
  };
}

const min = (a: number, b: number) => Math.min(a, b);

export function calcularConquistas(d: DadosConquistas, hoje: string): Conquista[] {
  const s = calcularSequencias(d, hoje);
  const perdido = Math.round((d.profile.peso_inicial - d.profile.peso_atual) * 10) / 10;
  const pctPerdido = (perdido / d.profile.peso_inicial) * 100;
  const totalMissoes = d.missoes.filter((m) => m.concluido_hoje).length;
  const agua = diasAguaOk(d.agua, d.profile.meta_agua_ml);
  const proteina = diasProteinaOk(d.comida, d.profile.meta_proteina_g);
  const missoesOk = new Set(
    [...diasMissoesOk(d.missoes)].filter((dia) => d.missoes.filter((m) => m.data === dia).every((m) => m.concluido_hoje)),
  );
  const diaPerfeito = [...agua].some((dia) => proteina.has(dia) && missoesOk.has(dia));
  const kg = (n: number) => `${Math.max(0, perdido).toString().replace(".", ",")}/${n} kg`;

  const lista: (Omit<Conquista, "desbloqueada"> & { ok: boolean })[] = [
    { id: "comecou", emoji: "🌱", titulo: "Primeiro passo", descricao: "Criou seu plano", ok: true },
    { id: "checkin_1", emoji: "⚖️", titulo: "Primeira pesagem", descricao: "Fez o primeiro check-in", ok: d.pesos.length >= 1 },
    {
      id: "checkin_4",
      emoji: "📈",
      titulo: "Constância",
      descricao: "4 check-ins de peso",
      ok: d.pesos.length >= 4,
      progresso: `${min(d.pesos.length, 4)}/4`,
    },
    { id: "kg_1", emoji: "🎯", titulo: "Primeiro quilo", descricao: "Perdeu 1 kg", ok: perdido >= 1, progresso: kg(1) },
    { id: "kg_3", emoji: "🏅", titulo: "Três quilos", descricao: "Perdeu 3 kg", ok: perdido >= 3, progresso: kg(3) },
    {
      id: "pct_5",
      emoji: "🏆",
      titulo: "5% do peso",
      descricao: "Perdeu 5% do peso inicial — já traz benefícios à saúde",
      ok: pctPerdido >= 5,
      progresso: `${Math.max(0, pctPerdido).toFixed(1).replace(".", ",")}/5%`,
    },
    { id: "pct_10", emoji: "👑", titulo: "10% do peso", descricao: "Perdeu 10% do peso inicial", ok: pctPerdido >= 10 },
    { id: "agua_3", emoji: "💧", titulo: "Hidratado", descricao: "3 dias seguidos batendo a meta de água", ok: s.melhorAgua >= 3, progresso: `${min(s.melhorAgua, 3)}/3` },
    { id: "agua_7", emoji: "🌊", titulo: "Semana de água", descricao: "7 dias seguidos de meta de água", ok: s.melhorAgua >= 7, progresso: `${min(s.melhorAgua, 7)}/7` },
    { id: "agua_30", emoji: "🐳", titulo: "Mês de água", descricao: "30 dias seguidos de meta de água", ok: s.melhorAgua >= 30, progresso: `${min(s.melhorAgua, 30)}/30` },
    {
      id: "missoes_7",
      emoji: "🔥",
      titulo: "Semana ativa",
      descricao: "7 dias seguidos com 3+ missões",
      ok: s.melhorMissoes >= 7,
      progresso: `${min(s.melhorMissoes, 7)}/7`,
    },
    {
      id: "missoes_50",
      emoji: "⭐",
      titulo: "50 missões",
      descricao: "Concluiu 50 missões no total",
      ok: totalMissoes >= 50,
      progresso: `${min(totalMissoes, 50)}/50`,
    },
    {
      id: "proteina_7",
      emoji: "💪",
      titulo: "Proteína em dia",
      descricao: "7 dias seguidos batendo a proteína",
      ok: s.melhorProteina >= 7,
      progresso: `${min(s.melhorProteina, 7)}/7`,
    },
    { id: "dia_perfeito", emoji: "✨", titulo: "Dia perfeito", descricao: "Água, proteína e todas as missões no mesmo dia", ok: diaPerfeito },
  ];

  return lista.map(({ ok, ...c }) => ({ ...c, desbloqueada: ok }));
}
