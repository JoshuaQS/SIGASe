import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  analyzeDashboard,
  exportDashboardAnalysis,
  getDashboardAnalysisMetadata,
  type DashboardAnalysisMetadataResponse,
  type DashboardAnalysisRequest,
  type DashboardAnalysisResponse,
  type DashboardExportFormat,
  type DashboardTableWidgetControlRequest,
} from '@/features/dashboard/api/dashboard-api'
import { ApiClientError } from '@/shared/lib/http/api-client'
import { useAppToast } from '@/shared/components/ui/app-toast-provider'

type LocalTableControlKey = 'studentActivityTable' | 'careerStudentTable'

function buildDefaultAnalysisRequest(metadata: DashboardAnalysisMetadataResponse): DashboardAnalysisRequest {
  return {
    scope: 'STUDENTS',
    mode: 'ALL',
    studentId: null,
    careerIds: null,
    accessResult: metadata.defaults.accessResult,
    dateFilterType: metadata.defaults.dateFilterType,
    dateFrom: null,
    dateTo: null,
    rankingMode: 'NONE',
    topN: null,
    sortDirection: metadata.defaults.sortDirection,
    widgetControls: null,
  }
}

function buildRequestSignature(request: DashboardAnalysisRequest | null) {
  if (!request) return null

  return JSON.stringify({
    scope: request.scope,
    mode: request.mode,
    studentId: request.studentId ?? null,
    careerIds: request.careerIds ?? null,
    accessResult: request.accessResult ?? null,
    dateFilterType: request.dateFilterType ?? null,
    dateFrom: request.dateFrom ?? null,
    dateTo: request.dateTo ?? null,
    rankingMode: request.rankingMode ?? null,
    topN: request.topN ?? null,
    sortDirection: request.sortDirection ?? null,
  })
}

function mergeWidgetControl(
  request: DashboardAnalysisRequest,
  key: LocalTableControlKey,
  patch: Partial<DashboardTableWidgetControlRequest>,
): DashboardAnalysisRequest {
  const previousControl = request.widgetControls?.[key] ?? null

  return {
    ...request,
    widgetControls: {
      ...request.widgetControls,
      [key]: {
        ...previousControl,
        ...patch,
      },
    },
  }
}

/**
 * Source of truth del panel de monitoreo:
 * - el flujo principal consume exclusivamente /dashboard/analysis/*
 * - activeRequest representa el request aplicado real que gobierna refresh, export y renderer
 * - el wizard solo orquesta estado visual; no reemplaza la validación del backend
 */
export function useDashboardAnalysisSession() {
  const { showToast } = useAppToast()
  const [metadata, setMetadata] = useState<DashboardAnalysisMetadataResponse | null>(null)
  const [analysis, setAnalysis] = useState<DashboardAnalysisResponse | null>(null)
  const [activeRequest, setActiveRequest] = useState<DashboardAnalysisRequest | null>(null)
  const [baseRequest, setBaseRequest] = useState<DashboardAnalysisRequest | null>(null)
  const [metadataLoading, setMetadataLoading] = useState(true)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [metadataError, setMetadataError] = useState<string | null>(null)

  const runAnalysis = useCallback(async (request: DashboardAnalysisRequest, successMessage?: string) => {
    setAnalysisLoading(true)

    try {
      const response = await analyzeDashboard(request)
      setActiveRequest(request)
      setAnalysis(response)

      if (successMessage) {
        showToast({
          severity: 'success',
          title: 'Análisis actualizado',
          description: successMessage,
        })
      }
      return true
    } catch (error) {
      const description =
        error instanceof ApiClientError
          ? `${error.message} (HTTP ${error.status} · ${error.method} ${error.endpoint})`
          : error instanceof Error
            ? error.message
            : 'No se pudo resolver el analysis.'
      showToast({
        severity: 'error',
        title: 'Error cargando analysis',
        description,
      })
      return false
    } finally {
      setAnalysisLoading(false)
    }
  }, [showToast])

  const bootstrap = useCallback(async () => {
    setMetadataLoading(true)
    setMetadataError(null)

    try {
      const response = await getDashboardAnalysisMetadata()
      const initialRequest = buildDefaultAnalysisRequest(response)
      setMetadata(response)
      setBaseRequest(initialRequest)
      await runAnalysis(initialRequest)
    } catch (error) {
      const description =
        error instanceof ApiClientError
          ? `${error.message} (HTTP ${error.status} · ${error.method} ${error.endpoint})`
          : error instanceof Error
            ? error.message
            : 'No se pudo cargar metadata.'
      setMetadataError(description)
      showToast({
        severity: 'error',
        title: 'Error cargando metadata',
        description,
      })
    } finally {
      setMetadataLoading(false)
    }
  }, [runAnalysis, showToast])

  useEffect(() => {
    let cancelled = false

    void getDashboardAnalysisMetadata()
      .then((response) => {
        if (cancelled) return

        const initialRequest = buildDefaultAnalysisRequest(response)
        setMetadata(response)
        setBaseRequest(initialRequest)
        setMetadataError(null)
        void runAnalysis(initialRequest)
      })
      .catch((error) => {
        if (cancelled) return

        const description =
          error instanceof ApiClientError
            ? `${error.message} (HTTP ${error.status} · ${error.method} ${error.endpoint})`
            : error instanceof Error
              ? error.message
              : 'No se pudo cargar metadata.'
        setMetadataError(description)
        showToast({
          severity: 'error',
          title: 'Error cargando metadata',
          description,
        })
      })
      .finally(() => {
        if (!cancelled) {
          setMetadataLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [runAnalysis, showToast])

  const hasAppliedCustomFilter = useMemo(() => {
    const baseSignature = buildRequestSignature(baseRequest)
    const activeSignature = buildRequestSignature(activeRequest)

    return baseSignature !== null && activeSignature !== null && baseSignature !== activeSignature
  }, [activeRequest, baseRequest])

  const refresh = useCallback(async () => {
    if (!activeRequest) return

    await runAnalysis(activeRequest, 'El dashboard adaptativo se recalculó con el filtro actual.')
  }, [activeRequest, runAnalysis])

  const resetToBase = useCallback(async () => {
    if (!metadata) return

    await runAnalysis(buildDefaultAnalysisRequest(metadata), 'Se restauró el overview base del analysis.')
  }, [metadata, runAnalysis])

  const applyAnalysis = useCallback(async (request: DashboardAnalysisRequest) => {
    return runAnalysis(request)
  }, [runAnalysis])

  const updateTableControl = useCallback(async (
    key: LocalTableControlKey,
    patch: Partial<DashboardTableWidgetControlRequest>,
  ) => {
    if (!activeRequest) return

    await runAnalysis(mergeWidgetControl(activeRequest, key, patch))
  }, [activeRequest, runAnalysis])

  const exportActiveAnalysis = useCallback(async (format: DashboardExportFormat) => {
    if (!activeRequest) return null

    try {
      const result = await exportDashboardAnalysis({
        analysis: activeRequest,
        format,
      })

      showToast({
        severity: 'success',
        title: 'Exportación completada',
        description: `Se descargó el archivo ${format}.`,
      })

      return result
    } catch (error) {
      const description = error instanceof Error ? error.message : 'No se pudo exportar el analysis.'
      showToast({
        severity: 'error',
        title: 'Error exportando analysis',
        description,
      })
      return null
    }
  }, [activeRequest, showToast])

  return {
    metadata,
    analysis,
    activeRequest,
    baseRequest,
    metadataLoading,
    analysisLoading,
    metadataError,
    hasAppliedCustomFilter,
    applyAnalysis,
    refresh,
    resetToBase,
    updateTableControl,
    exportActiveAnalysis,
    retryBootstrap: bootstrap,
  }
}
