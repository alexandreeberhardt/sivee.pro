import { ResumeData, CVSection, SectionType, createSection } from '../types';
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

interface UseSectionManagerOptions {
  setData: React.Dispatch<React.SetStateAction<ResumeData>>;
  setShowAddModal: (v: boolean) => void;
  hasImported: boolean;
  setEditorStep: (v: number) => void;
}

export function useSectionManager({
  setData,
  setShowAddModal,
  hasImported,
  setEditorStep,
}: UseSectionManagerOptions) {
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setData((prev) => {
        const oldIndex = prev.sections.findIndex((s) => s.id === active.id);
        const newIndex = prev.sections.findIndex((s) => s.id === over.id);
        return {
          ...prev,
          sections: arrayMove(prev.sections, oldIndex, newIndex),
        };
      });
    }
  };

  const updateSection = (sectionId: string, updates: Partial<CVSection>) => {
    setData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, ...updates } : s
      ),
    }));
  };

  const deleteSection = (sectionId: string) => {
    setData((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== sectionId),
    }));
  };

  const addSection = (type: SectionType, title: string) => {
    const newSection = createSection(type, title);
    setData((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));
    setShowAddModal(false);
    if (!hasImported) {
      setEditorStep(1);
    }
  };

  return { handleDragEnd, updateSection, deleteSection, addSection };
}
