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

const DEFAULT_SUPABASE_URL = 'https://mrsbnhcnwmnciuzalvtt.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yc2JuaGNud21uY2l1emFsdnR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NDk3MzIsImV4cCI6MjEwMzIyNTczMn0.6mM2NTnIFCO6IF7DQ5dvtza5XWR79Tf5iBXAxzjsUxw';

const supabaseUrl = cleanEnvVar(import.meta.env?.VITE_SUPABASE_URL || '') || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = cleanEnvVar(import.meta.env?.VITE_SUPABASE_ANON_KEY || '') || DEFAULT_SUPABASE_ANON_KEY;

// Verifica se as chaves estão devidamente configuradas
export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

// Só inicializa o cliente se as variáveis existirem, evitando exceções fatais que quebram o React (ecrã preto)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as any);
