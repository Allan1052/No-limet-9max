import { supabase } from "../lib/supabase";
import { LocalRepository } from "./localRepository";
import type { Repository } from "./repository";
import { SupabaseRepository } from "./supabaseRepository";

export const repository: Repository = supabase ? new SupabaseRepository(supabase) : new LocalRepository();
export type { Repository };
