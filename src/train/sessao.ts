// ---------------------------------------------------------------------------
// O PLANO DA SESSÃO — porque a unidade do Allan não é o mês, é o DIA.
//
// 13/10/2026. Ele contou como é a vida hoje: *"no passado eu era solteiro, mais
// novo, tinha tempo. Hoje tem dois meninos, casado, dedicado ao trabalho. Jogo
// bem esporadicamente, uma vez no mês. E quando eu quero jogar, é como se você
// quisesse fazer o lucro todo num único dia."*
//
// A banca (train/banca.ts) cuida do mês. Esta peça cuida do DIA — que é o que
// ele realmente vive. E o trabalho dela é um só: tirar do resultado do dia o
// peso de veredito sobre o jogo dele.
//
// ---------------------------------------------------------------------------
// OS NÚMEROS SÃO MEDIDOS (sim/_sessaoRun.test.ts)
//
// Monte Carlo com a escada de prêmio real do motor, campo 279 (o campo médio
// real dele) e um jogador de DOIS parâmetros presos ao histórico: ITM 23,5% e
// profundidade dentro do dinheiro calibrada por bisseção (beta = 1,336).
// 200.000 sessões por tamanho.
//
// SÃO DUAS RÉGUAS, porque são dois mundos:
//   - APP: sem rake nenhum (o motor faz prizePool = buyIn × inscritos), o que
//     equivale ao ROI BRUTO medido dele, 14,54%;
//   - REAL: PokerStars, rake de 10,29% e ROI líquido de 3,84%.
//
// O veredito tem de usar a régua do mundo em que a sessão aconteceu — comparar
// um dia no app contra a faixa do dinheiro real inflaria o resultado dele em
// todo dia jogado.
//
// ⚠️ O ACHADO QUE A TELA PRECISA DIZER: no mundo REAL a MEDIANA é negativa em
// TODOS os tamanhos de sessão. Um jogador ganhador termina a sessão típica no
// vermelho, e o rake é o motivo. No app, sem rake, a mediana só vira positiva
// a partir de ~20 torneios. Nenhum dos dois números é opinião.
// ---------------------------------------------------------------------------

export type MundoDaSessao = "app" | "real";

/** [torneios, p10, p25, p50, p75, p90, vermelho%] — medidos. */
type LinhaMedida = [number, number, number, number, number, number, number];

const MEDIDO: Record<MundoDaSessao, LinhaMedida[]> = {
  app: [
    [5, -5.0, -5.0, -1.0, 2.0, 7.0, 56.2],
    [10, -7.0, -4.0, -1.0, 4.0, 12.0, 51.9],
    [15, -9.0, -6.0, -1.0, 6.0, 16.0, 50.8],
    [20, -11.0, -7.0, 0.0, 8.0, 19.0, 49.5],
    [30, -14.0, -8.0, 0.0, 11.0, 26.0, 47.2],
    [40, -16.0, -8.0, 2.0, 15.0, 34.0, 45.1],
    [60, -19.0, -9.0, 4.0, 21.0, 44.0, 42.2],
    [100, -23.0, -9.0, 9.0, 33.0, 60.0, 37.2],
  ],
  real: [
    [5, -5.5, -5.5, -1.5, 1.5, 6.5, 59.8],
    [10, -8.0, -5.0, -2.0, 3.0, 11.0, 62.9],
    [15, -10.5, -7.5, -2.5, 4.5, 14.5, 59.4],
    [20, -13.1, -9.1, -2.1, 5.9, 16.9, 60.2],
    [30, -17.1, -11.1, -3.1, 7.9, 22.9, 58.4],
    [40, -20.1, -12.1, -2.1, 10.9, 29.9, 56.9],
    [60, -25.2, -15.2, -2.2, 14.8, 37.8, 55.2],
    [100, -33.3, -19.3, -1.3, 22.7, 49.7, 52.2],
  ],
};

/** Os percentis que a tabela guarda, na ordem das colunas. */
const PERCENTIS = [10, 25, 50, 75, 90] as const;

export const MENOR_SESSAO = 5;
export const MAIOR_SESSAO = 100;

export interface FaixaDaSessao {
  torneios: number;
  mundo: MundoDaSessao;
  /** Resultado em buy-ins para cada percentil (10, 25, 50, 75, 90). */
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  /** % de sessões deste tamanho que terminam no vermelho. */
  vermelho: number;
  /** O tamanho pedido caiu fora da faixa simulada (5 a 100)? */
  foraDaFaixa: boolean;
}

function interpolar(linhas: LinhaMedida[], torneios: number): LinhaMedida {
  const n = Math.max(MENOR_SESSAO, Math.min(MAIOR_SESSAO, torneios));
  if (n <= linhas[0][0]) return linhas[0];
  const ultima = linhas[linhas.length - 1];
  if (n >= ultima[0]) return ultima;
  for (let i = 1; i < linhas.length; i++) {
    const a = linhas[i - 1];
    const b = linhas[i];
    if (n <= b[0]) {
      const t = (n - a[0]) / (b[0] - a[0]);
      return a.map((v, k) => (k === 0 ? n : v + t * (b[k] - v))) as LinhaMedida;
    }
  }
  return ultima;
}

export function faixaDaSessao(torneios: number, mundo: MundoDaSessao = "app"): FaixaDaSessao {
  const l = interpolar(MEDIDO[mundo], torneios);
  const r1 = (v: number) => Math.round(v * 10) / 10;
  return {
    torneios,
    mundo,
    p10: r1(l[1]),
    p25: r1(l[2]),
    p50: r1(l[3]),
    p75: r1(l[4]),
    p90: r1(l[5]),
    vermelho: r1(l[6]),
    foraDaFaixa: torneios < MENOR_SESSAO || torneios > MAIOR_SESSAO,
  };
}

export type OndeCaiu = "abaixo_de_tudo" | "ruim" | "normal" | "bom" | "acima_de_tudo";

export interface VereditoDaSessao {
  faixa: FaixaDaSessao;
  resultado: number;
  /** Percentil aproximado em que o resultado caiu (10 a 90), quando dá. */
  percentil?: number;
  onde: OndeCaiu;
  /** O resultado está dentro do que o acaso explica sozinho? */
  dentroDoNormal: boolean;
}

/**
 * Onde o dia dele caiu. Devolve percentil só DENTRO da faixa medida (10 a 90):
 * fora dela, "abaixo de tudo" / "acima de tudo" — extrapolar a cauda seria
 * inventar precisão que a simulação não tem.
 */
export function vereditoDaSessao(
  torneios: number,
  resultado: number,
  mundo: MundoDaSessao = "app",
): VereditoDaSessao {
  const faixa = faixaDaSessao(torneios, mundo);
  const pontos: Array<[number, number]> = [
    [faixa.p10, 10],
    [faixa.p25, 25],
    [faixa.p50, 50],
    [faixa.p75, 75],
    [faixa.p90, 90],
  ];
  let percentil: number | undefined;
  let onde: OndeCaiu;
  if (resultado < pontos[0][0]) {
    onde = "abaixo_de_tudo";
  } else if (resultado > pontos[pontos.length - 1][0]) {
    onde = "acima_de_tudo";
  } else {
    percentil = PERCENTIS[PERCENTIS.length - 1];
    for (let i = 1; i < pontos.length; i++) {
      const [v1, q1] = pontos[i - 1];
      const [v2, q2] = pontos[i];
      if (resultado <= v2) {
        const t = v2 === v1 ? 0 : (resultado - v1) / (v2 - v1);
        percentil = Math.round(q1 + t * (q2 - q1));
        break;
      }
    }
    onde = percentil <= 25 ? "ruim" : percentil >= 75 ? "bom" : "normal";
  }
  // "Dentro do normal" = entre os percentis 10 e 90. É a faixa que o acaso
  // explica sozinho, sem precisar falar do jogo de ninguém.
  return {
    faixa,
    resultado,
    percentil,
    onde,
    dentroDoNormal: resultado >= faixa.p10 && resultado <= faixa.p90,
  };
}

// ---------------------------------------------------------------------------
// A SESSÃO ABERTA — o acompanhamento, com fim (igual ao Alvo).
// ---------------------------------------------------------------------------

const KEY = "cof-sessao-v1";

export interface Sessao {
  versao: 1;
  abertaEm: string;
  /** Quantos torneios ele planejou jogar hoje. */
  planejados: number;
  /** Quantos já terminaram. */
  jogados: number;
  /** Resultado acumulado, em buy-ins. */
  resultado: number;
  /** Fechada por ele, depois de ver o veredito. */
  fechadaEm?: string;
}

function agora(): string {
  return new Date().toISOString();
}

export function carregarSessao(): Sessao | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Sessao;
    if (!s || s.versao !== 1 || typeof s.jogados !== "number") return null;
    return s;
  } catch {
    return null;
  }
}

export function salvarSessao(s: Sessao): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* sem storage a sessão não persiste — o app continua funcionando */
  }
}

export function abrirSessao(planejados: number): Sessao {
  const s: Sessao = {
    versao: 1,
    abertaEm: agora(),
    planejados: Math.max(MENOR_SESSAO, Math.min(MAIOR_SESSAO, Math.round(planejados))),
    jogados: 0,
    resultado: 0,
  };
  salvarSessao(s);
  return s;
}

export function fecharSessao(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* idem */
  }
}

/**
 * Conta um torneio terminado. `resultadoEmBuyIns` é (prêmio − inscrição) ÷
 * buy-in — positivo quando pagou mais que custou.
 *
 * Devolve `null` quando não há sessão aberta: o app funciona igual sem ela.
 */
export function registrarTorneio(resultadoEmBuyIns: number): Sessao | null {
  const s = carregarSessao();
  if (!s || s.fechadaEm) return s;
  const nova: Sessao = {
    ...s,
    jogados: s.jogados + 1,
    resultado: s.resultado + resultadoEmBuyIns,
  };
  salvarSessao(nova);
  return nova;
}

export interface ProgressoDaSessao {
  jogados: number;
  planejados: number;
  faltam: number;
  pct: number;
  completa: boolean;
  resultado: number;
}

export function progressoDaSessao(s: Sessao): ProgressoDaSessao {
  const faltam = Math.max(0, s.planejados - s.jogados);
  return {
    jogados: s.jogados,
    planejados: s.planejados,
    faltam,
    pct: Math.min(100, Math.round((s.jogados / Math.max(1, s.planejados)) * 100)),
    completa: s.jogados >= s.planejados,
    resultado: s.resultado,
  };
}
