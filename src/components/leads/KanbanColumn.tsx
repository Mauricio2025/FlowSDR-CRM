import { useDroppable } from '@dnd-kit/core'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Lead } from '@/lib/supabase'

interface KanbanColumnProps {
  id: Lead['status']
  title: string
  count: number
  index: number
  children: React.ReactNode
}

const columnColors: Record<Lead['status'], string> = {
  base: 'bg-muted-foreground',
  mapped: 'bg-primary',
  contacting: 'bg-amber-400',
  qualified: 'bg-emerald-400',
}

export function KanbanColumn({
  id,
  title,
  count,
  index,
  children,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        'flex h-full w-72 min-w-72 flex-col rounded-xl border border-border bg-card/50',
        isOver && 'border-primary/50 bg-primary/5'
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className={cn('h-2.5 w-2.5 rounded-full', columnColors[id])} />
          <h3 className="font-medium">{title}</h3>
        </div>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-medium">
          {count}
        </span>
      </div>

      {/* Column Content */}
      <ScrollArea className="flex-1 p-3">
        <div className="flex flex-col gap-3">{children}</div>
      </ScrollArea>
    </motion.div>
  )
}
