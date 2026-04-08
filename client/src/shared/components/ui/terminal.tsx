import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/shared/lib/utils'

export type TerminalLine = {
  id: string
  kind: 'command' | 'output'
  text: string
  tone?: 'default' | 'info' | 'success' | 'warning' | 'error' | 'muted'
}

type TerminalProps = {
  lines: TerminalLine[]
  className?: string
  emptyMessage?: string
  shellLabel?: string
  userLabel?: string
  pathLabel?: string
  showPrompt?: boolean
}

const toneClass: Record<NonNullable<TerminalLine['tone']>, string> = {
  default: 'text-zinc-100',
  info: 'text-zinc-300',
  success: 'text-emerald-300',
  warning: 'text-amber-300',
  error: 'text-rose-300',
  muted: 'text-zinc-500',
}

export default function Terminal({
  lines,
  className,
  emptyMessage = 'Esperando entrada...',
  shellLabel = 'bash - zsh',
  userLabel = 'adminti@sigase',
  pathLabel = '~',
  showPrompt = true,
}: TerminalProps) {
  const [renderedTexts, setRenderedTexts] = useState<Record<string, string>>({})
  const renderedTextsRef = useRef<Record<string, string>>({})

  useEffect(() => {
    renderedTextsRef.current = renderedTexts
  }, [renderedTexts])

  useEffect(() => {
    const nextIds = new Set(lines.map((line) => line.id))
    const currentEntries = Object.entries(renderedTextsRef.current).filter(([id]) =>
      nextIds.has(id),
    )
    const filtered = Object.fromEntries(currentEntries)

    if (currentEntries.length !== Object.keys(renderedTextsRef.current).length) {
      renderedTextsRef.current = filtered
      setRenderedTexts(filtered)
    }

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const advanceTyping = () => {
      if (cancelled) return

      const current = renderedTextsRef.current
      const nextLine = lines.find((line) => (current[line.id] ?? '') !== line.text)

      if (!nextLine) return

      const currentText = current[nextLine.id] ?? ''

      if (
        nextLine.text.length < currentText.length ||
        !nextLine.text.startsWith(currentText)
      ) {
        const updated = { ...current, [nextLine.id]: nextLine.text }
        renderedTextsRef.current = updated
        setRenderedTexts(updated)
        timeoutId = setTimeout(advanceTyping, 0)
        return
      }

      const updated = {
        ...current,
        [nextLine.id]: nextLine.text.slice(0, currentText.length + 1),
      }
      renderedTextsRef.current = updated
      setRenderedTexts(updated)
      timeoutId = setTimeout(advanceTyping, 14)
    }

    timeoutId = setTimeout(advanceTyping, 0)

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [lines])

  const visibleLines = useMemo(() => {
    const terminalLines: Array<TerminalLine & { renderedText: string; isTyping: boolean }> = []

    for (const line of lines) {
      const renderedText = renderedTexts[line.id] ?? ''

      if (!renderedText) {
        break
      }

      const isTyping = renderedText !== line.text
      terminalLines.push({ ...line, renderedText, isTyping })

      if (isTyping) {
        break
      }
    }

    return terminalLines
  }, [lines, renderedTexts])

  const activeTypingLineId = visibleLines.find((line) => line.isTyping)?.id ?? null

  const renderPrompt = () => (
    <>
      <span className="font-semibold text-zinc-100">{userLabel}</span>
      <span className="text-zinc-400">:</span>
      <span className="text-zinc-300">{pathLabel}</span>
      <span className="text-zinc-300">$</span>
    </>
  )

  const renderCursor = (tone = 'bg-zinc-200') => (
    <span
      aria-hidden="true"
      className={cn('ml-0.5 inline-block h-[1.05em] w-[0.62ch] align-[-0.15em]', tone)}
      style={{ animation: 'terminal-blink 1s steps(1, end) infinite' }}
    />
  )

  return (
    <div className={cn('overflow-hidden rounded-[1.5rem] border border-zinc-800 bg-[#1c1c1e] shadow-xl shadow-black/15', className)}>
      <style>{'@keyframes terminal-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }'}</style>

      <div className="flex items-center gap-4 border-b border-zinc-700/70 bg-[#2a2d39] px-4 py-3">
        <div className="flex gap-2">
          <span className="h-3.5 w-3.5 rounded-full bg-[#ff5f57]" />
          <span className="h-3.5 w-3.5 rounded-full bg-[#febc2e]" />
          <span className="h-3.5 w-3.5 rounded-full bg-[#28c840]" />
        </div>
        <span className="font-mono text-[11px] font-semibold tracking-[0.02em] text-zinc-300">
          {shellLabel}
        </span>
      </div>

      <div className="min-h-[300px] bg-[#1c1c1e] px-4 py-4 font-mono text-[13px] leading-[1.4]">
        <div className="space-y-0.5">
          {visibleLines.length === 0 ? (
            <>
              <div className="break-words text-zinc-100">
                {renderPrompt()}
                <span className="text-zinc-300">probe-sso --help</span>
              </div>
              <div className="break-words text-zinc-500">{emptyMessage}</div>
              {showPrompt ? <div className="text-zinc-100">{renderPrompt()}{renderCursor()}</div> : null}
            </>
          ) : (
            <>
              {visibleLines.map((line) => {
                if (line.kind === 'command') {
                  return (
                    <div key={line.id} className="break-words text-zinc-100">
                      {renderPrompt()}
                      <span className={toneClass[line.tone ?? 'default']}>{line.renderedText}</span>
                      {line.isTyping ? renderCursor() : null}
                    </div>
                  )
                }

                return (
                  <div key={line.id} className={cn('break-words', toneClass[line.tone ?? 'muted'])}>
                    {line.renderedText}
                    {line.isTyping ? renderCursor('bg-zinc-400') : null}
                  </div>
                )
              })}

              {showPrompt && !activeTypingLineId ? (
                <div className="text-zinc-100">
                  {renderPrompt()}
                  {renderCursor()}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
