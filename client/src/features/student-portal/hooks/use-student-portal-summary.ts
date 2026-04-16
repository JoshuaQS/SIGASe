import { useCallback, useEffect, useState } from 'react'

import {
  getStudentPortalSummary,
  type StudentPortalSummaryResponse,
} from '@/features/student-portal/api/student-portal-api'

type StudentPortalSummaryState = {
  data: StudentPortalSummaryResponse | null
  loading: boolean
  error: string | null
}

function resolveErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  return 'No se pudo cargar el resumen del portal.'
}

export function useStudentPortalSummary() {
  const [state, setState] = useState<StudentPortalSummaryState>({
    data: null,
    loading: true,
    error: null,
  })

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const response = await getStudentPortalSummary()
      setState({ data: response, loading: false, error: null })
    } catch (error) {
      setState({ data: null, loading: false, error: resolveErrorMessage(error) })
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { ...state, refresh }
}

