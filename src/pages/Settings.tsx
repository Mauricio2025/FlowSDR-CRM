import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, LogOut, Loader2, Save, AlertTriangle, Trash2, CheckCircle2, Info, Target } from 'lucide-react'
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
  
  // Dados editáveis unificados (Perfil + Metas do Workspace)
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

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email || '')
        setUserId(user.id)
        
        // Busca o workspace do usuário para pegar as metas
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('*')
          .eq('owner_id', user.id)
          .single()

        if (workspace) {
          setWorkspaceId(workspace.id)
        }
        
        setFormData({
          name: user.user_metadata?.name || user.email?.split('@')[0] || '',
          role: user.user_metadata?.role || 'SDR',
          goal_qualified_leads: workspace?.goal_qualified_leads || 50,
          goal_total_leads: workspace?.goal_total_leads || 200
        })
      }
      setLoading(false)
    }
    loadData()
  }, [])

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      // 1. Salva os dados do Perfil no Auth
      const { error: authError } = await supabase.auth.updateUser({
        data: { name: formData.name, role: formData.role }
      })
      if (authError) throw authError

      // 2. Salva as Metas no Workspace
      if (workspaceId) {
        const { error: workspaceError } = await supabase
          .from('workspaces')
          .update({
            goal_qualified_leads: Number(formData.goal_qualified_leads),
            goal_total_leads: Number(formData.goal_total_leads)
          })
          .eq('id', workspaceId)
        
        if (workspaceError) throw workspaceError
      }

      setAlertModal({
        isOpen: true,
        type: 'success',
        title: 'Configurações Salvas',
        message: 'Seu perfil e as metas do seu Workspace foram atualizados com sucesso.',
        onConfirm: null
      })
    } catch (error: any) {
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Erro ao Salvar',
        message: `Não foi possível atualizar as configurações: ${error.message}`,
        onConfirm: null
      })
    } finally {
      setIsSaving(false)
    }
  }

  const triggerDeleteAccount = () => {
    setAlertModal({
      isOpen: true,
      type: 'danger_confirm',
      title: 'Zona de Perigo Extremo',
      message: 'Você tem certeza absoluta? Isso apagará seu Workspace, TODAS as suas Campanhas e TODOS os seus Leads permanentemente.',
      onConfirm: executeDeleteAccount
    })
  }

  const executeDeleteAccount = async () => {
    setAlertModal({ ...alertModal, isOpen: false })
    setIsDeleting(true)
    try {
      const { error: workspaceError } = await supabase.from('workspaces').delete().eq('owner_id', userId)
      if (workspaceError) throw workspaceError
      await supabase.auth.signOut()
    } catch (error: any) {
      setAlertModal({ isOpen: true, type: 'error', title: 'Erro de Exclusão', message: error.message, onConfirm: null })
      setIsDeleting(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const avatarLetter = formData.name ? formData.name.charAt(0).toUpperCase() : 'U'

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto relative">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="gradient-text text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-2">Gerencie suas informações pessoais e metas da equipe</p>
      </motion.div>

      <div className="grid gap-8">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-[#00D4FF]" /> Informações do Perfil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6 pb-4 border-b border-border/50">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#00D4FF] to-[#0066FF] text-3xl font-bold text-white shadow-lg">
                  {avatarLetter}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground">{formData.name || 'Usuário'}</h3>
                  <p className="text-sm text-muted-foreground">{userEmail}</p>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome de Exibição</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="bg-secondary/30" />
                </div>
                <div className="space-y-2">
                  <Label>Seu Cargo / Função</Label>
                  <Input value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="bg-secondary/30" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* NOVO: Configurações do Workspace / Metas */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-card border-[#00D4FF]/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-[#00D4FF]" /> Metas do Workspace</CardTitle>
              <CardDescription>Defina os objetivos mensais que aparecerão no Dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Meta de Leads Qualificados</Label>
                  <Input 
                    type="number" 
                    value={formData.goal_qualified_leads} 
                    onChange={(e) => setFormData({...formData, goal_qualified_leads: Number(e.target.value)})} 
                    className="bg-secondary/30" 
                  />
                  <p className="text-xs text-muted-foreground">Quantos leads você espera converter no mês.</p>
                </div>
                <div className="space-y-2">
                  <Label>Meta de Volume de Prospecção</Label>
                  <Input 
                    type="number" 
                    value={formData.goal_total_leads} 
                    onChange={(e) => setFormData({...formData, goal_total_leads: Number(e.target.value)})} 
                    className="bg-secondary/30" 
                  />
                  <p className="text-xs text-muted-foreground">Volume total de leads a serem trabalhados.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Botões de Ação Globais */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-secondary/10 p-4 rounded-xl border border-border/50">
          <div className="flex gap-3 w-full sm:w-auto">
            <Button variant="gradient" onClick={handleSaveSettings} disabled={isSaving} className="flex-1 sm:flex-none">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isSaving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
            <Button variant="outline" onClick={handleSignOut} className="hover:bg-secondary/50">
              <LogOut className="mr-2 h-4 w-4" /> Sair da Conta
            </Button>
          </div>
          <Button variant="ghost" onClick={triggerDeleteAccount} disabled={isDeleting} className="text-red-500 hover:text-red-600 hover:bg-red-500/10 w-full sm:w-auto">
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} Excluir Conta
          </Button>
        </motion.div>
      </div>

      {/* Modal Moderno (Mantido exatamente como estava) */}
      <AnimatePresence>
        {alertModal.isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => alertModal.type !== 'danger_confirm' && setAlertModal({ ...alertModal, isOpen: false })} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-[#0F172A] p-6 shadow-2xl flex flex-col items-center text-center">
              {alertModal.type === 'warning' && <AlertTriangle className="h-14 w-14 text-amber-500 mb-4" />}
              {alertModal.type === 'error' && <AlertTriangle className="h-14 w-14 text-red-500 mb-4" />}
              {alertModal.type === 'info' && <Info className="h-14 w-14 text-[#00D4FF] mb-4" />}
              {alertModal.type === 'success' && <CheckCircle2 className="h-14 w-14 text-emerald-500 mb-4" />}
              {alertModal.type === 'danger_confirm' && <Trash2 className="h-14 w-14 text-red-500 mb-4" />}
              <h2 className="text-xl font-bold text-foreground mb-2">{alertModal.title}</h2>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{alertModal.message}</p>
              {alertModal.type === 'danger_confirm' ? (
                <div className="flex gap-3 w-full">
                  <Button variant="ghost" className="flex-1 hover:bg-secondary/50" onClick={() => setAlertModal({ ...alertModal, isOpen: false })}>Cancelar</Button>
                  <Button variant="destructive" className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={alertModal.onConfirm || undefined}>Sim, Excluir</Button>
                </div>
              ) : (
                <Button variant={alertModal.type === 'error' ? 'destructive' : 'gradient'} className="w-full" onClick={() => setAlertModal({ ...alertModal, isOpen: false })}>Entendi</Button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}