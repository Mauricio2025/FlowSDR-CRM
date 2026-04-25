import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { motion } from 'framer-motion'
import type { Lead } from '@/lib/supabase'
import { KanbanColumn } from './KanbanColumn'
import { LeadCard } from './LeadCard'

const columns: { id: Lead['status']; title: string }[] = [
  { id: 'base', title: 'Base' },
  { id: 'mapped', title: 'Lead Mapeado' },
  { id: 'contacting', title: 'Tentando Contato' },
  { id: 'qualified', title: 'Qualificado' },
]

interface KanbanBoardProps {
  leads: Lead[]
  onLeadClick: (lead: Lead) => void
  onLeadMove: (leadId: string, newStatus: Lead['status']) => void
}

export function KanbanBoard({ leads, onLeadClick, onLeadMove }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const leadId = active.id as string
    const overId = over.id as string

    // Check if dropped on a column
    const isColumn = columns.some((col) => col.id === overId)
    if (isColumn) {
      onLeadMove(leadId, overId as Lead['status'])
      return
    }

    // Check if dropped on another lead
    const overLead = leads.find((l) => l.id === overId)
    if (overLead) {
      onLeadMove(leadId, overLead.status)
    }
  }

  const activeLead = leads.find((l) => l.id === activeId)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-1 gap-4 overflow-x-auto pb-4"
      >
        {columns.map((column, index) => {
          const columnLeads = leads.filter((lead) => lead.status === column.id)
          return (
            <SortableContext
              key={column.id}
              items={columnLeads.map((l) => l.id)}
              strategy={verticalListSortingStrategy}
            >
              <KanbanColumn
                id={column.id}
                title={column.title}
                count={columnLeads.length}
                index={index}
              >
                {columnLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onClick={() => onLeadClick(lead)}
                  />
                ))}
              </KanbanColumn>
            </SortableContext>
          )
        })}
      </motion.div>

      <DragOverlay>
        {activeLead ? (
          <LeadCard lead={activeLead} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
