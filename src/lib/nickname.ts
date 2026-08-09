// ---------------------------------------------------------------------------
// APELIDO — único e permanente.
//
// REGRAS (decisão do projeto):
//   - o apelido é ÚNICO: dois jogadores nunca têm o mesmo, nem com outra caixa
//     ("Coringa" e "coringa" são o mesmo apelido);
//   - é PERMANENTE: não troca nunca. Em uma semana um jogador disputa dezenas de
//     torneios; trocar o nome embaralharia todo o histórico do ranking;
//   - a unicidade é validada NO BANCO, não só no app. Sem isso, dois jogadores
//     que escolhem o mesmo apelido no mesmo instante passariam os dois.
//
// A verificação no app é só cortesia (feedback rápido enquanto digita). A
// garantia real vem do índice UNIQUE em lower(nickname) no Postgres: quem chegar
// depois recebe erro 23505 e é avisado.
// ---------------------------------------------------------------------------
import { supabase } from "./supabase";
import { getPlayerKey } from "./ranking";

const STORAGE_KEY = "cof-nickname";

export const NICKNAME_MIN = 3;
export const NICKNAME_MAX = 16;

/** Apelido salvo neste aparelho, ou null se o jogador ainda não escolheu. */
export function getNickname(): string | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value && value.trim() ? value : null;
  } catch {
    return null;
  }
}

export function hasNickname(): boolean {
  return getNickname() !== null;
}

/** Normaliza para comparação: sem espaços nas pontas, caixa baixa. */
export function normalizeNickname(raw: string): string {
  return raw.trim().toLowerCase();
}

export type NicknameProblem =
  | "vazio"
  | "curto"
  | "longo"
  | "caracteres"
  | "reservado";

const RESERVED = new Set([
  "admin",
  "administrador",
  "calloufold",
  "call ou fold",
  "moderador",
  "suporte",
  "sistema",
  "anonimo",
  "anônimo",
  "bot",
]);

/**
 * Validação de formato (roda enquanto o jogador digita).
 * Aceita letras (com acento), números, espaço, ponto, hífen e underscore.
 */
export function validateFormat(raw: string): { ok: boolean; problem?: NicknameProblem; message?: string } {
  const value = raw.trim();

  if (!value) {
    return { ok: false, problem: "vazio", message: "Escolha um apelido." };
  }
  if (value.length < NICKNAME_MIN) {
    return {
      ok: false,
      problem: "curto",
      message: `Mínimo de ${NICKNAME_MIN} letras.`,
    };
  }
  if (value.length > NICKNAME_MAX) {
    return {
      ok: false,
      problem: "longo",
      message: `Máximo de ${NICKNAME_MAX} letras.`,
    };
  }
  if (!/^[\p{L}\p{N} ._-]+$/u.test(value)) {
    return {
      ok: false,
      problem: "caracteres",
      message: "Use apenas letras, números, espaço, ponto, hífen ou _.",
    };
  }
  if (RESERVED.has(normalizeNickname(value))) {
    return {
      ok: false,
      problem: "reservado",
      message: "Esse apelido é reservado. Escolha outro.",
    };
  }
  return { ok: true };
}

export type Availability = "livre" | "em_uso" | "erro";

/**
 * Consulta o BANCO para saber se o apelido está livre.
 * Comparação case-insensitive, igual ao índice UNIQUE do Postgres.
 */
export async function checkAvailability(raw: string): Promise<Availability> {
  const value = raw.trim();
  if (!value) return "erro";

  try {
    const { data, error } = await supabase
      .from("players")
      .select("player_key, nickname")
      .ilike("nickname", value)
      .limit(1);

    if (error) return "erro";
    if (!data || data.length === 0) return "livre";

    // Se o apelido já é deste próprio jogador, considera livre.
    const myKey = getPlayerKey();
    if (data[0].player_key === myKey) return "livre";

    return "em_uso";
  } catch {
    return "erro";
  }
}

export interface ClaimResult {
  success: boolean;
  /** Apelido efetivamente gravado. */
  nickname?: string;
  error?: "em_uso" | "formato" | "conexao";
  message?: string;
}

/**
 * Reserva o apelido de forma definitiva.
 *
 * A gravação passa pelo índice UNIQUE do banco. Se dois jogadores tentarem o
 * mesmo apelido no mesmo instante, o Postgres rejeita o segundo (código 23505)
 * e nós avisamos — é essa checagem, e não a do app, que garante a unicidade.
 */
export async function claimNickname(raw: string): Promise<ClaimResult> {
  const value = raw.trim();

  const format = validateFormat(value);
  if (!format.ok) {
    return { success: false, error: "formato", message: format.message };
  }

  const playerKey = getPlayerKey();

  try {
    const { error } = await supabase.from("players").upsert(
      {
        player_key: playerKey,
        nickname: value,
        nickname_set_at: new Date().toISOString(),
      },
      { onConflict: "player_key" },
    );

    if (error) {
      // 23505 = unique_violation → alguém já tem esse apelido.
      const code = (error as { code?: string }).code;
      if (code === "23505" || /duplicate|unique/i.test(error.message || "")) {
        return {
          success: false,
          error: "em_uso",
          message: "Esse apelido já foi escolhido por outro jogador.",
        };
      }
      return { success: false, error: "conexao", message: error.message };
    }

    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignora — o banco já é a fonte da verdade */
    }

    return { success: true, nickname: value };
  } catch {
    return {
      success: false,
      error: "conexao",
      message: "Sem conexão. Tente de novo.",
    };
  }
}

/**
 * Recupera o apelido do banco, caso o jogador tenha limpado o navegador mas a
 * player_key ainda exista.
 */
export async function restoreNickname(): Promise<string | null> {
  const local = getNickname();
  if (local) return local;

  try {
    const { data } = await supabase
      .from("players")
      .select("nickname")
      .eq("player_key", getPlayerKey())
      .limit(1);

    const remote = data?.[0]?.nickname;
    if (remote) {
      try {
        localStorage.setItem(STORAGE_KEY, remote);
      } catch {
        /* ignora */
      }
      return remote;
    }
  } catch {
    /* offline — segue sem apelido */
  }
  return null;
}
