import { useEffect, useState } from 'react'
import { Search, Loader2, } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'

export function Topbar() {
  const [workspaceName, setWorkspaceName] = useState('Carregando...')
  const [workspaceLetter, setWorkspaceLetter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchWorkspace() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
          .from('workspaces')
          .select('name')
          .eq('owner_id', user.id)
          .single()

        if (error) throw error

        if (data) {
          setWorkspaceName(data.name)
          setWorkspaceLetter(data.name.charAt(0).toUpperCase())
        }
      } catch (error) {
        console.error('Erro ao buscar workspace:', error)
        setWorkspaceName('Meu Workspace')
        setWorkspaceLetter('W')
      } finally {
        setLoading(false)
      }
    }

    fetchWorkspace()
  }, [])

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
      {/* Identificador do Workspace (Estático) */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-secondary/30 border border-border/50">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#00D4FF] to-[#0066FF] text-[10px] font-black text-white shadow-sm">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : workspaceLetter}
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold leading-none">
              Workspace Ativo
            </span>
            <span className="text-sm font-semibold text-foreground leading-tight">
              {workspaceName}
            </span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative w-64 hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar no sistema..."
            className="h-9 pl-10 bg-secondary/20 border-border/40 focus:border-[#00D4FF]/50 focus:ring-[#00D4FF]/20 transition-all"
          />
        </div>
      </div>
    </header>
  )
}