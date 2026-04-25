import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

// Telas
import Auth from '../src/pages/Auth'; // Ajuste o caminho se necessário
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Leads } from './pages/Leads';
import { Campaigns } from './pages/Campaigns';
import { Settings } from './pages/Settings';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Busca a sessão atual no primeiro carregamento
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Fica escutando as mudanças (ex: quando o usuário faz login ou clica em sair)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Tela de Loading enquanto verifica o token
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-800 border-t-[#0066FF] rounded-full animate-spin"></div>
      </div>
    );
  }

  // Se não estiver logado, "tranca" o app e mostra a tela de Login/Cadastro
  if (!session) {
    return <Auth />;
  }

  // Se estiver logado, libera o roteamento normal
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="leads" element={<Leads />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}