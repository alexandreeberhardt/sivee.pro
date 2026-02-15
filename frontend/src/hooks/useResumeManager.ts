import { useState, useEffect } from 'react'
import { ResumeData, SavedResume, getEmptyResumeData, ensureItemIds } from '../types'
import { listResumes, createResume, updateResume, deleteResume } from '../api/resumes'
import { ApiError } from '../api/client'
import { useTranslation } from 'react-i18next'

interface UseResumeManagerOptions {
  isAuthenticated: boolean
  setData: React.Dispatch<React.SetStateAction<ResumeData>>
  setShowLanding: (v: boolean) => void
  setShowResumesPage: (v: boolean) => void
  setHasImported: (v: boolean) => void
  setEditorStep: (v: number) => void
  setError: (v: string | null) => void
  onLimitError?: () => void
  data: ResumeData
}

export function useResumeManager({
  isAuthenticated,
  setData,
  setShowLanding,
  setShowResumesPage,
  setHasImported,
  setEditorStep,
  setError,
  onLimitError,
  data,
}: UseResumeManagerOptions) {
  const { t } = useTranslation()
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([])
  const [currentResumeId, setCurrentResumeId] = useState<number | null>(null)
  const [saveLoading, setSaveLoading] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [resumeName, setResumeName] = useState('')

  // Load saved resumes when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadSavedResumes()
    } else {
      setSavedResumes([])
      setCurrentResumeId(null)
      setResumeName('')
      setData(getEmptyResumeData())
      setHasImported(false)
      setEditorStep(0)
      setShowResumesPage(false)
      setShowLanding(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const loadSavedResumes = async () => {
    try {
      const response = await listResumes()
      setSavedResumes(response.resumes)
    } catch (err) {
      console.error('Failed to load resumes:', err)
    }
  }

  const handleSaveResume = async () => {
    if (!isAuthenticated) return

    setSaveLoading(true)
    try {
      if (currentResumeId) {
        await updateResume(currentResumeId, {
          json_content: data,
        })
      } else {
        const name = resumeName || data.personal.name || 'Mon CV'
        const newResume = await createResume(name, data)
        setCurrentResumeId(newResume.id)
        setShowSaveModal(false)
      }
      await loadSavedResumes()
      setError(null)
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        onLimitError?.()
        const detail = err.detail || ''
        if (detail.includes('Guest')) {
          setError(t('guest.limitReached'))
        } else {
          setError(t('guest.saveLimitReached'))
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to save resume')
      }
    } finally {
      setSaveLoading(false)
    }
  }

  const handleOpenResume = async (resume: SavedResume) => {
    if (resume.json_content) {
      setData(ensureItemIds(resume.json_content))
      setCurrentResumeId(resume.id)
      setShowResumesPage(false)
      setShowLanding(false)
      setHasImported(true)
      setEditorStep(999)
    }
  }

  const handleDeleteResume = async (resumeId: number) => {
    if (!confirm(t('resumes.deleteConfirm'))) return

    try {
      await deleteResume(resumeId)
      if (currentResumeId === resumeId) {
        setCurrentResumeId(null)
      }
      await loadSavedResumes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete resume')
    }
  }

  const handleRenameResume = async (resumeId: number, newName: string) => {
    try {
      await updateResume(resumeId, { name: newName })
      await loadSavedResumes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename resume')
    }
  }

  const handleNewResume = () => {
    setData(getEmptyResumeData())
    setCurrentResumeId(null)
    setShowResumesPage(false)
    setShowLanding(false)
    setHasImported(false)
    setEditorStep(0)
  }

  return {
    savedResumes,
    currentResumeId,
    saveLoading,
    showSaveModal,
    setShowSaveModal,
    resumeName,
    setResumeName,
    handleSaveResume,
    handleOpenResume,
    handleDeleteResume,
    handleRenameResume,
    handleNewResume,
  }
}
