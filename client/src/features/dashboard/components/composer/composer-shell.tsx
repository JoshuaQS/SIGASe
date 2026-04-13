import { useId, useState } from 'react'
import { ChevronRight, Sparkles } from 'lucide-react'

import Composer from '@/features/dashboard/components/composer/composer'
import type {
  DashboardAnalysisMetadataResponse,
  DashboardAnalysisRequest,
  DashboardAnalysisResponse,
} from '@/features/dashboard/api/dashboard-api'
import { Card, CardDescription, CardTitle } from '@/shared/components/ui/card'
import { AnimatedGradientText } from '@/shared/components/ui/animated-gradient-text'
import { cn } from '@/shared/lib/utils'

type ComposerShellProps = {
  metadata: DashboardAnalysisMetadataResponse | null
  currentAnalysis: DashboardAnalysisResponse | null
  hasAppliedFilter?: boolean
  disabled?: boolean
  onApply: (request: DashboardAnalysisRequest) => Promise<boolean> | boolean
  onReset: () => Promise<void> | void
}

const ComposerShell = ({
  metadata,
  currentAnalysis,
  hasAppliedFilter = false,
  disabled = false,
  onApply,
  onReset,
}: ComposerShellProps) => {
  const gradId = useId().replace(/:/g, '')
  const arrowGradId = `${gradId}-arrow`
  const [composerOpen, setComposerOpen] = useState(false)

  const summaryLabel = 'Ajusta el filtrado para visualizar y exportar las estadísticas de accesos a eLibro mostradas dinámicamente en el panel de monitoreo.'
  const lastAppliedSummary = hasAppliedFilter && currentAnalysis
    ? `${currentAnalysis.summary.scope} · ${currentAnalysis.summary.mode} · ${currentAnalysis.summary.accessResult}`
    : null
  const widgetTitles = currentAnalysis?.widgets.map((widget) => widget.type) ?? []

  return (
    <Card className="border-0 bg-transparent p-0 shadow-none">
      <div
        role="button"
        tabIndex={disabled || !metadata ? -1 : 0}
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
        className={cn(
          'group relative w-full overflow-hidden rounded-xl bg-card px-4 py-3',
          disabled || !metadata ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
          'shadow-md transition-[box-shadow,transform] duration-300 ease-out',
          !disabled && metadata && 'hover:shadow-lg hover:scale-[1.02] motion-reduce:hover:scale-100',
        )}
      >
        <div className="relative">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted/40 shadow-sm backdrop-blur-sm">
              <Sparkles className="size-6 overflow-visible" color={`url(#${gradId})`} strokeWidth={2} aria-hidden>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#ffaa40" />
                    <stop offset="100%" stopColor="#9c40ff" />
                  </linearGradient>
                </defs>
              </Sparkles>
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <CardTitle className="flex flex-wrap items-center gap-1 text-base font-normal sm:text-md">
                <AnimatedGradientText className="text-sm font-medium sm:text-base">
                  Compositor de análisis
                </AnimatedGradientText>
              <ChevronRight
                className={cn(
                  'size-4 shrink-0 transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:scale-[1.06]',
                  'motion-safe:animate-hue-slow motion-reduce:animate-none',
                )}
                color={`url(#${arrowGradId})`}
                aria-hidden
              >
                <defs>
                  <linearGradient
                    id={arrowGradId}
                    x1="0"
                    y1="0"
                    x2="16"
                    y2="16"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stopColor="#ffaa40" />
                    <stop offset="50%" stopColor="#9c40ff" />
                    <stop offset="100%" stopColor="#ffaa40" />
                  </linearGradient>
                </defs>
              </ChevronRight>
              </CardTitle>
              <CardDescription className="text-sm sm:text-xs">
                {summaryLabel}
              </CardDescription>
            </div>
          </div>
        </div>
      </div>
      {metadata ? (
        <Composer
          open={composerOpen}
          onOpenChange={setComposerOpen}
          metadata={metadata}
          currentLayoutLabel={currentAnalysis?.layoutType ?? null}
          lastAppliedSummary={lastAppliedSummary}
          currentWidgets={widgetTitles}
          onApply={onApply}
          onReset={onReset}
        />
      ) : null}
    </Card>
  )
}

export default ComposerShell
