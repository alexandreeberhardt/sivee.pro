import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSectionManager } from './useSectionManager';
import type { ResumeData, CVSection } from '../types';

// Mock createSection to return predictable IDs
vi.mock('../types', async () => {
  const actual = await vi.importActual('../types');
  let counter = 0;
  return {
    ...actual,
    createSection: (type: string, title: string) => ({
      id: `mock-id-${++counter}`,
      type,
      title,
      isVisible: true,
      items: type === 'summary' || type === 'languages' ? '' : [],
    }),
  };
});

const makeSections = (): CVSection[] => [
  { id: 'sec-1', type: 'education', title: 'Education', isVisible: true, items: [] },
  { id: 'sec-2', type: 'experiences', title: 'Experience', isVisible: true, items: [] },
  { id: 'sec-3', type: 'skills', title: 'Skills', isVisible: true, items: { categories: [] } as any },
];

const makeData = (): ResumeData => ({
  personal: { name: '', title: '', location: '', email: '', phone: '', links: [] },
  sections: makeSections(),
  template_id: 'harvard',
});

describe('useSectionManager', () => {
  let mockSetData: ReturnType<typeof vi.fn>;
  let mockSetShowAddModal: ReturnType<typeof vi.fn>;
  let mockSetEditorStep: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSetData = vi.fn();
    mockSetShowAddModal = vi.fn();
    mockSetEditorStep = vi.fn();
  });

  const renderSectionManager = (hasImported = false) =>
    renderHook(() =>
      useSectionManager({
        setData: mockSetData,
        setShowAddModal: mockSetShowAddModal,
        hasImported,
        setEditorStep: mockSetEditorStep,
      })
    );

  describe('handleDragEnd', () => {
    it('reorders sections when active.id !== over.id', () => {
      const { result } = renderSectionManager();

      act(() => {
        result.current.handleDragEnd({
          active: { id: 'sec-1' },
          over: { id: 'sec-3' },
        } as any);
      });

      expect(mockSetData).toHaveBeenCalledTimes(1);

      // Extract the updater function and verify it reorders correctly
      const updater = mockSetData.mock.calls[0][0];
      const data = makeData();
      const updated = updater(data);

      // sec-1 should have moved after sec-3
      expect(updated.sections.map((s: CVSection) => s.id)).toEqual(['sec-2', 'sec-3', 'sec-1']);
    });

    it('does nothing when active.id === over.id', () => {
      const { result } = renderSectionManager();

      act(() => {
        result.current.handleDragEnd({
          active: { id: 'sec-1' },
          over: { id: 'sec-1' },
        } as any);
      });

      expect(mockSetData).not.toHaveBeenCalled();
    });

    it('does nothing when over is null', () => {
      const { result } = renderSectionManager();

      act(() => {
        result.current.handleDragEnd({
          active: { id: 'sec-1' },
          over: null,
        } as any);
      });

      expect(mockSetData).not.toHaveBeenCalled();
    });
  });

  describe('updateSection', () => {
    it('merges updates into the matching section', () => {
      const { result } = renderSectionManager();

      act(() => {
        result.current.updateSection('sec-2', { title: 'Work Experience', isVisible: false });
      });

      expect(mockSetData).toHaveBeenCalledTimes(1);

      const updater = mockSetData.mock.calls[0][0];
      const data = makeData();
      const updated = updater(data);

      const updatedSection = updated.sections.find((s: CVSection) => s.id === 'sec-2');
      expect(updatedSection.title).toBe('Work Experience');
      expect(updatedSection.isVisible).toBe(false);
      // Other sections remain unchanged
      expect(updated.sections.find((s: CVSection) => s.id === 'sec-1').title).toBe('Education');
    });
  });

  describe('deleteSection', () => {
    it('removes the section by id', () => {
      const { result } = renderSectionManager();

      act(() => {
        result.current.deleteSection('sec-2');
      });

      expect(mockSetData).toHaveBeenCalledTimes(1);

      const updater = mockSetData.mock.calls[0][0];
      const data = makeData();
      const updated = updater(data);

      expect(updated.sections).toHaveLength(2);
      expect(updated.sections.map((s: CVSection) => s.id)).toEqual(['sec-1', 'sec-3']);
    });
  });

  describe('addSection', () => {
    it('adds a new section and closes the modal', () => {
      const { result } = renderSectionManager(false);

      act(() => {
        result.current.addSection('projects', 'Projects');
      });

      expect(mockSetData).toHaveBeenCalledTimes(1);
      expect(mockSetShowAddModal).toHaveBeenCalledWith(false);

      const updater = mockSetData.mock.calls[0][0];
      const data = makeData();
      const updated = updater(data);

      expect(updated.sections).toHaveLength(4);
      const newSection = updated.sections[3];
      expect(newSection.type).toBe('projects');
      expect(newSection.title).toBe('Projects');
    });

    it('sets editorStep to 1 when hasImported is false', () => {
      const { result } = renderSectionManager(false);

      act(() => {
        result.current.addSection('education', 'Education');
      });

      expect(mockSetEditorStep).toHaveBeenCalledWith(1);
    });

    it('does not set editorStep when hasImported is true', () => {
      const { result } = renderSectionManager(true);

      act(() => {
        result.current.addSection('education', 'Education');
      });

      expect(mockSetEditorStep).not.toHaveBeenCalled();
    });
  });
});
