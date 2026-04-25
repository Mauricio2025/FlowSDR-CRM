import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Play, Pause, MoreHorizontal, Users, Mail, Sparkles, Loader2, X, Edit, Trash2, AlertTriangle, Info, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import type { Campaign } from '@/lib/supabase'

export function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

  // NOVO ESTADO: Atualizado para suportar confirmação de exclusão e erros
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

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    try {
      setLoading(true)
      const { data: camps, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      if (camps) {
        const campaignsWithCounts = await Promise.all(
          camps.map(async (camp) => {
            const { count } = await supabase
              .from('leads')
              .select('*', { count: 'exact', head: true })
              .eq('campaign_id', camp.id)

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

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'

    if (newStatus === 'paused') {
      const activeCampaignsCount = campaigns.filter(c => c.status === 'active').length
      
      if (activeCampaignsCount === 1) {
        setAlertModal({
          isOpen: true,
          type: 'warning',
          title: 'Aviso Crítico',
          message: 'Você acabou de pausar sua ÚNICA campanha ativa! Seu Kanban de Leads ficará bloqueado até que você reative esta ou crie uma nova.',
          onConfirm: null
        })
      } else if (activeCampaignsCount > 1) {
        setAlertModal({
          isOpen: true,
          type: 'info',
          title: 'Campanha Pausada',
          message: `Esta campanha foi pausada. Você ainda tem ${activeCampaignsCount - 1} campanha(s) ativa(s) rodando no Kanban.`,
          onConfirm: null
        })
      }
    } else {
      setAlertModal({
        isOpen: true,
        type: 'success',
        title: 'Campanha Ativa!',
        message: 'A campanha foi reativada com sucesso e já está disponível no funil de Leads.',
        onConfirm: null
      })
    }

    setCampaigns((prev) =>
      prev.map((campaign) =>
        campaign.id === id ? { ...campaign, status: newStatus } : campaign
      )
    )

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Erro de conexão ao alterar status:', error)
      fetchCampaigns() 
    }
  }

  const handleOpenCreate = () => {
    setEditingCampaignId(null)
    setFormData({ name: '', context: '', ai_prompt: '' })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (campaign: Campaign) => {
    setEditingCampaignId(campaign.id)
    setFormData({
      name: campaign.name,
      context: campaign.context,
      ai_prompt: campaign.ai_prompt || '',
    })
    setOpenDropdownId(null)
    setIsModalOpen(true)
  }

  // 1. Dispara o modal moderno perguntando se quer mesmo apagar
  const triggerDeleteCampaign = (id: string) => {
    setOpenDropdownId(null)
    setAlertModal({
      isOpen: true,
      type: 'danger_confirm',
      title: 'Excluir Campanha?',
      message: 'Isso apagará a campanha e TODOS os leads associados a ela no funil. Esta ação não pode ser desfeita.',
      onConfirm: () => executeDeleteCampaign(id)
    })
  }

  // 2. Lógica executada ao confirmar a exclusão
  const executeDeleteCampaign = async (id: string) => {
    setAlertModal({ ...alertModal, isOpen: false }) // Fecha o modal de confirmação
    try {
      const { error } = await supabase.from('campaigns').delete().eq('id', id)
      if (error) throw error
      fetchCampaigns()
    } catch (error: any) {
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Erro ao excluir',
        message: `Não foi possível excluir a campanha: ${error.message}`,
        onConfirm: null
      })
    }
  }

  const handleSaveCampaign = async () => {
    if (!formData.name || !formData.context) return

    setIsSubmitting(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Usuário não logado')

      if (editingCampaignId) {
        const { error } = await supabase
          .from('campaigns')
          .update({
            name: formData.name,
            context: formData.context,
            ai_prompt: formData.ai_prompt,
          })
          .eq('id', editingCampaignId)

        if (error) throw error
      } else {
        const { data: workspaceData } = await supabase
          .from('workspaces').select('id').eq('owner_id', userData.user.id).single()

        if (!workspaceData) throw new Error('Workspace não encontrado')

        const { error } = await supabase.from('campaigns').insert([{
          name: formData.name,
          context: formData.context,
          ai_prompt: formData.ai_prompt,
          prompt_template: formData.ai_prompt || 'Seja direto e persuasivo.',
          workspace_id: workspaceData.id
        }])

        if (error) throw error
      }

      setFormData({ name: '', context: '', ai_prompt: '' })
      setIsModalOpen(false)
      fetchCampaigns()

    } catch (error: any) {
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Erro ao salvar',
        message: `Houve um erro ao processar a campanha: ${error.message}`,
        onConfirm: null
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8 relative">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="gradient-text text-3xl font-bold">Campanhas</h1>
          <p className="text-muted-foreground mt-2">Gerencie suas campanhas de prospecção</p>
        </div>
        <Button variant="gradient" onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" /> Nova Campanha
        </Button>
      </motion.div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-gray-800 bg-secondary/20">
          <p className="text-muted-foreground mb-4">Nenhuma campanha encontrada.</p>
          <Button variant="outline" onClick={handleOpenCreate}>Criar primeira campanha</Button>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign, index) => (
            <motion.div key={campaign.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Card className="glass-card hover:border-primary/50 transition-all group h-full flex flex-col relative">
                <CardHeader className="flex flex-row items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <Badge
                      variant={campaign.status === 'active' ? 'success' : 'secondary'}
                      className={campaign.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : ''}
                    >
                      {campaign.status === 'active' ? 'Ativa' : 'Pausada'}
                    </Badge>
                  </div>
                  
                  <div className="relative">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpenDropdownId(openDropdownId === campaign.id ? null : campaign.id)}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>

                    <AnimatePresence>
                      {openDropdownId === campaign.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setOpenDropdownId(null)} />
                          <motion.div initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }} className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-[#0F172A] shadow-xl z-50 overflow-hidden">
                            <button onClick={() => handleOpenEdit(campaign)} className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-secondary/50 flex items-center gap-2 transition-colors">
                              <Edit className="h-4 w-4" /> Editar Campanha
                            </button>
                            <button onClick={() => triggerDeleteCampaign(campaign.id)} className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors border-t border-border/50">
                              <Trash2 className="h-4 w-4" /> Excluir Campanha
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4 flex-1 flex flex-col">
                  <p className="text-sm text-muted-foreground line-clamp-2">{campaign.context}</p>

                  <div className="flex items-center gap-4 text-sm mt-auto py-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{campaign.leads_count || 0} leads</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>0 enviados</span>
                    </div>
                  </div>

                  {campaign.ai_prompt && (
                    <div className="rounded-lg bg-secondary/30 p-3 border border-border/50">
                      <div className="flex items-center gap-2 text-xs font-medium text-accent mb-1">
                        <Sparkles className="h-3 w-3" /> Prompt da IA
                      </div>
                      <p className="text-sm line-clamp-2 text-muted-foreground">{campaign.ai_prompt}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant={campaign.status === 'active' ? 'outline' : 'gradient'}
                      size="sm"
                      className="flex-1"
                      onClick={() => handleToggleStatus(campaign.id, campaign.status)}
                    >
                      {campaign.status === 'active' ? (
                        <><Pause className="mr-1 h-3 w-3" /> Pausar</>
                      ) : (
                        <><Play className="mr-1 h-3 w-3" /> Iniciar</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* MODAL DE CRIAÇÃO E EDIÇÃO */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-[#0F172A] p-6 shadow-2xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{editingCampaignId ? 'Editar Campanha' : 'Nova Campanha'}</h2>
                  <p className="text-sm text-muted-foreground">{editingCampaignId ? 'Ajuste os parâmetros da sua campanha.' : 'Crie uma nova campanha de prospecção guiada por IA.'}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="h-8 w-8 rounded-full">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="campaign-name">Nome da Campanha</Label>
                  <Input id="campaign-name" placeholder="Ex: Outbound SaaS Q1" className="bg-secondary/20 focus:bg-secondary/40 transition-colors" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campaign-context">Contexto (Obrigatório)</Label>
                  <Textarea id="campaign-context" placeholder="Descreva o contexto e objetivo da campanha..." rows={3} className="bg-secondary/20 focus:bg-secondary/40 transition-colors resize-none" value={formData.context} onChange={(e) => setFormData((prev) => ({ ...prev, context: e.target.value }))} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campaign-prompt">
                    <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /> Regras de Tom/Voz (Opcional)</div>
                  </Label>
                  <Textarea id="campaign-prompt" placeholder="Ex: Seja extremamente direto, evite jargões, e use um tom informal." rows={3} className="bg-secondary/20 focus:bg-secondary/40 transition-colors resize-none" value={formData.ai_prompt} onChange={(e) => setFormData((prev) => ({ ...prev, ai_prompt: e.target.value }))} />
                </div>

                <div className="flex gap-3 pt-4 mt-6 border-t border-border/50">
                  <Button variant="ghost" className="flex-1 hover:bg-secondary/50" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancelar</Button>
                  <Button variant="gradient" className="flex-1" onClick={handleSaveCampaign} disabled={!formData.name || !formData.context || isSubmitting}>
                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : editingCampaignId ? 'Atualizar Campanha' : 'Criar Campanha'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE ALERTA MODERNO E DINÂMICO */}
      <AnimatePresence>
        {alertModal.isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-background/80 backdrop-blur-sm" 
              onClick={() => alertModal.type !== 'danger_confirm' && setAlertModal({ ...alertModal, isOpen: false })} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-[#0F172A] p-6 shadow-2xl flex flex-col items-center text-center"
            >
              {/* Ícones Dinâmicos */}
              {alertModal.type === 'warning' && <AlertTriangle className="h-14 w-14 text-amber-500 mb-4" />}
              {alertModal.type === 'error' && <AlertTriangle className="h-14 w-14 text-red-500 mb-4" />}
              {alertModal.type === 'info' && <Info className="h-14 w-14 text-[#00D4FF] mb-4" />}
              {alertModal.type === 'success' && <CheckCircle2 className="h-14 w-14 text-emerald-500 mb-4" />}
              {alertModal.type === 'danger_confirm' && <Trash2 className="h-14 w-14 text-red-500 mb-4" />}

              <h2 className="text-xl font-bold text-foreground mb-2">{alertModal.title}</h2>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                {alertModal.message}
              </p>

              {/* Botões de Ação */}
              {alertModal.type === 'danger_confirm' ? (
                <div className="flex gap-3 w-full">
                  <Button 
                    variant="ghost" 
                    className="flex-1 hover:bg-secondary/50"
                    onClick={() => setAlertModal({ ...alertModal, isOpen: false })}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                    onClick={alertModal.onConfirm || undefined}
                  >
                    Sim, Excluir
                  </Button>
                </div>
              ) : (
                <Button 
                  variant={alertModal.type === 'error' ? 'destructive' : 'gradient'} 
                  className="w-full" 
                  onClick={() => setAlertModal({ ...alertModal, isOpen: false })}
                >
                  Entendi
                </Button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}