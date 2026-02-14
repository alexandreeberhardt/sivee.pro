import { useState } from 'react'
import { ResumeData } from '../types'
import { useTranslation } from 'react-i18next'

const API_URL = import.meta.env.DEV ? '/api' : ''

interface UsePdfGenerationOptions {
  data: ResumeData
  setError: (v: string | null) => void
  onLimitError?: () => void
}

export function usePdfGeneration({ data, setError, onLimitError }: UsePdfGenerationOptions) {
  const { t, i18n } = useTranslation()
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('access_token')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...data, lang: i18n.language.substring(0, 2) }),
      })

      if (!response.ok) {
        const errData = await response.json()
        if (response.status === 429) {
          onLimitError?.()
          const detail: string = errData.detail || ''
          if (detail.includes('Guest')) {
            throw new Error(t('guest.downloadLimitReached'))
          }
          throw new Error(t('guest.downloadLimitReachedUser'))
        }
        throw new Error(errData.detail || t('errors.generation'))
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const fileName = data.personal.name
        ? `${data.personal.name.trim().replace(/\s+/g, '_')}_CV.pdf`
        : 'CV.pdf'
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return { loading, handleGenerate }
}
