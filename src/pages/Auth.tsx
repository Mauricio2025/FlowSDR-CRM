import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Briefcase, Loader2, ArrowRight, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '../lib/supabase';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');

  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    type: 'info' as 'error' | 'success' | 'info',
    title: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (signInError) throw signInError;

        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Acesso Autorizado',
          message: 'Bem-vindo de volta! Estamos preparando seu ambiente de vendas.'
        });

      } else {
        if (!workspaceName.trim()) {
          throw new Error('O nome do Workspace é obrigatório.');
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          const { error: workspaceError } = await supabase
            .from('workspaces')
            .insert([{ name: workspaceName, owner_id: data.user.id }]);

          if (workspaceError) throw workspaceError;

          setAlertModal({
            isOpen: true,
            type: 'success',
            title: 'Workspace Criado!',
            message: 'Sua conta foi configurada com sucesso. Acesse seu e-mail para confirmar.'
          });
        }
      }
    } catch (err: any) {
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Falha na Autenticação',
        message: err.message || 'Verifique seus dados e tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center p-4 font-sans relative overflow-hidden">
      
      {/* Decoração de Fundo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#0066FF]/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00D4FF]/10 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#0F172A] border border-border/50 rounded-2xl p-8 shadow-2xl relative z-10"
      >
        {/* Linha de Brilho no Topo */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00D4FF] to-[#0066FF]" />

        <div className="flex flex-col items-center text-center mb-8">
          {/* Logo Centralizada e de tamanho Médio */}
          <div className="mb-6 flex justify-center w-full">
            <img 
              src="/icone.png" 
              alt="FlowSDR Logo" 
              className="h-16 w-auto object-contain transition-transform hover:scale-105"
            />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">
            {isLogin ? 'Bem-vindo ao FlowSDR' : 'Crie sua conta'}
          </h2>
          <p className="text-muted-foreground text-sm max-w-[280px]">
            {isLogin 
              ? 'Insira suas credenciais para acessar seu workspace.' 
              : 'Comece a prospectar com inteligência artificial hoje mesmo.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="workspace" className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Nome da Empresa</Label>
              <div className="relative group">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-[#00D4FF] transition-colors" />
                <Input
                  id="workspace"
                  placeholder="Ex: Minha Startup"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="bg-[#0A0F1C] border-border/50 pl-10 h-12 focus:ring-1 focus:ring-[#0066FF] transition-all"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">E-mail Profissional</Label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-[#00D4FF] transition-colors" />
              <Input
                id="email"
                type="email"
                placeholder="nome@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#0A0F1C] border-border/50 pl-10 h-12 focus:ring-1 focus:ring-[#0066FF] transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Sua Senha</Label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-[#00D4FF] transition-colors" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#0A0F1C] border-border/50 pl-10 h-12 focus:ring-1 focus:ring-[#0066FF] transition-all"
                required
                minLength={6}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#00D4FF] to-[#0066FF] hover:brightness-110 h-12 mt-4 text-white font-bold text-base shadow-lg shadow-[#0066FF]/20"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                {isLogin ? 'Entrar no Sistema' : 'Configurar Workspace'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-border/20">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-gray-400 hover:text-[#00D4FF] text-sm transition-colors font-medium"
          >
            {isLogin ? 'Não tem uma conta? Registre sua empresa' : 'Já possui conta? Faça o Login'}
          </button>
        </div>
      </motion.div>

      {/* MODAL DE FEEDBACK MODERNO */}
      <AnimatePresence>
        {alertModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm bg-black/40">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }} 
              className="relative w-full max-w-xs overflow-hidden rounded-2xl border border-border bg-[#0F172A] p-6 shadow-2xl flex flex-col items-center text-center"
            >
              {alertModal.type === 'error' && <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />}
              {alertModal.type === 'success' && <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4" />}
              {alertModal.type === 'info' && <Info className="h-12 w-12 text-[#00D4FF] mb-4" />}

              <h2 className="text-lg font-bold text-white mb-2">{alertModal.title}</h2>
              <p className="text-sm text-gray-400 mb-6">{alertModal.message}</p>

              <Button 
                variant={alertModal.type === 'error' ? 'destructive' : 'gradient'} 
                className="w-full font-bold h-10" 
                onClick={() => setAlertModal({ ...alertModal, isOpen: false })}
              >
                Entendi
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}