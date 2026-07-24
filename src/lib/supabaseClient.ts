import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env?.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY || '').trim();

// Verifica se as chaves estão devidamente configuradas
export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

// Só inicializa o cliente se as variáveis existirem, evitando exceções fatais que quebram o React (ecrã preto)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as any);
