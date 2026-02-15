import { useMemo } from 'react'
import { DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'

interface UseItemSortableOptions<T extends { id: string }> {
  items: T[]
  onChange: (items: T[]) => void
}

export function useItemSortable<T extends { id: string }>({
  items,
  onChange,
}: UseItemSortableOptions<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const itemIds = useMemo(() => items.map((item) => item.id), [items])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)
      onChange(arrayMove(items, oldIndex, newIndex))
    }
  }

  return { sensors, handleDragEnd, itemIds }
}
