import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Target, TrendingUp, Zap, Loader2, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '../lib/supabase'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

export function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    totalLeads: 0,
    qualifiedLeads: 0,
    activeCampaigns: 0
  })
  
  const [goals, setGoals] = useState({
    qualified: 50,
    total: 200
  })
  
  const [recentLeads, setRecentLeads] = useState<any[]>([])

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true)

        // 1. Obtém o usuário e o Workspace vinculado
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) return

        const { data: workspace } = await supabase
          .from('workspaces')
          .select('id, goal_qualified_leads, goal_total_leads')
          .eq('owner_id', user.id)
          .single()

        if (workspace) {
          setGoals({
            qualified: workspace.goal_qualified_leads || 50,
            total: workspace.goal_total_leads || 200
          })

          // 2. Busca leads filtrando pelo ID do Workspace ativo (Evita vazamento de dados)
          const { data: leads, error: leadsError } = await supabase
            .from('leads')
            .select('*')
            .eq('workspace_id', workspace.id) // FILTRO CRÍTICO
            .order('created_at', { ascending: false })

          if (leadsError) throw leadsError

          // 3. Busca campanhas ativas filtrando pelo Workspace
          const { count: activeCampsCount, error: campsError } = await supabase
            .from('campaigns')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', workspace.id) // FILTRO CRÍTICO
            .eq('status', 'active')

          if (campsError) throw campsError

          if (leads) {
            const total = leads.length
            const qualified = leads.filter(lead => lead.status === 'qualified').length

            setMetrics({
              totalLeads: total,
              qualifiedLeads: qualified,
              activeCampaigns: activeCampsCount || 0
            })

            setRecentLeads(leads.slice(0, 5))
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const stats = [
    { title: 'Total de Leads', value: loading ? '-' : metrics.totalLeads.toString(), change: 'Base geral', icon: Users, color: 'text-primary' },
    { title: 'Leads Qualificados', value: loading ? '-' : metrics.qualifiedLeads.toString(), change: 'Prontos para fechamento', icon: Target, color: 'text-emerald-500' },
    { title: 'Taxa de Conversão', value: loading || metrics.totalLeads === 0 ? '-' : `${Math.round((metrics.qualifiedLeads / metrics.totalLeads) * 100)}%`, change: 'Leads qualificados / Total', icon: TrendingUp, color: 'text-[#00D4FF]' },
    { title: 'Campanhas Ativas', value: loading ? '-' : metrics.activeCampaigns.toString(), change: 'Rodando no momento', icon: Zap, color: 'text-amber-400' },
  ]

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(dateString))
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="gradient-text text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Visão geral do seu pipeline de pré-vendas</p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <motion.div variants={container} initial="hidden" animate="show" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <motion.div key={stat.title} variants={item}>
                <Card className="glass-card hover:border-primary/50 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-2">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="glass-card h-[350px] flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Atividade Recente</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto pr-2">
                  {recentLeads.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground text-sm border border-dashed border-border/50 rounded-lg bg-secondary/10">
                      Nenhuma atividade recente nesta empresa.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentLeads.map((lead) => (
                        <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/50 hover:bg-secondary/40 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#0066FF] flex items-center justify-center text-xs font-bold text-white">
                              {lead.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{lead.name}</p>
                              <p className="text-xs text-muted-foreground">{lead.company || 'Empresa não informada'}</p>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground text-right">{formatDate(lead.created_at)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Card className="glass-card h-[350px]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-accent" /> Metas do Workspace</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8 mt-4">
                    <div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="font-medium text-foreground">Leads Qualificados</span>
                        <span className="text-accent font-bold">{metrics.qualifiedLeads} / {goals.qualified}</span>
                      </div>
                      <div className="h-3 rounded-full bg-secondary/50 border border-border/50 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((metrics.qualifiedLeads / goals.qualified) * 100, 100)}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="font-medium text-foreground">Volume Total</span>
                        <span className="text-[#00D4FF] font-bold">{metrics.totalLeads} / {goals.total}</span>
                      </div>
                      <div className="h-3 rounded-full bg-secondary/50 border border-border/50 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((metrics.totalLeads / goals.total) * 100, 100)}%` }}
                          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                          className="h-full bg-gradient-to-r from-[#00D4FF] to-[#0066FF]"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </>
      )}
    </div>
  )
}