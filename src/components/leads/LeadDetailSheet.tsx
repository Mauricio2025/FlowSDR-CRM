import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Sparkles, Copy, Check, X, Loader2, AlertTriangle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { supabase } from '@/lib/supabase'
import type { Lead } from '@/lib/supabase'

interface LeadDetailSheetProps {
  lead: Lead | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onLeadUpdate?: () => void 
  campaignId: string 
}

const statusLabels: Record<Lead['status'], string> = { base: 'Base', mapped: 'Lead Mapeado', contacting: 'Tentando Contato', qualified: 'Qualificado' }
const statusVariants: Record<Lead['status'], 'secondary' | 'accent' | 'warning' | 'success'> = { base: 'secondary', mapped: 'accent', contacting: 'warning', qualified: 'success' }

export function LeadDetailSheet({ lead, open, onOpenChange, onLeadUpdate, campaignId }: LeadDetailSheetProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedMessage, setGeneratedMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Limpa o estado quando o painel abre/fecha
  useEffect(() => {
    if (open) {
      setGeneratedMessage('')
      setErrorMsg('')
    }
  }, [open, lead])

  // REGRA DE NEGÓCIO: Só permite gerar IA se o lead NÃO estiver na etapa Base
  const isBaseStage = lead?.status === 'base'

  const handleGenerateMessage = async () => {
    if (isBaseStage) return // Trava extra de segurança

    setIsGenerating(true)
    setErrorMsg('')
    
    try {
      const { data: campaign, error: campError } = await supabase.from('campaigns').select('*').eq('id', campaignId).single()
      if (campError) throw new Error('Erro ao buscar dados da campanha.')
      
      const { data, error } = await supabase.functions.invoke('generate-message', {
        body: {
          lead: { name: lead?.name, role: lead?.role, company: lead?.company },
          campaign: { context: campaign.context || '', ai_prompt: campaign.ai_prompt || '' }
        }
      })

      if (error) throw new Error(error.message)
      setGeneratedMessage(data.message)
      
    } catch (err: any) {
      console.error("Erro na IA:", err)
      setErrorMsg(`Falha na IA. Verifique os Logs no Supabase. Detalhe: ${err.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSendEmailAction = async () => {
    if (!lead || !generatedMessage) return
    try {
      const { error } = await supabase.from('leads').update({ status: 'contacting' }).eq('id', lead.id)
      if (error) throw error
      if (onLeadUpdate) onLeadUpdate()
      window.open(`mailto:${lead.email}?subject=Contato FlowSDR&body=${encodeURIComponent(generatedMessage)}`)
      onOpenChange(false)
    } catch (error) {
      alert("Erro ao mover lead para Tentando Contato.")
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedMessage)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AnimatePresence>
      {open && lead && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative z-50 h-full w-full max-w-md border-l border-border bg-[#0F172A] shadow-2xl flex flex-col">
            <div className="p-6 border-b border-border/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#00D4FF] to-[#0066FF] text-lg font-semibold text-white shadow-lg">
                    {lead.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{lead.name}</h2>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">{lead.role} • {lead.company}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-secondary" onClick={() => onOpenChange(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Badge variant={statusVariants[lead.status]} className="w-fit mt-4">{statusLabels[lead.status]}</Badge>
            </div>

            <ScrollArea className="flex-1 p-6">
              <Tabs defaultValue="ai" className="w-full">
                <TabsList className="w-full grid grid-cols-2 mb-6">
                  <TabsTrigger value="info">Informações</TabsTrigger>
                  <TabsTrigger value="ai">Gerar IA</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Informações de Contato</h4>
                    {lead.email ? (
                      <div className="flex items-center gap-3 rounded-lg bg-secondary/30 border border-border/50 p-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{lead.email}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum e-mail cadastrado.</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="ai" className="space-y-6">
                  <div className="space-y-4">
                    
                    {/* AQUI ESTÁ A REGRA DE BLOQUEIO */}
                    {isBaseStage ? (
                      <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-amber-500/30 rounded-lg bg-amber-500/5 mt-4">
                        <AlertTriangle className="h-10 w-10 text-amber-500 mb-3" />
                        <h3 className="font-semibold text-foreground mb-2">Lead na Fase Inicial</h3>
                        <p className="text-sm text-muted-foreground">
                          Para garantir a qualidade da personalização da Inteligência Artificial, por favor preencha os dados de contato do lead e mova-o para a etapa <b>Lead Mapeado</b>.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="h-5 w-5 text-[#00D4FF]" />
                            <h4 className="font-medium text-foreground">Gerador de Mensagens</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">A IA usará os dados da campanha selecionada no Kanban e o contexto atualizado do lead.</p>
                        </div>

                        {errorMsg && <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">{errorMsg}</div>}

                        <Button className="w-full bg-gradient-to-r from-[#00D4FF] to-[#0066FF] hover:opacity-90 text-white border-0" onClick={handleGenerateMessage} disabled={isGenerating}>
                          {isGenerating ? (
                            <>
                              {/* ÍCONE DE CARREGAMENTO OFICIAL (Loader2) */}
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processando com Gemini AI...
                            </>
                          ) : (
                            <><Sparkles className="h-4 w-4 mr-2" /> Gerar Mensagem Única</>
                          )}
                        </Button>

                        {generatedMessage && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 pt-4 border-t border-border/50">
                            <div className="relative">
                              <Textarea value={generatedMessage} onChange={(e) => setGeneratedMessage(e.target.value)} rows={12} className="pr-12 text-sm leading-relaxed bg-secondary/20 resize-none" />
                              <Button variant="ghost" size="icon" className="absolute right-2 top-2 hover:bg-secondary/80 h-8 w-8" onClick={handleCopy}>
                                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                              </Button>
                            </div>

                            <div className="flex gap-2">
                              <Button variant="outline" className="flex-1 hover:bg-secondary/50" onClick={handleGenerateMessage} disabled={isGenerating}>Tentar Novamente</Button>
                              <Button className="flex-1 bg-white text-black hover:bg-gray-200" onClick={handleSendEmailAction}>Abrir E-mail e Enviar</Button>
                            </div>
                          </motion.div>
                        )}
                      </>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </ScrollArea>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}