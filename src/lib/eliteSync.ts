// ---------------------------------------------------------------------------
// ELITE SYNC — desbloqueios de elite ($1.000 / $10.300) também na nuvem.
//
// Motivo: o registro vivia só no localStorage — limpezas de cache apagavam a
// vitória e o jogador perdia o acesso à faixa elite mesmo tendo conquistado.
// Agora a conquista é espelhada na tabela `elite_wins` da Supabase (mesmo
// banco do ranking, com RLS). O app sempre une LOCAL + NUVEM: se a vitória
// existe em qualquer um dos dois, o buy-in está destravado.
//
// RECUPERAÇÃO AUTOMÁTICA (regra do Allan): quem foi CAMPEÃO de um torneio de
// $109 com 100+ jogadores do início tem direito ao $1.000. Se o registro
// local foi apagado, o sync reconhece a vitória diretamente no ranking
// (campeão, verified, stage=inicio) e destrava sozinho — o jogador nunca
// mais precisa "provar" a conquista com senha.
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
 * Marca o desbloqueio de um buy-in no espelho local (e grava o registro local
 * permanente do motor). Usado quando o sync descobre uma vitória na nuvem —
 * assim o destravamento sobrevive a recargas e fica visível imediatamente.
 */
function mirrorLocalUnlock(buyIn: number): void {
  const key = String(Math.round(buyIn));
  try {
    const cloud: EliteWins = JSON.parse(localStorage.getItem(CLOUD_MIRROR_KEY) || "{}");
    cloud[key] = true;
    localStorage.setItem(CLOUD_MIRROR_KEY, JSON.stringify(cloud));
  } catch {
    /* storage indisponível */
  }
  // Registro permanente do motor (cof-elite-wins) — mesma regra do
  // recordTournamentWin: só "do início" com 100+ vale; aqui a vitória já foi
  // verificada na nuvem, então gravamos direto.
  try {
    const w = JSON.parse(localStorage.getItem("cof-elite-wins") || "{}");
    if (!w[key]) {
      w[key] = true;
      localStorage.setItem("cof-elite-wins", JSON.stringify(w));
    }
  } catch {
    /* storage indisponível */
  }
}

/**
 * Sincroniza a nuvem em background (não bloqueia a UI; sem await externo).
 *
 * Bidirecional:
 *   1. Nuvem → local: espelha elite_wins + reconhece vitórias de campeão
 *      ($109 com 100+, $1.000 com 100+) direto no ranking oficial.
 *   2. Local → nuvem: envia as vitórias que o jogador tem no aparelho.
 *
 * Se a rede falhar, nada quebra.
 */
export function syncEliteWins(nickname?: string | null): void {
  if (typeof window === "undefined") return;
  const playerKey = getPlayerKey();
  const local = loadEliteWinsLocal();

  // Puxar da nuvem → espelho local
  supabase
    .from("elite_wins")
    .select("buy_in_level")
    .eq("player_key", playerKey)
    .then(({ data, error }) => {
      if (error) return;
      const cloud: EliteWins = {};
      for (const row of data || []) cloud[String(row.buy_in_level)] = true;
      try {
        localStorage.setItem(CLOUD_MIRROR_KEY, JSON.stringify(cloud));
      } catch {
        /* storage indisponível */
      }
    },
    () => {},
  );

  // Reconhecer vitórias de CAMPEÃO no ranking oficial (compra do Allan):
  // quem venceu um $109/$1.000 do início com 100+ jogadores destrava a
  // próxima faixa elite — mesmo que o registro local tenha se perdido.
  supabase
    .from("tournament_scores")
    .select("buy_in, entrants, stage, finish_position, paid_places")
    .eq("player_key", playerKey)
    .eq("verified", true)
    .eq("mode", "circuito")
    .eq("stage", "inicio")
    .eq("finish_position", 1)
    .in("buy_in", [109, 1000])
    .limit(50)
    .then(({ data, error }) => {
      if (error) return;
      let changed = false;
      const cloud = loadAllEliteWins();
      for (const row of data || []) {
        const entrants = Number(row.entrants) || 0;
        const paid = Number(row.paid_places) || 0;
        const buyIn = Number(row.buy_in) || 0;
        // Mesma régua do motor: do início + campo cheio (100+).
        if (entrants >= 100 && paid >= 1) {
          if (buyIn >= 109 && buyIn < 1000 && !cloud["109"]) {
            cloud["109"] = true;
            changed = true;
          }
          if (buyIn >= 1000 && buyIn < 10000 && !cloud["1000"]) {
            cloud["1000"] = true;
            changed = true;
          }
        }
      }
      if (changed) {
        try {
          localStorage.setItem(CLOUD_MIRROR_KEY, JSON.stringify(cloud));
          // Espelhar também no registro permanente do motor.
          for (const k of ["109", "1000"]) if (cloud[k]) mirrorLocalUnlock(Number(k));
        } catch {
          /* storage indisponível */
        }
      }
    },
    () => {},
  );

  // Enviar local → nuvem (vitórias que ainda não estão lá)
  const entries = Object.keys(local).map((k) => ({
    player_key: playerKey,
    nickname: nickname || "Anonimo",
    buy_in_level: String(Number(k) || 0),
  }));
  if (entries.length) {
    supabase
      .from("elite_wins")
      .upsert(entries, { onConflict: "player_key,buy_in_level" })
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
      { onConflict: "player_key,buy_in_level" },
    )
    .then(
      () => {
        // Atualizar espelho local imediatamente
        mirrorLocalUnlock(buyIn);
      },
      () => {},
    );
}
