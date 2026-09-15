// ---------------------------------------------------------------------------
// FILA DE REENVIO DO RANKING — nenhum resultado legítimo se perde por rede.
//
// 🐞 15/09/2026, relato do Allan: *"num desses prints mostra que não conseguiu
// falar com o servidor do ranking e os pontos não foram salvos. E não é a
// primeira vez que acontece isso."*
//
// O envio era uma tentativa ÚNICA. Falhou o Wi-Fi, o 4G oscilou, o servidor
// demorou — os pontos de um torneio inteiro morriam ali, e a tela ainda sugeria
// "dá pra repetir a etapa", ou seja: jogar tudo de novo. Para quem joga no
// celular, no sofá, com sinal instável, isso é perda garantida mais cedo ou
// mais tarde.
//
// Agora o resultado que não subiu fica GUARDADO no aparelho e é reenviado
// sozinho: ao abrir o app, ao abrir o placar e depois do próximo torneio.
//
// Regras de segurança da fila:
//   - chave de idempotência (score_hash): o mesmo resultado nunca entra duas
//     vezes, nem é enviado duas vezes;
//   - teto de itens e de idade, para a fila não virar lixo eterno;
//   - localStorage pode falhar (janela anônima, armazenamento cheio): toda
//     leitura e escrita é protegida e o app segue funcionando sem a fila.
// ---------------------------------------------------------------------------

const CHAVE = "cof_ranking_fila";
/** Mais que isto é sinal de que algo está errado no servidor, não na rede. */
export const MAX_NA_FILA = 20;
/** Resultado com mais de 30 dias não vale mais: a temporada já virou. */
export const VALIDADE_DIAS = 30;

export interface ItemDaFila<P = unknown> {
  /** Chave de idempotência — o score_hash do resultado. */
  id: string;
  /** Quando o resultado aconteceu (ms). */
  quando: number;
  /** Quantas vezes já tentamos reenviar. */
  tentativas: number;
  /** Pontos, só para a tela poder dizer quanto está guardado. */
  pontos: number;
  /** Os parâmetros originais do envio. */
  params: P;
}

function ler(): ItemDaFila[] {
  try {
    const cru = localStorage.getItem(CHAVE);
    if (!cru) return [];
    const arr = JSON.parse(cru);
    return Array.isArray(arr) ? (arr as ItemDaFila[]) : [];
  } catch {
    return [];
  }
}

function gravar(itens: ItemDaFila[]): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(itens));
  } catch {
    // Armazenamento cheio ou bloqueado: a fila é um extra, não pode derrubar
    // o app nem esconder o resultado que o jogador acabou de ver na tela.
  }
}

/** Tira o que já passou da validade e respeita o teto (mantém os mais novos). */
function limpar(itens: ItemDaFila[], agora: number): ItemDaFila[] {
  const limite = agora - VALIDADE_DIAS * 24 * 60 * 60 * 1000;
  return itens
    .filter((i) => i.quando >= limite)
    .sort((a, b) => b.quando - a.quando)
    .slice(0, MAX_NA_FILA);
}

/** Guarda um resultado que não subiu. Devolve a fila depois da inclusão. */
export function enfileirar<P>(
  id: string,
  pontos: number,
  params: P,
  agora = Date.now(),
): ItemDaFila<P>[] {
  const itens = limpar(ler(), agora);
  // Idempotência: o mesmo resultado não entra duas vezes (o jogador pode fechar
  // e reabrir a tela de resumo, e o envio é tentado de novo).
  if (itens.some((i) => i.id === id)) return itens as ItemDaFila<P>[];
  const novo: ItemDaFila = { id, quando: agora, tentativas: 0, pontos, params };
  const saida = limpar([novo, ...itens], agora);
  gravar(saida);
  return saida as ItemDaFila<P>[];
}

/** O que está guardado esperando subir. */
export function pendentes<P = unknown>(agora = Date.now()): ItemDaFila<P>[] {
  const itens = limpar(ler(), agora);
  return itens as ItemDaFila<P>[];
}

/** Quantos pontos estão guardados no aparelho, somados. */
export function pontosGuardados(agora = Date.now()): number {
  return pendentes(agora).reduce((s, i) => s + (i.pontos || 0), 0);
}

/** Esvazia a fila (usado no diagnóstico e nos testes). */
export function limparFila(): void {
  gravar([]);
}

export interface ResultadoDoReenvio {
  tentados: number;
  enviados: number;
  aindaNaFila: number;
}

/**
 * Tenta reenviar tudo o que está guardado.
 *
 * `enviar` devolve true quando o servidor aceitou. Item aceito sai da fila;
 * item recusado fica, com uma tentativa a mais no contador. Um erro lançado
 * pelo `enviar` conta como recusa — reenviar é sempre "melhor esforço" e nunca
 * pode derrubar a tela que chamou.
 */
export async function reenviarPendentes<P>(
  enviar: (params: P, item: ItemDaFila<P>) => Promise<boolean>,
  agora = Date.now(),
): Promise<ResultadoDoReenvio> {
  const itens = limpar(ler(), agora) as ItemDaFila<P>[];
  if (itens.length === 0) return { tentados: 0, enviados: 0, aindaNaFila: 0 };

  const sobraram: ItemDaFila<P>[] = [];
  let enviados = 0;
  for (const item of itens) {
    let ok = false;
    try {
      ok = await enviar(item.params, item);
    } catch {
      ok = false;
    }
    if (ok) enviados++;
    else sobraram.push({ ...item, tentativas: item.tentativas + 1 });
  }
  gravar(sobraram as ItemDaFila[]);
  return { tentados: itens.length, enviados, aindaNaFila: sobraram.length };
}
