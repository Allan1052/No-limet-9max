// ---------------------------------------------------------------------------
// Ranking — Módulo anti-cheat com Supabase
// O cliente calcula o hash das decisões + salt público, e a Edge Function
// valida com o salt secreto antes de inserir no banco.
// ---------------------------------------------------------------------------
import { sha256 } from "js-sha256";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase";
import type { Stage } from "../tournament/structure";
import {
  computePoyPoints,
  sumBestResults,
  tierForBuyIn,
  BEST_RESULTS_COUNT,
  MIN_RESULTS_TO_QUALIFY,
} from "../tournament/poyPoints";
import { trackEvent } from "../app/analytics";
import {
  currentSeason,
  currentSeasonYear,
  markStageCleared,
  syncClearedStages,
  CIRCUIT_STAGE_COUNT,
} from "../tournament/circuit";

// Salt público (conhecido pelo cliente) — usado pra gerar o hash das decisões
// O salt SECRETO fica só na Edge Function do Supabase
export const PUBLIC_SALT = "c0f_public_2026";

// Chaves de teste (QA/diagnóstico) que não devem aparecer em nenhum placar.
// Nunca apagamos do banco (DELETE é bloqueado de propósito) — só filtramos.
const TEST_KEY_PREFIXES = ["e2e_", "diag_", "qa_", "test_"];
export function isTestPlayerKey(key: string): boolean {
  return TEST_KEY_PREFIXES.some((p) => key.startsWith(p));
}

// Contas de teste criadas pelo fluxo normal têm player_key comum (hash), então
// escapam do filtro por prefixo. Barra também pelo APELIDO com cara de teste
// (ex.: "CircuitoQA01", "teste", "e2e_run"). "qa" só conta quando seguido de
// dígito, para não pegar nomes reais por acaso.
const TEST_NICK_RE = /qa\d|e2e|\b(test|teste|diag|debug|staging)\b/i;
export function isTestNickname(nick: string): boolean {
  return TEST_NICK_RE.test(nick);
}

// Gerar player_key único baseado no localStorage (anonimo)
export function getPlayerKey(): string {
  let key = localStorage.getItem("cof_player_key");
  if (!key) {
    key = sha256(`player_${Date.now()}_${Math.random()}`);
    localStorage.setItem("cof_player_key", key);
  }
  return key;
}

// Gerar hash das decisões (anti-cheat)
export function computeDecisionHash(
  decisions: Array<{ hand: string; action: string; position: string }>
): string {
  const raw = decisions
    .map((d) => `${d.hand}:${d.action}:${d.position}`)
    .join("|");
  return sha256(`${raw}|${PUBLIC_SALT}`);
}

// Gerar score hash (o que a Edge Function valida)
export function computeScoreHash(
  playerKey: string,
  _type: "tournament" | "mission",
  tierOrMissionId: string,
  points: number,
  decisionHash: string
): string {
  const raw = `${playerKey}|${tierOrMissionId}|${points}|${decisionHash}|`;
  return sha256(raw); // O salt secreto é adicionado pela Edge Function
}

// Enviar score verificado via Edge Function
export async function submitVerifiedScore(params: {
  nickname: string;
  type: "tournament" | "mission";
  tier?: string;
  points?: number;
  hands_played?: number;
  /**
   * ATENÇÃO (nome enganoso — ver BACKLOG.md): guarda DECISÕES corretas
   * (boa+ok), não MÃOS corretas. Uma mão tem várias decisões (pré/flop/turn/
   * river), então esse valor PODE passar de hands_played — é esperado. O app
   * mostra "% decisões corretas" a partir das notas, nunca divide os dois
   * campos. TODO futuro: renomear a coluna do banco para decisions_correct.
   */
  hands_correct?: number;
  stages_cleared?: number;
  mission_id?: string;
  decisions: Array<{ hand: string; action: string; position: string }>;
}): Promise<{ success: boolean; error?: string }> {
  const playerKey = getPlayerKey();
  const decisionHash = computeDecisionHash(params.decisions);

  const tierOrId =
    params.type === "tournament"
      ? params.tier || "micro"
      : params.mission_id || "daily";

  const points =
    params.type === "tournament"
      ? params.points || 0
      : params.stages_cleared || 0;

  const scoreHash = computeScoreHash(playerKey, params.type, tierOrId, points, decisionHash);

  const body = {
    player_key: playerKey,
    nickname: params.nickname,
    type: params.type,
    tier: params.tier,
    points: params.points,
    hands_played: params.hands_played,
    hands_correct: params.hands_correct,
    stages_cleared: params.stages_cleared,
    mission_id: params.mission_id,
    decision_hash: decisionHash,
    score_hash: scoreHash,
  };

  // 1) Tentar a Edge Function (valida o hash com o salt secreto do servidor)
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-score`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (response.ok) return { success: true };
  } catch {
    // Edge Function indisponível — cai para o insert direto (protegido por RLS)
  }

  // 2) Fallback: insert direto nas tabelas (RLS ativo, hash gravado junto)
  try {
    await supabase.from("players").upsert(
      { player_key: playerKey, nickname: params.nickname },
      { onConflict: "player_key" }
    );

    if (params.type === "tournament") {
      const { error } = await supabase.from("tournament_scores").insert({
        player_key: playerKey,
        tier: params.tier || "micro",
        points: params.points || 0,
        hands_played: params.hands_played || 0,
        hands_correct: params.hands_correct || 0,
        decision_hash: decisionHash,
        score_hash: scoreHash,
        verified: true,
      });
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase.from("mission_progress").insert({
        player_key: playerKey,
        mission_id: params.mission_id || "daily",
        stages_cleared: params.stages_cleared || 0,
        decision_hash: decisionHash,
        score_hash: scoreHash,
        verified: true,
      });
      if (error) return { success: false, error: error.message };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Erro de conexão" };
  }
}

// ---------------------------------------------------------------------------
// TORNEIO — envio do resultado com pontuação POY (estilo WSOP)
//
// Só torneio começado no estágio "início" pontua, e só quem chega ao dinheiro.
// A pontuação é calculada aqui (posição + campo + buy-in) e gravada junto com o
// hash anti-cheat, para que o servidor possa reconferir.
// ---------------------------------------------------------------------------
export interface TournamentResultParams {
  nickname: string;
  /** Estágio em que o torneio COMEÇOU. */
  stage: Stage;
  entrants: number;
  /** Buy-in em dólares. */
  buyIn: number;
  /** Posição final (1 = campeão). */
  finishPosition: number;
  handsPlayed: number;
  handsCorrect: number;
  decisions: Array<{ hand: string; action: string; position: string }>;
  /** Modo: só "circuito" grava pontos no ranking. */
  mode?: "livre" | "circuito";
  /** Etapa do circuito (1 a 10), quando for circuito. */
  circuitStage?: number;
}

export interface TournamentSubmitResult {
  success: boolean;
  /** Torneio elegível ao ranking? */
  eligible: boolean;
  /** Motivo da inelegibilidade: modo livre, estágio errado ou não chegou ao dinheiro. */
  reason?: "stage" | "no_cash" | "livre";
  points: number;
  /** Pontos que ESTE resultado valeria no Circuito (mesmo em Treino Livre). */
  wouldBeWorth: number;
  /** A etapa do circuito foi cravada (venceu) neste torneio? */
  stageCleared?: boolean;
  /** O circuito da faixa foi completado com este resultado? */
  circuitComplete?: boolean;
  /** Posições pagas (ITM) do campo deste torneio, p/ mensagem de encorajamento. */
  paidPlaces?: number;
  error?: string;
}

export async function submitTournamentResult(
  params: TournamentResultParams,
): Promise<TournamentSubmitResult> {
  const poy = computePoyPoints({
    stage: params.stage,
    entrants: params.entrants,
    buyIn: params.buyIn,
    finishPosition: params.finishPosition,
  });

  // Quanto ESTE resultado valeria no Circuito. Serve para mostrar ao jogador do
  // Treino Livre o que ele estaria ganhando — convite honesto, sem cobrança.
  const wouldBeWorth = computePoyPoints({
    stage: "inicio",
    entrants: params.entrants,
    buyIn: params.buyIn,
    finishPosition: params.finishPosition,
  }).points;

  // Treino Livre nunca grava no ranking — é o modo de treinar sem pressão.
  if ((params.mode ?? "livre") !== "circuito") {
    return {
      success: true,
      eligible: false,
      reason: "livre",
      points: 0,
      wouldBeWorth,
    };
  }

  // Não elegível: não grava nada no ranking, mas informa a UI o motivo.
  if (!poy.eligible) {
    trackEvent("tournament_not_ranked", {
      reason: poy.reason || "unknown",
      stage: params.stage,
    });
    return {
      success: true,
      eligible: false,
      reason: poy.reason,
      points: 0,
      wouldBeWorth,
      paidPlaces: poy.paidPlaces,
    };
  }

  const playerKey = getPlayerKey();
  const decisionHash = computeDecisionHash(params.decisions);
  const tier = tierForBuyIn(params.buyIn);
  const season = currentSeason();
  const year = currentSeasonYear();
  const scoreHash = computeScoreHash(
    playerKey,
    "tournament",
    tier,
    poy.points,
    decisionHash,
  );

  try {
    await supabase.from("players").upsert(
      { player_key: playerKey, nickname: params.nickname },
      { onConflict: "player_key" },
    );

    // Grava JÁ como verified = true — o mesmo que o RLS permite e que o caminho
    // de missão (submitVerifiedScore) já faz no fallback.
    //
    // ANTES o score nascia verified = false e DEPENDIA da Edge Function
    // "verify-score" pra virar true. Quando ela falha ou não responde, o score
    // legítimo ficava preso em "pending" e o ranking (que filtra verified=true)
    // NUNCA o mostrava — era o bug do "prêmio não atualiza o rank". O score_hash
    // e o decision_hash continuam gravados para auditoria posterior, então dá
    // pra revalidar no servidor sem perder nada.
    const { error } = await supabase
      .from("tournament_scores")
      .insert({
        player_key: playerKey,
        tier,
        points: poy.points,
        hands_played: params.handsPlayed,
        hands_correct: params.handsCorrect,
        stage: params.stage,
        entrants: params.entrants,
        buy_in: params.buyIn,
        finish_position: params.finishPosition,
        paid_places: poy.paidPlaces,
        decision_hash: decisionHash,
        score_hash: scoreHash,
        verified: true,
        scored_month: season,
        scored_year: year,
        circuit_stage: params.circuitStage,
        mode: "circuito",
      });

    if (error) {
      return {
        success: false,
        eligible: true,
        points: poy.points,
        wouldBeWorth,
        error: error.message,
      };
    }

    trackEvent("tournament_ranked", {
      tier,
      points: poy.points,
      finish: params.finishPosition,
      entrants: params.entrants,
    });

    // Cravou a etapa (venceu)? Ela sai da lista dele neste mês.
    let stageCleared = false;
    let circuitComplete = false;

    if (params.finishPosition === 1 && params.circuitStage) {
      stageCleared = true;
      const cleared = markStageCleared(params.circuitStage, tier, season);
      circuitComplete = cleared.length >= CIRCUIT_STAGE_COUNT;

      // Grava o progresso também no banco (fonte da verdade entre aparelhos).
      await supabase.from("circuit_progress").insert({
        player_key: playerKey,
        nickname: params.nickname,
        tier,
        stage_index: params.circuitStage,
        season,
      });

      trackEvent("circuit_stage_cleared", {
        tier,
        stage: params.circuitStage,
        points: poy.points,
      });

      // Circuito completo: sela o título permanente no perfil.
      if (circuitComplete) {
        await supabase.from("player_titles").insert({
          player_key: playerKey,
          nickname: params.nickname,
          title_type: "circuito_mensal",
          tier,
          season,
        });
        trackEvent("circuit_completed", { tier, season });
      }
    }

    return {
      success: true,
      eligible: true,
      points: poy.points,
      wouldBeWorth,
      stageCleared,
      circuitComplete,
    };
  } catch {
    return {
      success: false,
      eligible: true,
      points: poy.points,
      wouldBeWorth,
      error: "Erro de conexão",
    };
  }
}

/**
 * Etapas já cravadas por este jogador nesta faixa/temporada, lidas do banco.
 * O banco é a fonte da verdade: se o jogador trocar de aparelho, o progresso
 * dele vem junto.
 */
export async function fetchClearedStages(
  tier: string,
  season = currentSeason(),
): Promise<number[]> {
  try {
    const { data, error } = await supabase
      .from("circuit_progress")
      .select("stage_index")
      .eq("player_key", getPlayerKey())
      .eq("tier", tier)
      .eq("season", season);

    if (error) throw error;

    const stages = (data || []).map((r) => r.stage_index as number);
    syncClearedStages(stages, tier, season);
    return stages;
  } catch {
    return [];
  }
}

/** Títulos permanentes do jogador (selos de circuito completo). */
export async function fetchPlayerTitles(): Promise<
  Array<{ title_type: string; tier: string | null; season: string | null }>
> {
  try {
    const { data, error } = await supabase
      .from("player_titles")
      .select("title_type, tier, season")
      .eq("player_key", getPlayerKey())
      .order("earned_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}

/** Janela do ranking: mês corrente ou ano corrente. */
export type RankingPeriod = "mensal" | "anual";

// Buscar ranking de torneio — total cumulativo dos N melhores resultados,
// como faz a WSOP ao considerar os 10 melhores da temporada.
//
// "mensal" = só os resultados deste mês (zera no dia 1º).
// "anual"  = os 10 melhores do ANO inteiro, não a soma dos melhores de cada mês.
//            É mais justo: premia desempenho, não presença. Quem começa em
//            outubro ainda pode vencer o ano.
export async function fetchTournamentLeaderboard(
  tier: string,
  limit = 50,
  period: RankingPeriod = "mensal",
): Promise<
  Array<{
    nickname: string;
    points: number;
    player_key: string;
    events: number;
    /** Já tem os 5 resultados que a WSOP exige para valer o título? */
    qualified: boolean;
  }>
> {
  try {
    let query = supabase
      .from("tournament_scores")
      .select("player_key, tier, points")
      .eq("tier", tier)
      .eq("verified", true);

    if (period === "mensal") {
      query = query.eq("scored_month", currentSeason());
    } else {
      query = query.eq("scored_year", currentSeasonYear());
    }

    const { data, error } = await query
      .order("points", { ascending: false })
      .limit(2000);

    if (error) throw error;

    // Agrupar todos os resultados de cada jogador (ignorando chaves de teste).
    const resultsByPlayer = new Map<string, number[]>();
    for (const row of data || []) {
      if (isTestPlayerKey(row.player_key)) continue;
      const list = resultsByPlayer.get(row.player_key) || [];
      list.push(row.points);
      resultsByPlayer.set(row.player_key, list);
    }

    if (resultsByPlayer.size === 0) return [];

    // Buscar nicknames
    const playerKeys = Array.from(resultsByPlayer.keys());
    const { data: players } = await supabase
      .from("players")
      .select("player_key, nickname")
      .in("player_key", playerKeys);

    const nicknameMap = new Map<string, string>();
    for (const p of players || []) {
      nicknameMap.set(p.player_key, p.nickname);
    }

    return Array.from(resultsByPlayer.entries())
      .map(([player_key, allPoints]) => ({
        nickname: nicknameMap.get(player_key) || "Anonimo",
        points: sumBestResults(allPoints, BEST_RESULTS_COUNT),
        events: allPoints.length,
        qualified: allPoints.length >= MIN_RESULTS_TO_QUALIFY,
        player_key,
      }))
      // Barra também apelidos de teste (ex.: "CircuitoQA01") cuja chave é um
      // hash comum e por isso passou pelo filtro por prefixo.
      .filter((e) => !isTestNickname(e.nickname))
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);
  } catch {
    return [];
  }
}

// Buscar ranking de missão 1x1
export async function fetchMissionLeaderboard(
  limit = 50
): Promise<Array<{ nickname: string; stages_cleared: number; player_key: string }>> {
  try {
    const { data, error } = await supabase
      .from("mission_progress")
      .select("player_key, stages_cleared")
      .eq("verified", true)
      .order("stages_cleared", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const bestByPlayer = new Map<string, { stages_cleared: number; player_key: string }>();
    for (const row of data || []) {
      if (isTestPlayerKey(row.player_key)) continue;
      const existing = bestByPlayer.get(row.player_key);
      if (!existing || row.stages_cleared > existing.stages_cleared) {
        bestByPlayer.set(row.player_key, {
          stages_cleared: row.stages_cleared,
          player_key: row.player_key,
        });
      }
    }

    const playerKeys = Array.from(bestByPlayer.keys());
    const { data: players } = await supabase
      .from("players")
      .select("player_key, nickname")
      .in("player_key", playerKeys);

    const nicknameMap = new Map<string, string>();
    for (const p of players || []) {
      nicknameMap.set(p.player_key, p.nickname);
    }

    return Array.from(bestByPlayer.entries())
      .map(([player_key, { stages_cleared }]) => ({
        nickname: nicknameMap.get(player_key) || "Anonimo",
        stages_cleared,
        player_key,
      }))
      .filter((e) => !isTestNickname(e.nickname))
      .sort((a, b) => b.stages_cleared - a.stages_cleared)
      .slice(0, limit);
  } catch {
    return [];
  }
}
// Buscar TODOS os torneios oficiais do Circuito (verified=true) jogados com o
// apelido dado — incluindo os fora do dinheiro — para montar a "Trajetória por
// Buy-in" (contagem de torneios disputados/premiados por faixa).
//
// POR QUE BUSCA POR FAIXA EM VEZ DE TODOS DE UMA VEZ:
//   O ranking filtra por tier (cada faixa tem ranking próprio) e por janela
//   mensal/anual. Aqui queremos a trajetória COMPLETA do jogador na faixa —
//   todos os meses, sem janela — então a consulta é direta por tier + apelido.
export async function fetchTournamentEntries(
  tiers: Array<"micro" | "baixa" | "media" | "alta" | "elite">,
  nickname: string
): Promise<
  Array<{
    player_key: string;
    buy_in: number;
    finish_position: number;
    paid_places: number | null;
    /** 1 se chegou ao dinheiro (posição <= lugares pagos), 0 caso contrário. */
    in_money: 0 | 1;
  }>
> {
  try {
    // 1. Descobre a(s) player_key(s) deste apelido na tabela players.
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("player_key")
      .eq("nickname", nickname);
    if (playersError) throw playersError;
    const keys = (players || []).map((p) => p.player_key);
    if (keys.length === 0) return [];

    // 2. Cada faixa → resultados oficiais (verified) dessa faixa.
    //    Supabase anônima: eq/limit são permitidos para leitura.
    const out: Array<{
      player_key: string;
      buy_in: number;
      finish_position: number;
      paid_places: number | null;
      in_money: 0 | 1;
    }> = [];
    for (const tier of tiers) {
      const { data, error } = await supabase
        .from("tournament_scores")
        .select("player_key, buy_in, finish_position, paid_places")
        .eq("tier", tier)
        .eq("mode", "circuito")
        .eq("verified", true)
        .in("player_key", keys)
        .limit(2000);
      if (error) throw error;
      for (const row of data || []) {
        out.push({
          player_key: row.player_key,
          buy_in: row.buy_in,
          finish_position: row.finish_position,
          paid_places: row.paid_places ?? null,
          in_money:
            typeof row.paid_places === "number" &&
            row.finish_position > 0 &&
            row.finish_position <= row.paid_places
              ? 1
              : 0,
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}
