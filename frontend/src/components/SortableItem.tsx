import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { ReactNode } from 'react'

interface SortableItemProps {
  id: string
  children: ReactNode
}

export default function SortableItem({ id, children }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? 'opacity-90 scale-[1.02] shadow-elevated z-10' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="absolute top-3 left-3 sm:top-4 sm:left-4 p-1 text-primary-300 hover:text-primary-500
                   rounded-lg hover:bg-primary-50 cursor-grab active:cursor-grabbing transition-colors
                   touch-manipulation z-10"
        type="button"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      {children}
    </div>
  )
}
