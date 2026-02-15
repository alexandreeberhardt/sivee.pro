import { useTranslation } from 'react-i18next'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, Trash2, X, Briefcase } from 'lucide-react'
import { ExperienceItem, createEmptyExperience } from '../../types'
import { useItemSortable } from '../../hooks/useItemSortable'
import SortableItem from '../SortableItem'

interface ExperienceEditorProps {
  items: ExperienceItem[]
  onChange: (items: ExperienceItem[]) => void
}

export default function ExperienceEditor({ items, onChange }: ExperienceEditorProps) {
  const { t } = useTranslation()
  const { sensors, handleDragEnd, itemIds } = useItemSortable({ items, onChange })

  const addItem = () => {
    onChange([...items, createEmptyExperience()])
  }

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof ExperienceItem, value: string | string[]) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  const addHighlight = (index: number) => {
    const updated = [...items]
    updated[index].highlights = [...updated[index].highlights, '']
    onChange(updated)
  }

  const removeHighlight = (expIndex: number, hlIndex: number) => {
    const updated = [...items]
    updated[expIndex].highlights = updated[expIndex].highlights.filter((_, i) => i !== hlIndex)
    onChange(updated)
  }

  const updateHighlight = (expIndex: number, hlIndex: number, value: string) => {
    const updated = [...items]
    updated[expIndex].highlights[hlIndex] = value
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {items.map((exp, index) => (
            <SortableItem key={exp.id} id={exp.id}>
              <div className="bg-primary-50/50 border border-primary-100 rounded-xl p-3 sm:p-5 pl-10 sm:pl-14">
                <button
                  onClick={() => removeItem(index)}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 text-primary-400 hover:text-error-500
                             hover:bg-error-50 rounded-lg transition-colors"
                  title={t('editors.experience.deleteExperience')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-5 pr-8 sm:pr-10">
                  <div className="form-group">
                    <label className="label">{t('editors.experience.position')}</label>
                    <input
                      type="text"
                      value={exp.title}
                      onChange={(e) => updateItem(index, 'title', e.target.value)}
                      placeholder={t('editors.experience.positionPlaceholder')}
                      className="input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">{t('editors.experience.company')}</label>
                    <input
                      type="text"
                      value={exp.company}
                      onChange={(e) => updateItem(index, 'company', e.target.value)}
                      placeholder={t('editors.experience.companyPlaceholder')}
                      className="input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">{t('editors.experience.dates')}</label>
                    <input
                      type="text"
                      value={exp.dates}
                      onChange={(e) => updateItem(index, 'dates', e.target.value)}
                      placeholder={t('editors.experience.datesPlaceholder')}
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="label mb-0 text-sm">{t('editors.experience.highlights')}</label>
                    <button
                      onClick={() => addHighlight(index)}
                      className="text-sm font-medium text-primary-600 hover:text-primary-800
                                 flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">{t('common.add')}</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {exp.highlights.map((hl, hlIndex) => (
                      <div key={hlIndex} className="flex items-center gap-2 group">
                        <div className="w-1.5 h-1.5 bg-primary-300 rounded-full flex-shrink-0 hidden sm:block" />
                        <input
                          type="text"
                          value={hl}
                          onChange={(e) => updateHighlight(index, hlIndex, e.target.value)}
                          placeholder={t('editors.experience.highlightPlaceholder')}
                          className="input flex-1 text-sm"
                        />
                        <button
                          onClick={() => removeHighlight(index, hlIndex)}
                          className="p-1.5 text-primary-400 sm:text-primary-300 hover:text-error-500
                                     sm:opacity-0 sm:group-hover:opacity-100 transition-all flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {exp.highlights.length === 0 && (
                      <p className="text-xs sm:text-sm text-primary-400 italic py-2">
                        {t('editors.experience.noHighlights')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </SortableItem>
          ))}
        </SortableContext>
      </DndContext>

      <button
        onClick={addItem}
        className="w-full py-4 border-2 border-dashed border-primary-200 rounded-xl
                   text-primary-500 hover:border-primary-400 hover:text-primary-700
                   hover:bg-primary-50/50 transition-all flex items-center justify-center gap-2"
      >
        <Briefcase className="w-5 h-5" />
        {t('editors.experience.addExperience')}
      </button>
    </div>
  )
}
