import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Filter, Loader2, X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KanbanBoard } from '@/components/leads/KanbanBoard'
import { LeadDetailSheet } from '@/components/leads/LeadDetailSheet'
import { supabase } from '@/lib/supabase'
import type { Lead, Campaign } from '@/lib/supabase'

export function Leads() {
  // --- Estados de Identificação ---
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  
  // --- Estados de Dados ---
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('')
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  
  // --- Estados de UI ---
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilter, setShowFilter] = useState(false)

  // --- Estados do Modal de Cadastro ---
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false)
  const [isSubmittingLead, setIsSubmittingLead] = useState(false)
  const [newLead, setNewLead] = useState({
    name: '',
    company: '',
    role: '',
    email: '',
    phone: '',
    linkedin: '',
    campaign_id: ''
  })

  // 1. Inicialização: Identifica o Workspace do usuário logado
  useEffect(() => {
    async function initLeadsPage() {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: workspace, error: wsError } = await supabase
          .from('workspaces')
          .select('id')
          .eq('owner_id', user.id)
          .single()

        if (wsError) throw wsError

        if (workspace) {
          setWorkspaceId(workspace.id)
          await fetchCampaigns(workspace.id)
        }
      } catch (error) {
        console.error('Erro ao inicializar página:', error)
      } finally {
        setLoading(false)
      }
    }
    initLeadsPage()
  }, [])

  // 2. Monitoramento: Busca leads sempre que mudar a campanha ou workspace
  useEffect(() => {
    if (selectedCampaignId && workspaceId) {
      fetchLeads(workspaceId)
      setNewLead(prev => ({ ...prev, campaign_id: selectedCampaignId }))
    }
  }, [selectedCampaignId, workspaceId])

  const fetchCampaigns = async (wsId: string) => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('workspace_id', wsId) // Blindagem por Workspace
        .eq('status', 'active')
      
      if (error) throw error
      if (data && data.length > 0) {
        setCampaigns(data as Campaign[])
        setSelectedCampaignId(data[0].id)
      }
    } catch (error) {
      console.error('Erro ao buscar campanhas:', error)
    }
  }

  const fetchLeads = async (wsId: string, showSpinner = true) => {
    if (!selectedCampaignId || !wsId) return
    try {
      if (showSpinner) setLoading(true)
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('workspace_id', wsId) // Blindagem por Workspace
        .eq('campaign_id', selectedCampaignId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setLeads((data as Lead[]) || [])
    } catch (error) {
      console.error('Erro ao buscar leads:', error)
    } finally {
      if (showSpinner) setLoading(false)
    }
  }

  const handleCreateLead = async () => {
    if (!newLead.name || !newLead.company || !newLead.campaign_id || !workspaceId) {
      alert("Preencha Nome, Empresa e selecione a Campanha.")
      return
    }

    setIsSubmittingLead(true)
    try {
      const { error } = await supabase.from('leads').insert([{
        ...newLead,
        status: 'base',
        workspace_id: workspaceId // Injeção automática de segurança
      }])

      if (error) throw error

      setNewLead({ name: '', company: '', role: '', email: '', phone: '', linkedin: '', campaign_id: selectedCampaignId })
      setIsCreateLeadOpen(false)
      fetchLeads(workspaceId)

    } catch (error: any) {
      alert(`Erro ao salvar lead: ${error.message}`)
    } finally {
      setIsSubmittingLead(false)
    }
  }

  const handleLeadMove = async (leadId: string, newStatus: Lead['status']) => {
    // Atualização otimista na UI
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)))

    try {
      const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', leadId)
      if (error) throw error
    } catch (error) {
      console.error('Erro ao mover lead:', error)
      if (workspaceId) fetchLeads(workspaceId, false) 
    }
  }

  const handleInjectMockData = async () => {
    if (!selectedCampaignId || !workspaceId) return
    try {
      const mockData = [
        { name: 'Joaquim Silva', company: 'Pires Tech', role: 'Gerente', email: 'joaquim@pires.com', status: 'base', workspace_id: workspaceId, campaign_id: selectedCampaignId },
        { name: 'Aline Souza', company: 'Inovação SA', role: 'Diretora', email: 'aline@inovacao.com', status: 'mapped', workspace_id: workspaceId, campaign_id: selectedCampaignId }
      ]
      const { error } = await supabase.from('leads').insert(mockData)
      if (error) throw error
      fetchLeads(workspaceId)
    } catch (error: any) {
      alert(`Erro: ${error.message}`)
    }
  }

  const filteredLeads = leads.filter(lead => 
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.company.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex h-full flex-col relative">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="gradient-text text-3xl font-bold">Leads</h1>
            <p className="text-muted-foreground mt-2">Visão por campanha</p>
          </div>
          
          {campaigns.length > 0 && (
            <div className="ml-6 border-l border-border/50 pl-6 hidden sm:block">
              <label className="text-xs text-muted-foreground mb-1 block uppercase font-bold tracking-tighter">Filtro de Campanha</label>
              <select
                className="h-9 rounded-md border border-input bg-secondary/30 px-3 py-1 text-sm focus:ring-2 focus:ring-[#00D4FF] focus:outline-none"
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#0F172A]">{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {campaigns.length > 0 && (
            <>
              {showFilter && (
                <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar lead ou empresa..."
                    className="h-9 w-64 pl-9 bg-secondary/30 border-border/50"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </motion.div>
              )}
              
              <Button variant="outline" size="sm" onClick={() => setShowFilter(!showFilter)}>
                <Filter className="mr-2 h-4 w-4" /> {showFilter ? 'Fechar' : 'Buscar'}
              </Button>
              <Button variant="gradient" size="sm" onClick={() => setIsCreateLeadOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Novo Lead
              </Button>
            </>
          )}
        </div>
      </motion.div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : leads.length === 0 && !searchTerm ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-secondary/10">
          <p className="text-muted-foreground mb-4">Nenhum lead encontrado para esta campanha.</p>
          <Button variant="outline" size="sm" onClick={handleInjectMockData}>Injetar Dados de Teste</Button>
        </div>
      ) : (
        <KanbanBoard leads={filteredLeads} onLeadClick={(l) => { setSelectedLead(l); setIsSheetOpen(true); }} onLeadMove={handleLeadMove} />
      )}

      {selectedLead && (
        <LeadDetailSheet 
          lead={selectedLead} 
          open={isSheetOpen} 
          onOpenChange={setIsSheetOpen}
          onLeadUpdate={() => workspaceId && fetchLeads(workspaceId, false)} 
          campaignId={selectedCampaignId} 
        />
      )}

      {/* --- MODAL DE CADASTRO --- */}
      <AnimatePresence>
        {isCreateLeadOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsCreateLeadOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-lg rounded-2xl border border-border bg-[#0F172A] p-6 shadow-2xl">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold">Adicionar Lead</h2>
                <Button variant="ghost" size="icon" onClick={() => setIsCreateLeadOpen(false)}><X className="h-4 w-4" /></Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Nome Completo</Label>
                    <Input placeholder="Nome" value={newLead.name} onChange={(e) => setNewLead({ ...newLead, name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Empresa</Label>
                    <Input placeholder="Empresa" value={newLead.company} onChange={(e) => setNewLead({ ...newLead, company: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Cargo</Label>
                  <Input placeholder="Ex: Diretor Comercial" value={newLead.role} onChange={(e) => setNewLead({ ...newLead, role: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>E-mail</Label>
                  <Input type="email" placeholder="email@empresa.com" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>WhatsApp</Label>
                    <Input placeholder="(11) 9..." value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>LinkedIn</Label>
                    <Input placeholder="URL do perfil" value={newLead.linkedin} onChange={(e) => setNewLead({ ...newLead, linkedin: e.target.value })} />
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <Button variant="ghost" className="flex-1" onClick={() => setIsCreateLeadOpen(false)}>Cancelar</Button>
                  <Button variant="gradient" className="flex-1" onClick={handleCreateLead} disabled={isSubmittingLead}>
                    {isSubmittingLead ? <Loader2 className="animate-spin" /> : 'Salvar Lead'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}