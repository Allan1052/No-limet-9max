// ---------------------------------------------------------------------------
// ELITE SYNC — desbloqueios de elite ($1.000 / $10.300) também na nuvem.
//
// Motivo: o registro vivia só no localStorage — limpezas de cache apagavam a
// vitória e o jogador perdia o acesso à faixa elite mesmo tendo conquistado.
// Agora a conquista é espelhada na tabela `elite_wins` da Supabase (mesmo
// banco do ranking, com RLS). O app sempre une LOCAL + NUVEM: se a vitória
// existe em qualquer um dos dois, o buy-in está destravado.
//
// Isolado: não toca no motor (src/bots, src/game, src/engine, src/feedback,
// src/tournament/** — eliteUnlock.ts do motor só é LIDO, nunca escrito aqui).
// ---------------------------------------------------------------------------

import { supabase } from "./supabase";
import { getPlayerKey } from "./ranking";
import { loadEliteWins as loadEliteWinsLocal } from "../tournament/eliteUnlock";

/** Chave local adicional que espelha a nuvem (para não consultar a cada render). */
const CLOUD_MIRROR_KEY = "cof-elite-cloud";

export type EliteWins = Record<string, boolean>;

/**
 * Carrega a união de vitórias: localStorage local + espelho da nuvem.
 * O motor (eliteUnlock) continua lendo só o localStorage — o espelho é
 * mantido atualizado por `syncEliteWins()`.
 */
export function loadAllEliteWins(): EliteWins {
  try {
    const cloud: EliteWins = JSON.parse(localStorage.getItem(CLOUD_MIRROR_KEY) || "{}");
    const local = loadEliteWinsLocal();
    return { ...cloud, ...local };
  } catch {
    return loadEliteWinsLocal();
  }
}

/**
 * Sincroniza a nuvem em background (não bloqueia a UI; sem await externo).
 * Grava na Supabase as vitórias que o jogador tem localmente e puxa as que
 * estão na nuvem para o espelho local. Se a rede falhar, nada quebra.
 */
export function syncEliteWins(nickname?: string | null): void {
  if (typeof window === "undefined") return;
  const playerKey = getPlayerKey();
  const local = loadEliteWinsLocal();

  // Puxar da nuvem → espelho local
  supabase
    .from("elite_wins")
    .select("buyin")
    .eq("player_key", playerKey)
    .then(({ data, error }) => {
      if (error) return;
      const cloud: EliteWins = {};
      for (const row of data || []) cloud[String(row.buyin)] = true;
      try {
        localStorage.setItem(CLOUD_MIRROR_KEY, JSON.stringify(cloud));
      } catch {
        /* storage indisponível */
      }
    },
    () => {},
  );

  // Enviar local → nuvem (vitórias que ainda não estão lá)
  const entries = Object.keys(local).map((k) => ({
    player_key: playerKey,
    nickname: nickname || "Anonimo",
    buyin: Number(k) || 0,
  }));
  if (entries.length) {
    supabase
      .from("elite_wins")
      .upsert(entries, { onConflict: "player_key,buyin" })
      .then(undefined, () => {});
  }
}

/** Destrava na nuvem (usado pelo gate elite109 do Profile). */
export function recordEliteWinCloud(buyIn: number, nickname?: string | null): void {
  if (typeof window === "undefined") return;
  const playerKey = getPlayerKey();
  supabase
    .from("elite_wins")
    .upsert(
      { player_key: playerKey, nickname: nickname || "Anonimo", buy_in_level: String(Math.round(buyIn)) },
      { onConflict: "player_key" },
    )
    .then(
      () => {
        // Atualizar espelho local imediatamente
        try {
          const cloud: EliteWins = JSON.parse(localStorage.getItem(CLOUD_MIRROR_KEY) || "{}");
          cloud[String(Math.round(buyIn))] = true;
          localStorage.setItem(CLOUD_MIRROR_KEY, JSON.stringify(cloud));
        } catch {
          /* storage indisponível */
        }
      },
      () => {},
    );
}
