import { createClient } from '@supabase/supabase-js';

// Usamos import.meta.env para projetos Vite. 
// O "as any" silencia o TypeScript sobre a falta das tipagens globais do Vite.
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Variáveis de ambiente do Supabase não encontradas!');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Cole isso no FINAL do seu arquivo src/lib/supabase.ts

export interface Lead {
  id: string;
  name: string;
  company: string;
  role: string;
  email: string;
  status: 'base' | 'mapped' | 'contacting' | 'qualified';
  workspace_id?: string;
  created_at?: string;
  updated_at?: string;
  phone?: string;
  linkedin?: string;
}

export interface Campaign {
  id: string;
  name: string;
  context: string;
  ai_prompt: string;
  prompt_template?: string;
  status: 'active' | 'paused';
  workspace_id?: string;
  leads_count?: number;
  created_at?: string;
  updated_at?: string;
}