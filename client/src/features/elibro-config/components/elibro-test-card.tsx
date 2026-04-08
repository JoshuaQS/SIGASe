import { useMemo, useState } from 'react'
import { Cable, Link2, Mail, PlayCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Button } from '@/shared/components/ui/button'
import Terminal, { type TerminalLine } from '@/shared/components/ui/terminal'

type ValidationState = {
  status: 'idle' | 'loading' | 'success' | 'error'
  message: string
  latency?: number
  checkedAt?: string
}

type ControlledValidationOutcome = {
  ok: boolean
  statusCode: number
  message: string
  latencyMs?: number
  redirectUrl?: string | null
  errorCode?: string | null
  requestId?: string | null
  correlationId?: string | null
  testUser: string
  nextUrl?: string | null
}

interface ElibroTestCardProps {
  endpoint: string
  validation: ValidationState
  canValidate: boolean
  onValidateConnection?: (payload: { testUser: string; nextUrl?: string }) => Promise<ControlledValidationOutcome>
}

function formatConsoleTime(date = new Date()) {
  return date.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

const ElibroTestCard = ({ endpoint, validation, canValidate, onValidateConnection }: ElibroTestCardProps) => {
  const [testUser, setTestUser] = useState('')
  const [testNext, setTestNext] = useState('')
  const [executionLines, setExecutionLines] = useState<TerminalLine[]>([])

  const inputLines = useMemo<TerminalLine[]>(() => {
    const lines: TerminalLine[] = [
      {
        id: 'help-command',
        kind: 'command',
        tone: 'default',
        text: 'probe-sso --help',
      },
      {
        id: 'help-usage',
        kind: 'output',
        tone: 'muted',
        text: 'usage: probe-sso --email="alumno@utez.edu.mx" [--next="https://..."]',
      },
    ]

    if (testUser.trim()) {
      lines.push({
        id: 'input-email',
        kind: 'command',
        tone: 'default',
        text: `export SSO_TEST_EMAIL="${testUser.trim()}"`,
      })
    }

    if (testNext.trim()) {
      lines.push({
        id: 'input-next',
        kind: 'command',
        tone: 'default',
        text: `export SSO_TEST_NEXT="${testNext.trim()}"`,
      })
    }

    return lines
  }, [testNext, testUser])

  const terminalLines = useMemo(() => [...inputLines, ...executionLines], [executionLines, inputLines])

  const handleValidateClick = async () => {
    const normalizedTestUser = testUser.trim()
    if (!normalizedTestUser || !onValidateConnection) return

    const normalizedNext = testNext.trim()
    const startedAt = formatConsoleTime()

    setExecutionLines([
      {
        id: 'run-command',
        kind: 'command',
        tone: 'default',
        text: `probe-sso --email "$SSO_TEST_EMAIL"${normalizedNext ? ' --next "$SSO_TEST_NEXT"' : ''}`,
      },
      {
        id: 'run-start',
        kind: 'output',
        tone: 'info',
        text: `[${startedAt}] iniciando prueba SSO controlada`,
      },
      {
        id: 'run-validate',
        kind: 'output',
        tone: 'muted',
        text: `[${startedAt}] payload valido • email=${normalizedTestUser}`,
      },
      {
        id: 'run-request',
        kind: 'output',
        tone: 'muted',
        text: `[${startedAt}] POST ${endpoint}`,
      },
    ])
    const result = await onValidateConnection({
      testUser: normalizedTestUser,
      ...(normalizedNext ? { nextUrl: normalizedNext } : {}),
    })

    const finishedAt = formatConsoleTime()
    const resultLines: TerminalLine[] = [
      {
        id: 'result-status',
        kind: 'output',
        tone: result.ok ? 'success' : 'error',
        text: `[${finishedAt}] < HTTP ${result.statusCode}`,
      },
    ]

    if (result.latencyMs != null) {
      resultLines.push({
        id: 'result-latency',
        kind: 'output',
        tone: result.ok ? 'success' : 'warning',
        text: `[${finishedAt}] latency ${result.latencyMs} ms`,
      })
    }

    if (result.redirectUrl) {
      resultLines.push({
        id: 'result-redirect',
        kind: 'output',
        tone: 'success',
        text: `[${finishedAt}] redirect -> ${maskUrl(result.redirectUrl)}`,
      })
    }

    if (result.requestId) {
      resultLines.push({
        id: 'result-request-id',
        kind: 'output',
        tone: 'muted',
        text: `[${finishedAt}] request-id ${maskIdentifier(result.requestId)}`,
      })
    }

    if (result.correlationId) {
      resultLines.push({
        id: 'result-correlation-id',
        kind: 'output',
        tone: 'muted',
        text: `[${finishedAt}] correlation-id ${maskIdentifier(result.correlationId)}`,
      })
    }

    if (result.errorCode) {
      resultLines.push({
        id: 'result-error-code',
        kind: 'output',
        tone: 'warning',
        text: `[${finishedAt}] error-code ${result.errorCode}`,
      })
    }

    resultLines.push({
      id: 'result-final',
      kind: 'output',
      tone: result.ok ? 'success' : 'error',
      text: `[${finishedAt}] ${result.ok ? 'flujo SSO completado' : result.message}`,
    })

    setExecutionLines((previous) => [...previous, ...resultLines])
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <PlayCircle className="h-4 w-4 text-primary" />
            Prueba controlada SSO
          </CardTitle>
          <p className="text-[13px] leading-5 text-muted-foreground">
            Ejecuta una sola prueba del flujo SSO con un correo institucional y un `next` opcional.
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 2xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)_auto] 2xl:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="test-user" className="text-sm font-medium">
              Correo institucional
            </Label>
            <Input
              id="test-user"
              value={testUser}
              onChange={(event) => setTestUser(event.target.value)}
              placeholder="alumno@utez.edu.mx"
              className="font-mono"
              startAdornment={<Mail className="h-4 w-4" />}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="test-next" className="text-sm font-medium">
              Next URL
            </Label>
            <Input
              id="test-next"
              value={testNext}
              onChange={(event) => setTestNext(event.target.value)}
              placeholder="Opcional"
              className="font-mono"
              startAdornment={<Link2 className="h-4 w-4" />}
            />
          </div>

          <Button
            variant="outline"
            size="md"
            className="gap-2 2xl:min-w-[170px]"
            disabled={!canValidate || !testUser.trim()}
            isLoading={validation.status === 'loading'}
            onClick={() => void handleValidateClick()}
          >
            {validation.status !== 'loading' ? <Cable className="h-4 w-4" /> : null}
            {validation.status === 'loading' ? 'Probando conexión…' : 'Ejecutar prueba'}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-5">
          <Terminal
            lines={terminalLines}
            emptyMessage={'usage: probe-sso --email="alumno@utez.edu.mx" [--next="https://..."]'}
            shellLabel="sso-probe - zsh"
            userLabel="adminti@sigase"
            pathLabel="~"
            showPrompt={terminalLines.length === 2}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export default ElibroTestCard

function maskIdentifier(value: string) {
  if (value.length <= 10) return value
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

function maskUrl(value: string) {
  try {
    const url = new URL(value)
    const pathname = url.pathname.length > 24 ? `${url.pathname.slice(0, 24)}...` : url.pathname
    return `${url.origin}${pathname}`
  } catch {
    return value.length > 48 ? `${value.slice(0, 48)}...` : value
  }
}
