import { createClient } from "@supabase/supabase-js";

// Credenciais anonimas (seguras para uso no cliente com RLS ativado).
// As variaveis de ambiente devem ser configuradas no Vite (.env).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
