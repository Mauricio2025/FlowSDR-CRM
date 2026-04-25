import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { Building2, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Lead } from '@/lib/supabase'

interface LeadCardProps {
  lead: Lead
  isDragging?: boolean
  onClick?: () => void
}

export function LeadCard({ lead, isDragging, onClick }: LeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: lead.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'group relative cursor-grab active:cursor-grabbing touch-none rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-xl z-50'
      )}
      onPointerUp={() => { // Removido o 'e' que não estava sendo usado
        if (!isDragging && !isSortableDragging && onClick) {
          onClick()
        }
      }}
    >
      <div className="flex-1 min-w-0 pointer-events-none">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
            {lead.name
              .split(' ')
              .map((n: string) => n[0]) // Tipagem 'string' adicionada aqui
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{lead.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{lead.company}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
          <User className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{lead.role}</span>
        </div>
      </div>
    </motion.div>
  )
}