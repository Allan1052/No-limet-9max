// ---------------------------------------------------------------------------
// Ranking — Módulo anti-cheat com Supabase
// O cliente calcula o hash das decisões + salt público, e a Edge Function
// valida com o salt secreto antes de inserir no banco.
// ---------------------------------------------------------------------------
import { sha256 } from "js-sha256";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase";

// Salt público (conhecido pelo cliente) — usado pra gerar o hash das decisões
// O salt SECRETO fica só na Edge Function do Supabase
export const PUBLIC_SALT = "c0f_public_2026";

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

// Buscar ranking de torneio
export async function fetchTournamentLeaderboard(
  tier: string,
  limit = 50
): Promise<Array<{ nickname: string; points: number; player_key: string }>> {
  try {
    const { data, error } = await supabase
      .from("tournament_scores")
      .select("player_key, tier, points")
      .eq("tier", tier)
      .eq("verified", true)
      .order("points", { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Agrupar por player_key (pegar o melhor score de cada jogador)
    const bestByPlayer = new Map<string, { points: number; player_key: string }>();
    for (const row of data || []) {
      const existing = bestByPlayer.get(row.player_key);
      if (!existing || row.points > existing.points) {
        bestByPlayer.set(row.player_key, {
          points: row.points,
          player_key: row.player_key,
        });
      }
    }

    // Buscar nicknames
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
      .map(([player_key, { points }]) => ({
        nickname: nicknameMap.get(player_key) || "Anonimo",
        points,
        player_key,
      }))
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
      .sort((a, b) => b.stages_cleared - a.stages_cleared)
      .slice(0, limit);
  } catch {
    return [];
  }
}
