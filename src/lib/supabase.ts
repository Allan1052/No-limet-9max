import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Credenciais anonimas (seguras para uso no cliente com RLS ativado).
// As variaveis de ambiente devem ser configuradas no Vite (.env).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

/**
 * Mock client que não faz nada — usado quando Supabase não está configurado.
 * Permite que o app carregue normalmente mesmo sem credenciais.
 */
const mockClient = {
  supabaseUrl: "",
  from: (_table: string) => ({
    select: () => ({ data: [], error: null }),
    insert: (_rows: unknown) => ({ data: [], error: null }),
    update: (_row: unknown) => ({ eq: () => ({ data: [], error: null }) }),
    delete: () => ({ eq: () => ({ data: [], error: null }) }),
  }),
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
  },
} as unknown as SupabaseClient;

export const supabase: SupabaseClient = (() => {
  if (!supabaseUrl || !supabaseAnonKey) return mockClient;
  try {
    return createClient(supabaseUrl, supabaseAnonKey);
  } catch {
    return mockClient;
  }
})();

/**
 * Tipos para o banco de dados do Ranking
 */
export interface PlayerProfile {
  id: string; // UUID ou ID anonimo do localStorage
  nickname: string;
  created_at?: string;
}

export interface TournamentScore {
  id?: number;
  player_id: string;
  tier: "micro" | "baixa" | "media" | "alta";
  points: number;
  season: string;
  timestamp?: string;
}

export interface MissionProgress {
  id?: number;
  player_id: string;
  stages_cleared: number;
  timestamp?: string;
}
