import { createClient } from '@supabase/supabase-js';

const cleanEnvVar = (val: string) => {
  if (!val) return '';
  let s = val.trim();
  if (s.startsWith('"') && s.endsWith('"')) {
    s = s.slice(1, -1);
  }
  if (s.startsWith("'") && s.endsWith("'")) {
    s = s.slice(1, -1);
  }
  return s.trim();
};

const supabaseUrl = cleanEnvVar(import.meta.env?.VITE_SUPABASE_URL || '');
const supabaseAnonKey = cleanEnvVar(import.meta.env?.VITE_SUPABASE_ANON_KEY || '');

// Verifica se as chaves estão devidamente configuradas
export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

// Só inicializa o cliente se as variáveis existirem, evitando exceções fatais que quebram o React (ecrã preto)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as any);
