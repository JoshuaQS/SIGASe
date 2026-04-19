import { useCallback, useId, useRef, useState, type PointerEvent } from 'react'
import {
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Sparkles,
} from 'lucide-react'

import Composer from '@/features/dashboard/components/composer/composer'
import type {
  DashboardAnalysisMetadataResponse,
  DashboardAnalysisRequest,
  DashboardAnalysisResponse,
  DashboardExportFormat,
} from '@/features/dashboard/api/dashboard-api'
import GlassSurface from '@/shared/components/reactbits/glass-surface'
import { Card, CardDescription, CardTitle } from '@/shared/components/ui/card'
import { AnimatedGradientText } from '@/shared/components/ui/animated-gradient-text'
import { Button } from '@/shared/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover'
import { cn } from '@/shared/lib/utils'

type Ripple = { id: number; x: number; y: number }

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
  const shellRef = useRef<HTMLDivElement>(null)
  const rippleSeq = useRef(0)
  const [ripples, setRipples] = useState<Ripple[]>([])
  const [composerOpen, setComposerOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [composerResetSignal, setComposerResetSignal] = useState(0)

  const spawnRipple = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || disabled || !metadata) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const element = shellRef.current
      if (!element) return

      const rect = element.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const id = ++rippleSeq.current

      setRipples((prev) => [...prev, { id, x, y }])
      window.setTimeout(() => {
        setRipples((prev) => prev.filter((ripple) => ripple.id !== id))
      }, 650)
    },
    [disabled, metadata],
  )

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
      <GlassSurface
        width='100%'
        height={92}
        borderRadius={10}
        borderWidth={0.08}
        brightness={58}
        opacity={0.9}
        blur={10}
        displace={0.45}
        backgroundOpacity={0.1}
        saturation={1.2}
        performanceMode='lite'
        className={cn(
          'group relative w-full overflow-hidden shadow-2xl transition-[box-shadow,transform] duration-300 ease-in-out',
          disabled || !metadata
            ? 'cursor-not-allowed opacity-70'
            : 'cursor-pointer',
          !disabled && metadata && 'hover:shadow-xl',
        )}
      >
        <div
          ref={shellRef}
          role='button'
          tabIndex={disabled || !metadata ? -1 : 0}
          onPointerDown={spawnRipple}
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
          className='relative flex h-[92px] w-full flex-col'
        >
          <div className='pointer-events-none absolute inset-x-0 top-0 z-[2] h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent' />
          <div className='relative z-10 flex h-full w-full items-center px-4 py-3'>
            <span
              className='pointer-events-none absolute inset-0 z-[5] overflow-hidden rounded-[inherit]'
              aria-hidden
            >
              {ripples.map((ripple) => (
                <span
                  key={ripple.id}
                  className='pointer-events-none absolute'
                  style={{
                    left: ripple.x,
                    top: ripple.y,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <span className='block size-14 rounded-full bg-primary/25 animate-rippling' />
                </span>
              ))}
            </span>

            <div className='flex min-w-0 flex-1 items-center gap-3 sm:gap-4'>
              <div className='relative flex h-13 w-13 shrink-0 items-center justify-center rounded-lg border-2 border-border/20 bg-card/80 shadow-sm ring-1 ring-border/10 backdrop-blur-sm'>
                <Sparkles
                  className={cn(
                    'size-8 overflow-visible',
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

              <div className='min-w-0 flex-1 flex flex-col gap-1'>
                <CardTitle className='flex flex-wrap items-center gap-1 text-xl font-semibold sm:text-2xl'>
                  <AnimatedGradientText className='text-lg font-semibold sm:text-xl'>
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
                </CardTitle>
                <CardDescription className='-mt-0.5 text-sm sm:text-sm'>
                  {summaryLabel}
                </CardDescription>
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
        </div>
      </GlassSurface>

      {metadata ? (
        <Composer
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
