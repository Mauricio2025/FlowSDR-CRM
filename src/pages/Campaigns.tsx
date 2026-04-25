import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Play, Pause, MoreHorizontal, Users, Mail, Sparkles, Loader2, X, Edit, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import type { Campaign } from '@/lib/supabase'

export function Campaigns() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    type: 'info' as 'warning' | 'info' | 'success' | 'danger_confirm' | 'error',
    title: '',
    message: '',
    onConfirm: null as (() => void) | null
  })

  const [formData, setFormData] = useState({
    name: '',
    context: '',
    ai_prompt: '',
  })

  // 1. Inicialização: Identifica o Workspace do usuário
  useEffect(() => {
    async function initPage() {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: workspace } = await supabase
          .from('workspaces')
          .select('id')
          .eq('owner_id', user.id)
          .single()

        if (workspace) {
          setWorkspaceId(workspace.id)
          fetchCampaigns(workspace.id)
        }
      } catch (error) {
        console.error('Erro ao carregar workspace:', error)
      }
    }
    initPage()
  }, [])

  // 2. Busca de Campanhas Filtrada (Isolamento de Dados)
  const fetchCampaigns = async (wsId: string) => {
    try {
      setLoading(true)
      const { data: camps, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('workspace_id', wsId) // FILTRO CRÍTICO DE SEGURANÇA
        .order('created_at', { ascending: false })

      if (error) throw error

      if (camps) {
        const campaignsWithCounts = await Promise.all(
          camps.map(async (camp) => {
            const { count } = await supabase
              .from('leads')
              .select('*', { count: 'exact', head: true })
              .eq('campaign_id', camp.id)
              .eq('workspace_id', wsId) // Garante contagem correta

            return { ...camp, leads_count: count || 0 }
          })
        )
        setCampaigns(campaignsWithCounts as Campaign[])
      }
    } catch (error) {
      console.error('Erro ao buscar campanhas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCampaign = async () => {
    if (!formData.name || !formData.context || !workspaceId) return

    setIsSubmitting(true)
    try {
      if (editingCampaignId) {
        const { error } = await supabase
          .from('campaigns')
          .update({
            name: formData.name,
            context: formData.context,
            ai_prompt: formData.ai_prompt,
          })
          .eq('id', editingCampaignId)
          .eq('workspace_id', workspaceId) // Validação extra

        if (error) throw error
      } else {
        const { error } = await supabase.from('campaigns').insert([{
          name: formData.name,
          context: formData.context,
          ai_prompt: formData.ai_prompt,
          prompt_template: formData.ai_prompt || 'Seja direto e persuasivo.',
          workspace_id: workspaceId
        }])

        if (error) throw error
      }

      setFormData({ name: '', context: '', ai_prompt: '' })
      setIsModalOpen(false)
      fetchCampaigns(workspaceId)

    } catch (error: any) {
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Erro ao salvar',
        message: error.message,
        onConfirm: null
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const executeDeleteCampaign = async (id: string) => {
    setAlertModal({ ...alertModal, isOpen: false })
    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id)
        .eq('workspace_id', workspaceId) // Segurança Multi-tenancy

      if (error) throw error
      if (workspaceId) fetchCampaigns(workspaceId)
    } catch (error: any) {
      setAlertModal({ isOpen: true, type: 'error', title: 'Erro', message: error.message, onConfirm: null })
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c))

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: newStatus })
        .eq('id', id)
        .eq('workspace_id', workspaceId)

      if (error) throw error
    } catch (error) {
      if (workspaceId) fetchCampaigns(workspaceId)
    }
  }

  // --- Funções Auxiliares de UI ---
  const handleOpenEdit = (campaign: Campaign) => {
    setEditingCampaignId(campaign.id)
    setFormData({ name: campaign.name, context: campaign.context, ai_prompt: campaign.ai_prompt || '' })
    setOpenDropdownId(null)
    setIsModalOpen(true)
  }

  const triggerDeleteCampaign = (id: string) => {
    setOpenDropdownId(null)
    setAlertModal({
      isOpen: true,
      type: 'danger_confirm',
      title: 'Excluir Campanha?',
      message: 'Isso removerá a campanha e todos os leads vinculados a ela. Esta ação é irreversível.',
      onConfirm: () => executeDeleteCampaign(id)
    })
  }

  return (
    <div className="space-y-8 relative pb-10">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="gradient-text text-3xl font-bold">Campanhas</h1>
          <p className="text-muted-foreground mt-2">Gestão estratégica de prospecção com IA</p>
        </div>
        <Button variant="gradient" onClick={() => { setEditingCampaignId(null); setFormData({name:'', context:'', ai_prompt:''}); setIsModalOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nova Campanha
        </Button>
      </motion.div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/10">
          <p className="text-muted-foreground mb-4">Nenhuma campanha ativa neste Workspace.</p>
          <Button variant="outline" onClick={() => setIsModalOpen(true)}>Começar agora</Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign, index) => (
            <motion.div key={campaign.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Card className="glass-card hover:border-primary/40 transition-all h-full flex flex-col">
                <CardHeader className="flex flex-row items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-lg font-bold">{campaign.name}</CardTitle>
                    <Badge variant={campaign.status === 'active' ? 'success' : 'secondary'}>
                      {campaign.status === 'active' ? 'Ativa' : 'Pausada'}
                    </Badge>
                  </div>
                  <div className="relative">
                    <Button variant="ghost" size="icon" onClick={() => setOpenDropdownId(openDropdownId === campaign.id ? null : campaign.id)}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    <AnimatePresence>
                      {openDropdownId === campaign.id && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-[#0F172A] shadow-2xl z-50 overflow-hidden">
                          <button onClick={() => handleOpenEdit(campaign)} className="w-full text-left px-4 py-3 text-sm hover:bg-secondary/50 flex items-center gap-2"><Edit className="h-4 w-4" /> Editar</button>
                          <button onClick={() => triggerDeleteCampaign(campaign.id)} className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 border-t border-border/50 flex items-center gap-2"><Trash2 className="h-4 w-4" /> Excluir</button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col">
                  <p className="text-sm text-muted-foreground line-clamp-2 italic">"{campaign.context}"</p>
                  <div className="flex items-center gap-4 text-xs font-medium text-gray-500 mt-auto pt-4">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {campaign.leads_count} leads</span>
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> 0 envios</span>
                  </div>
                  <Button
                    variant={campaign.status === 'active' ? 'outline' : 'gradient'}
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => handleToggleStatus(campaign.id, campaign.status)}
                  >
                    {campaign.status === 'active' ? <><Pause className="mr-2 h-3 w-3" /> Pausar</> : <><Play className="mr-2 h-3 w-3" /> Iniciar</>}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* --- MODAL DE CAMPANHA --- */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-lg rounded-2xl border border-border bg-[#0F172A] p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">{editingCampaignId ? 'Ajustar Campanha' : 'Nova Campanha'}</h2>
                <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}><X className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>Nome</Label>
                  <Input placeholder="Ex: Outbound SaaS" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label>Contexto de Vendas</Label>
                  <Textarea placeholder="Qual o objetivo desta campanha?" value={formData.context} onChange={(e) => setFormData({...formData, context: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-accent" /> Instruções de IA</Label>
                  <Textarea placeholder="Ex: Use um tom informal e direto." value={formData.ai_prompt} onChange={(e) => setFormData({...formData, ai_prompt: e.target.value})} />
                </div>
                <div className="flex gap-3 pt-6">
                  <Button variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                  <Button variant="gradient" className="flex-1 font-bold" onClick={handleSaveCampaign} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'Salvar Campanha'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL DE ALERTA --- */}
      <AnimatePresence>
        {alertModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm bg-black/40">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-sm rounded-2xl border border-border bg-[#0F172A] p-8 shadow-2xl flex flex-col items-center text-center">
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