import { useEffect, useState, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LayoutDashboard, 
  Users, 
  Megaphone, 
  Settings as SettingsIcon,
  LogOut,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

// 1. Removido Settings da navegação principal
const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/leads', icon: Users, label: 'Leads' },
  { to: '/campaigns', icon: Megaphone, label: 'Campanhas' },
]

export function Sidebar() {
  const [userLetter, setUserLetter] = useState('U')
  const [userEmail, setUserEmail] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function getUserData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
        setUserLetter(user.email.charAt(0).toUpperCase())
      }
    }
    getUserData()

    // Fecha o dropdown ao clicar fora dele
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <aside className="flex h-full w-[72px] flex-col items-center border-r border-border bg-[#0B1222] py-6 relative z-50">
      
      {/* Logo com a Imagem icone.png */}
      <div className="mb-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/20 p-2 overflow-hidden"
        >
          <img 
            src="/icone.png" 
            alt="FlowSDR Logo" 
            className="h-full w-full object-contain"
            onError={(e) => {
              // Fallback caso a imagem não exista no caminho
              e.currentTarget.src = "https://cdn-icons-png.flaticon.com/512/6295/6295417.png" 
            }}
          />
        </motion.div>
      </div>

      {/* Navigation - Apenas itens principais */}
      <nav className="flex flex-1 flex-col gap-4">
        {navItems.map((item, index) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'group relative flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <item.icon className="h-5 w-5" />
                </motion.div>
                
                {/* Tooltip */}
                <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg bg-popover px-3 py-1.5 text-sm font-medium text-popover-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50 border border-border/50">
                  {item.label}
                </span>
                
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute -left-[18px] top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#00D4FF]"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Avatar com Dropdown */}
      <div className="mt-auto relative" ref={dropdownRef}>
        <button 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300 border-2",
            isDropdownOpen ? "border-[#00D4FF] scale-110 shadow-[0_0_15px_rgba(0,212,255,0.3)]" : "border-transparent hover:border-border"
          )}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#00D4FF] to-[#0066FF] text-sm font-black text-white shadow-md">
            {userLetter}
          </div>
        </button>

        {/* Dropdown Menu Moderno */}
        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.95 }}
              className="absolute left-full bottom-0 ml-4 w-56 rounded-2xl border border-border bg-[#0F172A] shadow-2xl py-2 z-[100] overflow-hidden"
            >
              {/* Header do Dropdown */}
              <div className="px-4 py-3 border-b border-border/50 mb-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Conta Conectada</p>
                <p className="text-xs font-medium text-foreground truncate mt-0.5">{userEmail}</p>
              </div>

              {/* Opção: Configurações */}
              <button 
                onClick={() => { setIsDropdownOpen(false); navigate('/settings'); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors group"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/30 group-hover:bg-[#00D4FF]/10 group-hover:text-[#00D4FF] transition-colors">
                  <SettingsIcon className="h-4 w-4" />
                </div>
                <span className="flex-1 text-left">Configurações</span>
                <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              {/* Opção: Sair */}
              <button 
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors border-t border-border/50 group"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/5 group-hover:bg-red-500/10 transition-colors">
                  <LogOut className="h-4 w-4" />
                </div>
                <span className="flex-1 text-left font-medium">Sair do Sistema</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  )
}