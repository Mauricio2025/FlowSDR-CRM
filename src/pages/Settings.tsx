import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, LogOut, Loader2, Save, AlertTriangle, Trash2, CheckCircle2, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'

export function Settings() {
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const [userEmail, setUserEmail] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [workspaceId, setWorkspaceId] = useState<string>('')
  
  // Dados unificados (Perfil Auth + Metas Workspace)
  const [formData, setFormData] = useState({
    name: '',
    role: 'SDR',
    goal_qualified_leads: 50,
    goal_total_leads: 200
  })

  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    type: 'info' as 'warning' | 'info' | 'success' | 'danger_confirm' | 'error',
    title: '',
    message: '',
    onConfirm: null as (() => void) | null
  })

  // 1. Carregamento Seguro de Dados
  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          setUserEmail(user.email || '')
          setUserId(user.id)
          
          // Busca o workspace filtrando pelo DONO (Segurança Multi-tenancy)
          const { data: workspace, error: wsError } = await supabase
            .from('workspaces')
            .select('*')
            .eq('owner_id', user.id) // FILTRO CRÍTICO
            .single()

          if (wsError && wsError.code !== 'PGRST116') throw wsError

          if (workspace) {
            setWorkspaceId(workspace.id)
            setFormData({
              name: user.user_metadata?.name || user.email?.split('@')[0] || '',
              role: user.user_metadata?.role || 'SDR',
              goal_qualified_leads: workspace.goal_qualified_leads || 50,
              goal_total_leads: workspace.goal_total_leads || 200
            })
          }
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  // 2. Persistência de Configurações
  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      // Atualiza Metadados de Perfil
      const { error: authError } = await supabase.auth.updateUser({
        data: { name: formData.name, role: formData.role }
      })
      if (authError) throw authError

      // Atualiza Metas do Workspace (Apenas se o ID for válido)
      if (workspaceId) {
        const { error: workspaceError } = await supabase
          .from('workspaces')
          .update({
            goal_qualified_leads: Number(formData.goal_qualified_leads),
            goal_total_leads: Number(formData.goal_total_leads)
          })
          .eq('id', workspaceId)
          .eq('owner_id', userId) // Dupla validação de segurança
        
        if (workspaceError) throw workspaceError
      }

      setAlertModal({
        isOpen: true,
        type: 'success',
        title: 'Configurações Salvas',
        message: 'Seu perfil e as metas do Workspace foram atualizados com sucesso.',
        onConfirm: null
      })
    } catch (error: any) {
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Erro ao Salvar',
        message: `Ocorreu um erro: ${error.message}`,
        onConfirm: null
      })
    } finally {
      setIsSaving(false)
    }
  }

  // 3. Exclusão de Conta (Fluxo de Destruição Segura)
  const executeDeleteAccount = async () => {
    setAlertModal({ ...alertModal, isOpen: false })
    setIsDeleting(true)
    try {
      // Remove o workspace (As políticas de RLS garantem que só apaga o próprio)
      const { error: wsDeleteError } = await supabase
        .from('workspaces')
        .delete()
        .eq('owner_id', userId)
      
      if (wsDeleteError) throw wsDeleteError

      await supabase.auth.signOut()
    } catch (error: any) {
      setAlertModal({ isOpen: true, type: 'error', title: 'Erro Crítico', message: error.message, onConfirm: null })
      setIsDeleting(false)
    }
  }

  const avatarLetter = formData.name ? formData.name.charAt(0).toUpperCase() : '?'

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto relative pb-10">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="gradient-text text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-2">Gerencie suas preferências e metas estratégicas</p>
      </motion.div>

      <div className="grid gap-8">
        {/* Card de Perfil */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-[#00D4FF]" /> Perfil do Usuário</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6 pb-6 border-b border-border/50">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#00D4FF] to-[#0066FF] text-3xl font-bold text-white shadow-xl shadow-primary/20">
                  {avatarLetter}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{formData.name}</h3>
                  <p className="text-sm text-muted-foreground">{userEmail}</p>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-gray-500">Nome de Exibição</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="bg-secondary/20 border-border/50 focus:ring-primary" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-gray-500">Cargo / Função</Label>
                  <Input value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="bg-secondary/20 border-border/50 focus:ring-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Card de Metas */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-[#00D4FF]" /> Objetivos do Workspace</CardTitle>
              <CardDescription>Estes valores alimentam os indicadores de progresso no Dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-gray-500">Meta de Leads Qualificados</Label>
                  <Input 
                    type="number" 
                    value={formData.goal_qualified_leads} 
                    onChange={(e) => setFormData({...formData, goal_qualified_leads: Number(e.target.value)})} 
                    className="bg-secondary/20 border-border/50" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-gray-500">Meta de Volume Total</Label>
                  <Input 
                    type="number" 
                    value={formData.goal_total_leads} 
                    onChange={(e) => setFormData({...formData, goal_total_leads: Number(e.target.value)})} 
                    className="bg-secondary/20 border-border/50" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Painel de Ações */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-secondary/10 p-5 rounded-2xl border border-border/50 backdrop-blur-md">
          <div className="flex gap-3 w-full sm:w-auto">
            <Button variant="gradient" onClick={handleSaveSettings} disabled={isSaving} className="flex-1 sm:flex-none font-bold">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar Alterações
            </Button>
            <Button variant="outline" onClick={() => supabase.auth.signOut()} className="border-border/50 hover:bg-secondary/50">
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </div>
          <Button variant="ghost" onClick={() => setAlertModal({
            isOpen: true,
            type: 'danger_confirm',
            title: 'Excluir Workspace?',
            message: 'Esta ação é irreversível. Todos os seus leads, campanhas e dados de IA serão apagados.',
            onConfirm: executeDeleteAccount
          })} disabled={isDeleting} className="text-red-500 hover:text-red-400 hover:bg-red-500/10 w-full sm:w-auto">
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} Excluir Conta
          </Button>
        </motion.div>
      </div>

      {/* Modal de Feedback */}
      <AnimatePresence>
        {alertModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm bg-black/40">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-sm rounded-2xl border border-border bg-[#0F172A] p-8 shadow-2xl flex flex-col items-center text-center">
              {alertModal.type === 'success' && <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />}
              {alertModal.type === 'error' || alertModal.type === 'danger_confirm' && <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />}
              
              <h2 className="text-xl font-bold mb-2">{alertModal.title}</h2>
              <p className="text-sm text-muted-foreground mb-8">{alertModal.message}</p>
              
              {alertModal.type === 'danger_confirm' ? (
                <div className="flex gap-3 w-full">
                  <Button variant="ghost" className="flex-1" onClick={() => setAlertModal({...alertModal, isOpen: false})}>Cancelar</Button>
                  <Button variant="destructive" className="flex-1 bg-red-600" onClick={alertModal.onConfirm || undefined}>Confirmar</Button>
                </div>
              ) : (
                <Button variant="gradient" className="w-full font-bold" onClick={() => setAlertModal({...alertModal, isOpen: false})}>Entendido</Button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}