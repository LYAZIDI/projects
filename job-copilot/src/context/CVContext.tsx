import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface ParsedCV {
  name: string
  email: string
  phone: string
  skills: string[]
  experience: { title: string; company: string; period: string; description: string }[]
  education: { degree: string; school: string; year: string }[]
  languages: string[]
  atsScore: number
  atsKeywordsFound: string[]
  atsMissing: string[]
  yearsExperience: number
  sector?: string
}

interface CVContextValue {
  cv: ParsedCV | null
  fileName: string
  setCV: (cv: ParsedCV, fileName: string) => void
  clearCV: () => void
}

const CVContext = createContext<CVContextValue | null>(null)
const STORAGE_KEY = 'jobcopilot_cv'

export function CVProvider({ children }: { children: ReactNode }) {
  const [cv, setRawCV] = useState<ParsedCV | null>(null)
  const [fileName, setFileName] = useState('')

  // Restore from localStorage on mount and sync to server if needed
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const { cv: storedCV, fileName: storedFile } = JSON.parse(stored)
        setRawCV(storedCV)
        setFileName(storedFile)
        // Sync to server (non-blocking) — server may have lost profile on restart
        fetch('http://localhost:3002/api/cv/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cv: storedCV }),
        }).catch(() => { /* ignore if server is down */ })
      }
    } catch { /* ignore */ }
  }, [])

  function setCV(newCV: ParsedCV, newFileName: string) {
    setRawCV(newCV)
    setFileName(newFileName)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ cv: newCV, fileName: newFileName }))
  }

  function clearCV() {
    setRawCV(null)
    setFileName('')
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <CVContext.Provider value={{ cv, fileName, setCV, clearCV }}>
      {children}
    </CVContext.Provider>
  )
}

export function useCV(): CVContextValue {
  const ctx = useContext(CVContext)
  if (!ctx) throw new Error('useCV must be used inside CVProvider')
  return ctx
}
