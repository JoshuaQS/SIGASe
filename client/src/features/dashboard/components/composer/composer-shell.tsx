import { useId, useState } from 'react'
import {
  Download,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Sparkles,
} from 'lucide-react'

import { DashboardAnalysisComposer } from '@/features/dashboard/components/composer'
import type {
  DashboardAnalysisMetadataResponse,
  DashboardAnalysisRequest,
  DashboardAnalysisResponse,
  DashboardExportFormat,
} from '@/features/dashboard/api/dashboard-api'
import { Card } from '@/shared/components/ui/card'
import { AnimatedGradientText } from '@/shared/components/ui/animated-gradient-text'
import { Button } from '@/shared/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover'
import { cn } from '@/shared/lib/utils'

type ComposerShellProps = {
  metadata: DashboardAnalysisMetadataResponse | null
  currentAnalysis: DashboardAnalysisResponse | null
  hasAppliedFilter?: boolean
  disabled?: boolean
  onApply: (request: DashboardAnalysisRequest) => Promise<boolean> | boolean
  onReset: () => Promise<void> | void
  onExport?: (format: DashboardExportFormat) => Promise<void> | void
  exportDisabled?: boolean
}

const ComposerShell = ({
  metadata,
  currentAnalysis,
  hasAppliedFilter = false,
  disabled = false,
  onApply,
  onReset,
  onExport,
  exportDisabled = false,
}: ComposerShellProps) => {
  const gradId = useId().replace(/:/g, '')
  const arrowGradId = `${gradId}-arrow`
  const [composerOpen, setComposerOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [composerResetSignal, setComposerResetSignal] = useState(0)

  const summaryLabel =
    'Ajusta el filtrado para poder visualizar y descargar las estadísticas de accesos a eLibro mostradas dinámicamente en el panel de monitoreo.'
  const lastAppliedSummary =
    hasAppliedFilter && currentAnalysis
      ? `${currentAnalysis.summary.scope} · ${currentAnalysis.summary.mode} · ${currentAnalysis.summary.accessResult}`
      : null
  const widgetTitles =
    currentAnalysis?.widgets.map((widget) => widget.type) ?? []
  const canShowInlineActions =
    hasAppliedFilter && Boolean(currentAnalysis) && Boolean(onExport)

  return (
    <Card className='border-0 bg-transparent p-0 shadow-none'>
      <Card
        className={cn(
          'group relative h-[70px] w-full overflow-hidden border bg-card p-0 transition-all duration-200',
          disabled || !metadata
            ? 'cursor-not-allowed opacity-70'
            : 'cursor-pointer',
          !disabled && metadata && 'hover:shadow-lg',
        )}
      >
        <div
          role='button'
          tabIndex={disabled || !metadata ? -1 : 0}
          data-testid='open-dashboard-composer'
          onClick={() => {
            if (!disabled && metadata) {
              setComposerOpen(true)
            }
          }}
          onKeyDown={(event) => {
            if (disabled || !metadata) return
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              setComposerOpen(true)
            }
          }}
          className='relative flex h-[70px] w-full items-center px-4 py-2'
        >
          <div className='flex min-w-0 flex-1 items-center gap-3 sm:gap-4'>
            <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted/60'>
              <Sparkles
                className={cn(
                  'h-5 w-5 overflow-visible',
                  'motion-safe:animate-hue-slow motion-reduce:animate-none',
                )}
                color={`url(#${gradId})`}
                strokeWidth={2}
                aria-hidden
              >
                <defs>
                  <linearGradient
                    id={gradId}
                    x1='0'
                    y1='0'
                    x2='24'
                    y2='24'
                    gradientUnits='userSpaceOnUse'
                  >
                    <stop offset='0%' stopColor='#ffaa40' />
                    <stop offset='100%' stopColor='#9c40ff' />
                  </linearGradient>
                </defs>
              </Sparkles>
            </div>

            <div className='min-w-0 flex-1'>
              <div className='flex items-center gap-1'>
                <AnimatedGradientText className='truncate text-base font-bold leading-none sm:text-lg'>
                  Compositor de análisis
                </AnimatedGradientText>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke={`url(#${arrowGradId})`}
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  className={cn(
                    'size-4 shrink-0 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5',
                    'motion-safe:animate-hue-slow motion-reduce:animate-none',
                  )}
                  aria-hidden='true'
                >
                  <defs>
                    <linearGradient
                      id={arrowGradId}
                      x1='0'
                      y1='0'
                      x2='24'
                      y2='24'
                      gradientUnits='userSpaceOnUse'
                    >
                      <stop offset='0%' stopColor='#ffaa40' />
                      <stop offset='50%' stopColor='#9c40ff' />
                      <stop offset='100%' stopColor='#ffaa40' />
                    </linearGradient>
                  </defs>
                  <path d='M17 12H3' />
                  <path d='m11 18 6-6-6-6' />
                  <path d='M21 5v14' />
                </svg>
              </div>
              <p className='mt-1 line-clamp-1 text-xs text-muted-foreground'>
                {summaryLabel}
              </p>
            </div>

            {canShowInlineActions ? (
              <div className='ml-auto flex shrink-0 items-center gap-2 self-center'>
                  <Popover open={exportOpen} onOpenChange={setExportOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        disabled={exportDisabled}
                        onClick={(event) => event.stopPropagation()}
                        className='gap-2'
                      >
                        <Download className='h-4 w-4' />
                        Descargar filtrados
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align='end'
                      className='w-[200px] p-2'
                      onOpenAutoFocus={(event) => event.preventDefault()}
                      onInteractOutside={(event) => event.stopPropagation()}
                    >
                      <div className='space-y-1'>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='w-full justify-start gap-2'
                          disabled={exportDisabled}
                          onClick={(event) => {
                            event.stopPropagation()
                            setExportOpen(false)
                            void onExport?.('CSV')
                          }}
                        >
                          <FileText className='h-4 w-4' />
                          Descargar CSV
                        </Button>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='w-full justify-start gap-2'
                          disabled={exportDisabled}
                          onClick={(event) => {
                            event.stopPropagation()
                            setExportOpen(false)
                            void onExport?.('XLSX')
                          }}
                        >
                          <FileSpreadsheet className='h-4 w-4' />
                          Descargar XLSX
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={(event) => {
                      event.stopPropagation()
                      setComposerResetSignal((prev) => prev + 1)
                      void onReset()
                    }}
                    className='gap-2'
                  >
                    <RotateCcw className='h-4 w-4' />
                    Reiniciar
                  </Button>
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      {metadata ? (
        <DashboardAnalysisComposer
          open={composerOpen}
          onOpenChange={setComposerOpen}
          metadata={metadata}
          currentLayoutLabel={currentAnalysis?.layoutType ?? null}
          lastAppliedSummary={lastAppliedSummary}
          currentWidgets={widgetTitles}
          resetSignal={composerResetSignal}
          onApply={onApply}
          onReset={onReset}
        />
      ) : null}
    </Card>
  )
}

export default ComposerShell
