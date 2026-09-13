// ---------------------------------------------------------------------------
// "JOGAR SOZINHO" — o placar que mede o Allan, e não a dica.
//
// Pedido dele em 13/09/2026, com a frase que resume tudo: "quando for jogar
// torneios de verdade não terei essas dicas aparecendo".
//
// O PROBLEMA QUE ISTO RESOLVE. O motor já avaliava TODA decisão — com a dica na
// tela ou sem ela. Só que o app somava as duas coisas num número só. Acertar
// com a dica aberta não prova que você sabe jogar; prova que você sabe ler uma
// dica. Todo número de precisão do app estava inflado por ajuda, e respondia
// uma pergunta que ninguém fez.
//
// A REGRA DURA. Uma decisão só entra como "sozinho" quando a mão INTEIRA correu
// sem dica. Ligou a dica no meio da mão? A mão toda vira "com dica" — não só o
// lance. É severo de propósito: um placar que mede o jogador não pode aceitar
// uma espiada.
//
// SEM AMOSTRA, SEM NÚMERO. Abaixo do mínimo o relatório não devolve
// porcentagem nenhuma — devolve quantas decisões ainda faltam. É a regra da
// casa de sempre, e aqui ela importa mais do que nunca: este é o número que o
// Allan vai usar para julgar o próprio jogo.
// ---------------------------------------------------------------------------

const KEY = "cof-sozinho-v1";

/** Decisões sem dica necessárias para o app arriscar uma porcentagem. */
export const AMOSTRA_MINIMA = 30;

export interface Lado {
  total: number;
  certas: number;
}

export interface PlacarSozinho {
  sozinho: Lado;
  comDica: Lado;
}

export interface RelatorioSozinho {
  /** Já há decisões sem dica suficientes para mostrar um número? */
  amostraSuficiente: boolean;
  /** Quantas decisões sem dica ainda faltam para o número aparecer. */
  faltam: number;
  totalSozinho: number;
  totalComDica: number;
  /** Acerto (%) jogando sozinho. `null` enquanto a amostra não fecha. */
  acertoSozinho: number | null;
  /** Acerto (%) com a dica na tela. `null` com amostra pequena do lado dele. */
  acertoComDica: number | null;
  /**
   * Quanto a dica está te carregando, em pontos (com dica − sozinho).
   * `null` quando falta um dos dois lados — comparar com o nada não é comparar.
   * Positivo = você depende da dica; perto de zero = você já joga sozinho.
   */
  distancia: number | null;
}

function vazio(): PlacarSozinho {
  return { sozinho: { total: 0, certas: 0 }, comDica: { total: 0, certas: 0 } };
}

function ehLado(v: unknown): v is Lado {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return Number.isFinite(o.total) && Number.isFinite(o.certas);
}

export function lerPlacarSozinho(): PlacarSozinho {
  try {
    const cru = localStorage.getItem(KEY);
    if (!cru) return vazio();
    const p = JSON.parse(cru) as Partial<PlacarSozinho>;
    if (!ehLado(p.sozinho) || !ehLado(p.comDica)) return vazio();
    return { sozinho: p.sozinho, comDica: p.comDica };
  } catch {
    return vazio(); // dado corrompido nunca vira número na tela
  }
}

function salvar(p: PlacarSozinho): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* sem localStorage o app continua jogando; só não guarda o placar */
  }
}

/**
 * Registra UMA decisão avaliada.
 *
 * @param semDica a mão inteira correu sem dica (ver a regra dura no topo).
 * @param correta a nota foi "boa" ou "ok".
 */
export function registrarDecisao(semDica: boolean, correta: boolean): PlacarSozinho {
  const p = lerPlacarSozinho();
  const lado = semDica ? p.sozinho : p.comDica;
  lado.total++;
  if (correta) lado.certas++;
  salvar(p);
  return p;
}

function taxa(l: Lado): number | null {
  if (l.total < AMOSTRA_MINIMA) return null;
  return Math.round((l.certas / l.total) * 100);
}

export function relatorioSozinho(p: PlacarSozinho = lerPlacarSozinho()): RelatorioSozinho {
  const acertoSozinho = taxa(p.sozinho);
  const acertoComDica = taxa(p.comDica);
  return {
    amostraSuficiente: acertoSozinho !== null,
    faltam: Math.max(0, AMOSTRA_MINIMA - p.sozinho.total),
    totalSozinho: p.sozinho.total,
    totalComDica: p.comDica.total,
    acertoSozinho,
    acertoComDica,
    distancia:
      acertoSozinho !== null && acertoComDica !== null ? acertoComDica - acertoSozinho : null,
  };
}

export function zerarPlacarSozinho(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nada a fazer */
  }
}
