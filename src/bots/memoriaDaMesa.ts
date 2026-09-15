// ---------------------------------------------------------------------------
// A MESA NÃO TE ESQUECE — evolução que roda no seu bolso, de graça.
//
// ✨ 15/09/2026. O Allan pediu bots com evolução automática, "cada bot usando o
// outro pra evoluir". Construí esse motor (bots/evolucao.ts + sim/evoluir.ts),
// rodei, e MEDI que ele não fecha a conta com o tempo de máquina que temos —
// os números e o porquê estão em sim/evDeixadoNaMesa.ts. Em resumo: fichas
// ganhas são decisão + sorte, e separar as duas exige milhões de mãos por
// candidato.
//
// Mas existe uma segunda leitura do pedido dele, e essa funciona: o que ele
// quer sentir é **a mesa ficando mais difícil a cada sessão**. Para isso os
// bots não precisam evoluir uns contra os outros. Precisam evoluir CONTRA ELE —
// e o sinal para isso não tem ruído nenhum, porque é o próprio jogo dele.
//
// Custo: zero simulação. O dossiê que o app já monta durante a sessão
// (bots/leituraDoHeroi.ts) passa a SOBREVIVER entre sessões. Na terceira noite
// de jogo, a mesa já sabe como você joga desde a primeira mão — como acontece
// quando você é regular de uma sala.
//
// ⚠️ Continua valendo: os bots leem o seu HISTÓRICO DE AÇÕES. Nenhum deles
// olha carta fechada, nem agora nem nunca.
// ---------------------------------------------------------------------------

import { dossieVazio, type DossieDoHeroi } from "./leituraDoHeroi";

const CHAVE = "cof_memoria_mesa";
/** Acima disto o dossiê para de crescer e passa a andar com você (média móvel):
 *  quem melhora deixa de ser lido pelo jogador que era. */
const TETO_DE_MAOS = 600;

export interface MemoriaDaMesa {
  dossie: DossieDoHeroi;
  /** Torneios em que este jogador já sentou (cada torneio é um "sentar"). */
  sessoes: number;
  /** Última gravação (ms) — para o dossiê envelhecer se ele sumir por meses. */
  quando: number;
}

export function memoriaVazia(): MemoriaDaMesa {
  return { dossie: dossieVazio(), sessoes: 0, quando: Date.now() };
}

/** Depois disto o jogo de meses atrás não diz mais nada sobre você. */
export const VALIDADE_DIAS = 90;

export function carregar(agora = Date.now()): MemoriaDaMesa {
  try {
    const cru = localStorage.getItem(CHAVE);
    if (!cru) return memoriaVazia();
    const m = JSON.parse(cru) as MemoriaDaMesa;
    if (!m?.dossie || typeof m.dossie.maos !== "number") return memoriaVazia();
    if (agora - (m.quando ?? 0) > VALIDADE_DIAS * 24 * 60 * 60 * 1000) return memoriaVazia();
    return m;
  } catch {
    return memoriaVazia();
  }
}

export function gravar(m: MemoriaDaMesa): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ ...m, quando: Date.now() }));
  } catch {
    // Armazenamento cheio ou bloqueado: a memória é um extra e não pode
    // derrubar a mesa. O jogo segue com o dossiê só da sessão.
  }
}

/**
 * Junta o que aconteceu nesta sessão com o que a mesa já sabia.
 *
 * Usa média móvel com teto: o dossiê não vira um arquivo eterno que prende o
 * jogador ao que ele era há um ano. Quem corrige um vazamento é lido de novo
 * dentro de algumas centenas de mãos — como acontece numa sala de verdade.
 */
export function juntar(antiga: DossieDoHeroi, sessao: DossieDoHeroi): DossieDoHeroi {
  const somar = (a: number, b: number) => a + b;
  const bruto: DossieDoHeroi = {
    maos: somar(antiga.maos, sessao.maos),
    vpip: sessao.maos > 0 ? sessao.vpip : antiga.vpip,
    pfr: sessao.maos > 0 ? sessao.pfr : antiga.pfr,
    threeBet: sessao.maos > 0 ? sessao.threeBet : antiga.threeBet,
    flopsComAposta: somar(antiga.flopsComAposta, sessao.flopsComAposta),
    flopsLargados: somar(antiga.flopsLargados, sessao.flopsLargados),
    passouEEnfrentou: somar(antiga.passouEEnfrentou, sessao.passouEEnfrentou),
    checkRaisesDele: somar(antiga.checkRaisesDele, sessao.checkRaisesDele),
  };
  if (bruto.maos <= TETO_DE_MAOS) return bruto;

  // Passou do teto: encolhe tudo na mesma proporção. As FREQUÊNCIAS ficam
  // iguais, o peso do passado é que diminui.
  const f = TETO_DE_MAOS / bruto.maos;
  return {
    ...bruto,
    maos: TETO_DE_MAOS,
    flopsComAposta: Math.round(bruto.flopsComAposta * f),
    flopsLargados: Math.round(bruto.flopsLargados * f),
    passouEEnfrentou: Math.round(bruto.passouEEnfrentou * f),
    checkRaisesDele: Math.round(bruto.checkRaisesDele * f),
  };
}

/**
 * Quanto a mesa te conhece (0..1).
 *
 * É o que a tela mostra para o jogador entender por que está mais difícil — e
 * o que dá sentido à sensação de "cada vez mais duro". Satura em 300 mãos, que
 * é quando a leitura de um jogador já está formada.
 */
export function oQuantoTeConhece(d: DossieDoHeroi): number {
  return Math.max(0, Math.min(1, d.maos / 300));
}

/** Frase curta sobre o estágio da leitura, para a tela. */
export function comoAMesaTeVe(m: MemoriaDaMesa): string {
  const c = oQuantoTeConhece(m.dossie);
  const t = m.sessoes === 1 ? "1 torneio" : `${m.sessoes} torneios`;
  if (m.dossie.maos < 30) return "A mesa ainda não te conhece.";
  if (c < 0.4) return `A mesa começou a te ler (${m.dossie.maos} mãos observadas).`;
  if (c < 0.8) return `A mesa já tem leitura sua (${m.dossie.maos} mãos em ${t}).`;
  return `A mesa te conhece bem — ${m.dossie.maos} mãos em ${t}. Eles vão jogar em cima do seu padrão.`;
}
