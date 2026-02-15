import { useTranslation } from 'react-i18next'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, Trash2, Lightbulb } from 'lucide-react'
import { SkillsItem, SkillCategory, createEmptySkillCategory } from '../../types'
import { useItemSortable } from '../../hooks/useItemSortable'
import SortableItem from '../SortableItem'

interface SkillsEditorProps {
  data: SkillsItem
  onChange: (data: SkillsItem) => void
}

export default function SkillsEditor({ data, onChange }: SkillsEditorProps) {
  const { t } = useTranslation()
  const { sensors, handleDragEnd, itemIds } = useItemSortable({ items: data, onChange })

  const addCategory = () => {
    onChange([...data, createEmptySkillCategory()])
  }

  const removeCategory = (index: number) => {
    onChange(data.filter((_, i) => i !== index))
  }

  const updateCategory = (index: number, field: keyof SkillCategory, value: string) => {
    const updated = [...data]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {data.map((item, index) => (
            <SortableItem key={item.id} id={item.id}>
              <div className="bg-primary-50/50 border border-primary-100 rounded-xl p-3 sm:p-5 pl-10 sm:pl-14">
                <button
                  onClick={() => removeCategory(index)}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 text-primary-400 hover:text-error-500
                             hover:bg-error-50 rounded-lg transition-colors"
                  title={t('editors.skills.deleteCategory')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pr-8 sm:pr-10">
                  <div className="form-group">
                    <label className="label">{t('editors.skills.category')}</label>
                    <input
                      type="text"
                      value={item.category}
                      onChange={(e) => updateCategory(index, 'category', e.target.value)}
                      placeholder={t('editors.skills.categoryPlaceholder')}
                      className="input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">{t('editors.skills.skills')}</label>
                    <input
                      type="text"
                      value={item.skills}
                      onChange={(e) => updateCategory(index, 'skills', e.target.value)}
                      placeholder={t('editors.skills.skillsPlaceholder')}
                      className="input"
                    />
                    <p className="text-xs text-primary-400 mt-1.5">{t('editors.skills.skillsHint')}</p>
                  </div>
                </div>
              </div>
            </SortableItem>
          ))}
        </SortableContext>
      </DndContext>

      <button
        onClick={addCategory}
        className="w-full py-4 border-2 border-dashed border-primary-200 rounded-xl
                   text-primary-500 hover:border-primary-400 hover:text-primary-700
                   hover:bg-primary-50/50 transition-all flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        {t('editors.skills.addCategory')}
      </button>

      {data.length === 0 && (
        <p className="text-xs sm:text-sm text-primary-400 italic flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5" />
          {t('editors.skills.emptyHint')}
        </p>
      )}
    </div>
  )
}
