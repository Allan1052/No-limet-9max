import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Credenciais anonimas (seguras para uso no cliente com RLS ativado).
// A anon key do Supabase e PUBLICA por design: toda a protecao vem das
// policies de Row Level Security no banco. Por isso pode ficar no bundle.
// As env vars do Vite tem precedencia (permitem apontar para outro projeto).
const DEFAULT_SUPABASE_URL = "https://bdzuwjyvjmnpkufkdokt.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkenV3anl2am1ucGt1Zmtkb2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxNDc0OTIsImV4cCI6MjEwMTcyMzQ5Mn0.8LVHlCD1UoItGpA-dqA571MS7bYVm9DQZX474NCsKso";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const SUPABASE_URL = supabaseUrl;
export const SUPABASE_ANON_KEY = supabaseAnonKey;

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
