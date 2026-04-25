import { supabase } from '../lib/supabase';

// Função para criar nova conta
export const signUp = async (email: string, password: string, workspaceName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  // Se o registro der certo, já criamos o Workspace para este usuário!
  if (data.user) {
    const { error: workspaceError } = await supabase
      .from('workspaces')
      .insert([{ name: workspaceName, owner_id: data.user.id }]);
      
    if (workspaceError) throw workspaceError;
  }
  
  return data;
};

// Função para fazer login
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

// Função para deslogar
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};