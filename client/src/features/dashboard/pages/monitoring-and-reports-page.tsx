import { useState } from 'react'
import { BarChart2, Download, FileSpreadsheet, FileText, RefreshCw } from 'lucide-react'

import { type DashboardExportFormat } from '@/features/dashboard/api/dashboard-api'
import { DashboardAnalysisRenderer } from '@/features/dashboard/components/analysis/dashboard-analysis-renderer'
import ComposerShell from '@/features/dashboard/components/composer/composer-shell'
import { useDashboardAnalysisSession } from '@/features/dashboard/hooks/use-dashboard-analysis-session'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { SectionHeader } from '@/shared/components/ui/section-header'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const MonitoringAndReportsPage = () => {
  const [exportOpen, setExportOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const {
    metadata,
    analysis,
    activeRequest,
    metadataLoading,
    analysisLoading,
    metadataError,
    hasAppliedCustomFilter,
    applyAnalysis,
    refresh,
    resetToBase,
    updateTableControl,
    exportActiveAnalysis,
    retryBootstrap,
  } = useDashboardAnalysisSession()

  const handleExport = async (format: DashboardExportFormat) => {
    if (isExporting) return
    setIsExporting(true)
    try {
      const result = await exportActiveAnalysis(format)
      if (!result) return
      downloadBlob(result.blob, result.filename)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={BarChart2}
        title="Monitoreo y Reportes"
        subtitle="Dashboard adaptativo conectado al backend nuevo de analysis"
        className="mt-3"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="md" onClick={() => { void refresh() }} disabled={!activeRequest || analysisLoading}>
              <RefreshCw className={`size-4 ${analysisLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Popover open={exportOpen} onOpenChange={setExportOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="md" disabled={!activeRequest || analysisLoading || isExporting} isLoading={isExporting}>
                  <Download className="size-4" />
                  Exportar
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[190px] p-2">
                <div className="space-y-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2"
                    disabled={isExporting}
                    onClick={() => {
                      setExportOpen(false)
                      void handleExport('CSV')
                    }}
                  >
                    <FileText className="size-4" />
                    Descargar CSV
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2"
                    disabled={isExporting}
                    onClick={() => {
                      setExportOpen(false)
                      void handleExport('XLSX')
                    }}
                  >
                    <FileSpreadsheet className="size-4" />
                    Descargar XLSX
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        }
      />

      <ComposerShell
        metadata={metadata}
        currentAnalysis={analysis}
        hasAppliedFilter={hasAppliedCustomFilter}
        disabled={metadataLoading}
        onApply={applyAnalysis}
        onReset={resetToBase}
        onExport={(format) => handleExport(format)}
        exportDisabled={!activeRequest || analysisLoading || isExporting}
      />

      {metadataError && !analysis ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No pudimos cargar el panel</CardTitle>
            <CardDescription>
              El bootstrap del dashboard nuevo depende de `metadata` y `analysis`. Puedes reintentar sin recargar la página.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{metadataError}</p>
            <Button type="button" variant="outline" onClick={() => { void retryBootstrap() }} disabled={metadataLoading || analysisLoading}>
              <RefreshCw className={`size-4 ${(metadataLoading || analysisLoading) ? 'animate-spin' : ''}`} />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <DashboardAnalysisRenderer
        analysis={analysis}
        loading={metadataLoading || analysisLoading}
        showAppliedContext={hasAppliedCustomFilter}
        onTableControlChange={(key, patch) => {
          void updateTableControl(key, patch)
        }}
      />
    </div>
  )
}

export default MonitoringAndReportsPage
