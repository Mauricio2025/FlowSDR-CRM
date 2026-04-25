import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Filter, Loader2, AlertCircle, X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KanbanBoard } from '@/components/leads/KanbanBoard'
import { LeadDetailSheet } from '@/components/leads/LeadDetailSheet'
import { supabase } from '@/lib/supabase'
import type { Lead, Campaign } from '@/lib/supabase'

export function Leads() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('')
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  // Estados para o Filtro de Busca
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilter, setShowFilter] = useState(false)

  // Estados para o Modal de Novo Lead
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

  // 1. Busca Campanhas ao carregar a página
  useEffect(() => {
    fetchCampaigns()
  }, [])

  // 2. Sempre que a campanha selecionada mudar, carrega os leads dela
  useEffect(() => {
    if (selectedCampaignId) {
      fetchLeads()
      // O formulário de "Novo Lead" já abre com a campanha atual selecionada
      setNewLead(prev => ({ ...prev, campaign_id: selectedCampaignId }))
    } else {
      setLeads([])
      setLoading(false)
    }
  }, [selectedCampaignId])

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase.from('campaigns').select('*').eq('status', 'active')
      if (error) throw error
      if (data && data.length > 0) {
        setCampaigns(data as Campaign[])
        setSelectedCampaignId(data[0].id)
      }
    } catch (error) {
      console.error('Erro ao buscar campanhas:', error)
    }
  }

  const fetchLeads = async (showSpinner = true) => {
    if (!selectedCampaignId) return
    try {
      if (showSpinner) setLoading(true)
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('campaign_id', selectedCampaignId)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setLeads(data as Lead[])
    } catch (error) {
      console.error('Erro ao buscar leads:', error)
    } finally {
      if (showSpinner) setLoading(false)
    }
  }

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead)
    setIsSheetOpen(true)
  }

  // VALIDAÇÃO: Impede transição se faltarem dados obrigatórios
  const validateTransition = (lead: Lead, nextStatus: Lead['status']): { valid: boolean; missing: string[] } => {
    const missing: string[] = []
    if (nextStatus === 'mapped' || nextStatus === 'contacting') {
      if (!lead.name) missing.push('Nome')
      if (!lead.company) missing.push('Empresa')
      if (!lead.role) missing.push('Cargo')
      if (!lead.email) missing.push('E-mail')
    }
    if (nextStatus === 'qualified') {
      if (!lead.phone && !lead.linkedin) missing.push('Telefone ou LinkedIn')
    }
    return { valid: missing.length === 0, missing }
  }

  const handleLeadMove = async (leadId: string, newStatus: Lead['status']) => {
    const lead = leads.find(l => l.id === leadId)
    if (!lead) return

    const validation = validateTransition(lead, newStatus)
    if (!validation.valid) {
      alert(`Transição bloqueada! Preencha: ${validation.missing.join(', ')}`)
      fetchLeads(false) 
      return
    }

    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)))

    try {
      const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', leadId)
      if (error) throw error
    } catch (error) {
      console.error('Erro ao mover lead:', error)
      fetchLeads(false) 
    }
  }

  const handleCreateLead = async () => {
    if (!newLead.name || !newLead.company || !newLead.campaign_id) {
      alert("Por favor, preencha o Nome, Empresa e selecione a Campanha.")
      return
    }

    setIsSubmittingLead(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Usuário não logado')

      const { data: workspaceData } = await supabase.from('workspaces').select('id').eq('owner_id', userData.user.id).single()
      if (!workspaceData) throw new Error('Workspace não encontrado')

      const { error } = await supabase.from('leads').insert([{
        name: newLead.name,
        company: newLead.company,
        role: newLead.role,
        email: newLead.email,
        phone: newLead.phone,
        linkedin: newLead.linkedin,
        campaign_id: newLead.campaign_id,
        status: 'base',
        workspace_id: workspaceData.id
      }])

      if (error) throw error

      setNewLead({ name: '', company: '', role: '', email: '', phone: '', linkedin: '', campaign_id: selectedCampaignId })
      setIsCreateLeadOpen(false)
      
      if (newLead.campaign_id === selectedCampaignId) {
        fetchLeads()
      } else {
        alert("Lead criado com sucesso em outra campanha!")
      }

    } catch (error: any) {
      alert(`Erro ao criar lead: ${error.message}`)
    } finally {
      setIsSubmittingLead(false)
    }
  }

  const handleInjectMockData = async () => {
    if (!selectedCampaignId) {
      alert("Selecione uma campanha primeiro!")
      return
    }
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return
      const { data: workspaceData } = await supabase.from('workspaces').select('id').eq('owner_id', userData.user.id).single()
      if (!workspaceData) return

      const mockData = [
        { name: 'João Silva', company: 'Tech Corp', role: 'CTO', email: 'joao@techcorp.com', status: 'base', workspace_id: workspaceData.id, campaign_id: selectedCampaignId },
        { name: 'Maria Santos', company: 'Startup XYZ', role: 'CEO', email: 'maria@startupxyz.com', status: 'mapped', workspace_id: workspaceData.id, campaign_id: selectedCampaignId },
        { name: 'Pedro Costa', company: 'Empresa ABC', role: 'Diretor', email: 'pedro@abc.com', status: 'contacting', workspace_id: workspaceData.id, campaign_id: selectedCampaignId }
      ]

      const { error } = await supabase.from('leads').insert(mockData)
      if (error) throw error
      fetchLeads()
    } catch (error: any) {
      alert(`Erro ao salvar os leads: ${error.message}`)
    }
  }

  // Filtro de Busca em tempo real
  const filteredLeads = leads.filter(lead => 
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase()))
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
              <label className="text-xs text-muted-foreground mb-1 block">Campanha Ativa</label>
              <select
                className="h-9 rounded-md border border-input bg-secondary/30 px-3 py-1 text-sm text-foreground focus:ring-2 focus:ring-[#00D4FF] focus:outline-none"
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
          {campaigns.length === 0 ? (
            <span className="text-sm text-amber-500 flex items-center gap-2"><AlertCircle className="h-4 w-4"/> Nenhuma campanha ativa no momento</span>
          ) : (
            <>
              {/* FILTRO EM TEMPO REAL */}
              {showFilter && (
                <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar lead ou empresa..."
                    className="h-9 w-64 pl-9 bg-secondary/30 border-border/50 focus:ring-[#00D4FF]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                  />
                </motion.div>
              )}
              
              {leads.length === 0 && !loading && !searchTerm && (
                <Button variant="outline" size="sm" onClick={handleInjectMockData}>Gerar Dados</Button>
              )}
              <Button variant={showFilter ? "secondary" : "outline"} size="sm" onClick={() => { setShowFilter(!showFilter); setSearchTerm(''); }}>
                <Filter className="mr-2 h-4 w-4" /> Filtros
              </Button>
              <Button variant="gradient" size="sm" onClick={() => setIsCreateLeadOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Novo Lead
              </Button>
            </>
          )}
        </div>
      </motion.div>

      {!selectedCampaignId ? (
         <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border bg-secondary/10">
           <p className="text-muted-foreground">Nenhuma campanha selecionada.</p>
         </div>
      ) : loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <KanbanBoard leads={filteredLeads} onLeadClick={handleLeadClick} onLeadMove={handleLeadMove} />
      )}

      {selectedLead && (
        <LeadDetailSheet 
          lead={selectedLead} 
          open={isSheetOpen} 
          onOpenChange={setIsSheetOpen}
          onLeadUpdate={() => fetchLeads(false)} 
          campaignId={selectedCampaignId} 
        />
      )}

      {/* MODAL DE NOVO LEAD */}
      <AnimatePresence>
        {isCreateLeadOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/90 backdrop-blur-sm" onClick={() => setIsCreateLeadOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-[#0F172A] p-6 shadow-2xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Novo Lead</h2>
                  <p className="text-sm text-muted-foreground">Adicione um novo lead e atribua a uma campanha.</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsCreateLeadOpen(false)} className="h-8 w-8 rounded-full">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome <span className="text-red-500">*</span></Label>
                    <Input id="name" placeholder="Ex: João Silva" className="bg-secondary/20" value={newLead.name} onChange={(e) => setNewLead({ ...newLead, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Empresa <span className="text-red-500">*</span></Label>
                    <Input id="company" placeholder="Ex: Tech Corp" className="bg-secondary/20" value={newLead.company} onChange={(e) => setNewLead({ ...newLead, company: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Cargo</Label>
                    <Input id="role" placeholder="Ex: CTO" className="bg-secondary/20" value={newLead.role} onChange={(e) => setNewLead({ ...newLead, role: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" placeholder="joao@empresa.com" className="bg-secondary/20" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" placeholder="(11) 99999-9999" className="bg-secondary/20" value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn URL</Label>
                    <Input id="linkedin" placeholder="linkedin.com/in/joaosilva" className="bg-secondary/20" value={newLead.linkedin} onChange={(e) => setNewLead({ ...newLead, linkedin: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/50">
                  <Label htmlFor="campaign-assign">Atribuir à Campanha <span className="text-red-500">*</span></Label>
                  <select
                    id="campaign-assign"
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00D4FF]"
                    value={newLead.campaign_id}
                    onChange={(e) => setNewLead({ ...newLead, campaign_id: e.target.value })}
                  >
                    <option value="" disabled>Selecione uma campanha...</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#0F172A]">{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4 mt-6 border-t border-border/50">
                  <Button variant="ghost" className="flex-1" onClick={() => setIsCreateLeadOpen(false)} disabled={isSubmittingLead}>
                    Cancelar
                  </Button>
                  <Button variant="gradient" className="flex-1" onClick={handleCreateLead} disabled={!newLead.name || !newLead.company || !newLead.campaign_id || isSubmittingLead}>
                    {isSubmittingLead ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Lead'}
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