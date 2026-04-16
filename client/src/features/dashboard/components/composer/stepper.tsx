import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

export interface Step {
  id: string
  label: string
  description?: string
  icon?: React.ElementType
  optional?: boolean
}

export interface StepperProps {
  steps: Step[]
  currentStep: number
  onStepClick?: (index: number) => void
  orientation?: 'horizontal' | 'vertical'
  size?: 'sm' | 'md'
  showLabels?: boolean
  className?: string
}

const H_STEP_CONNECTOR =
  'h-0.5 w-5 shrink-0 transition-colors duration-300 sm:w-7'
const H_STEP_SPACER = 'w-5 shrink-0 sm:w-7'
const H_STEP_COL =
  'flex w-[5.25rem] shrink-0 flex-col items-center sm:w-28'

function stepStatus(
  i: number,
  currentStep: number,
): 'completed' | 'active' | 'upcoming' {
  return i < currentStep ? 'completed' : i === currentStep ? 'active' : 'upcoming'
}

export function StepperHorizontalLabels({
  steps,
  currentStep,
  className,
}: {
  steps: Step[]
  currentStep: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex w-full items-start justify-center',
        className,
      )}
    >
      {steps.map((step, i) => {
        const status = stepStatus(i, currentStep)
        return (
          <React.Fragment key={`${step.id}-label`}>
            {i > 0 && <div className={H_STEP_SPACER} aria-hidden />}
            <div
              className={cn(
                H_STEP_COL,
                'min-w-0 px-0.5 text-center',
              )}
            >
              <p
                className={cn(
                  'text-sm font-semibold leading-tight',
                  status === 'upcoming'
                    ? 'font-medium text-muted-foreground'
                    : 'text-foreground',
                )}
              >
                {step.label}
              </p>
              {step.description ? (
                <p
                  className={cn(
                    'mt-1 text-[11px] leading-snug sm:text-xs',
                    status === 'upcoming'
                      ? 'text-muted-foreground/75'
                      : 'text-muted-foreground',
                  )}
                >
                  {step.description}
                </p>
              ) : null}
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}

function StepIndicator({
  step,
  index,
  status,
  size,
  onClick,
}: {
  step: Step
  index: number
  status: 'completed' | 'active' | 'upcoming'
  size: 'sm' | 'md'
  onClick?: () => void
}) {
  const Icon = step.icon
  const isClickable = onClick && status !== 'active'
  const base =
    size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm'

  const indicator = (
    <div
      className={cn(
        'relative z-[1] flex shrink-0 items-center justify-center rounded-full border-2 font-semibold transition-all duration-200',
        base,
        status === 'completed' &&
          'border-primary bg-primary text-primary-foreground shadow-sm',
        status === 'active' &&
          'border-primary bg-background text-primary shadow-sm ring-[3px] ring-primary/20',
        status === 'upcoming' &&
          'border-border bg-background text-muted-foreground',
      )}
    >
      {status === 'completed' ? (
        <Check className='h-4 w-4' strokeWidth={2.75} />
      ) : status === 'active' && Icon ? (
        <Icon className='h-4 w-4' strokeWidth={2.25} />
      ) : (
        <span className='tabular-nums font-semibold'>{index + 1}</span>
      )}
    </div>
  )

  return isClickable ? (
    <button
      type='button'
      onClick={onClick}
      className='rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
    >
      {indicator}
    </button>
  ) : (
    indicator
  )
}

export function Stepper({
  steps,
  currentStep,
  onStepClick,
  orientation = 'horizontal',
  size = 'md',
  showLabels = true,
  className,
}: StepperProps) {
  const getStatus = (i: number) => stepStatus(i, currentStep)

  if (orientation === 'vertical') {
    return (
      <div className={cn('flex flex-col', className)}>
        {steps.map((step, i) => {
          const status = getStatus(i)
          return (
            <div
              key={step.id}
              className={cn('flex', showLabels && 'gap-3.5')}
            >
              <div className='flex flex-col items-center'>
                <StepIndicator
                  step={step}
                  index={i}
                  status={status}
                  size={size}
                  onClick={
                    onStepClick ? () => onStepClick(i) : undefined
                  }
                />
                {i < steps.length - 1 && (
                  <div
                    className={cn(
                      'my-1.5 w-0.5 flex-1 transition-colors duration-300',
                      showLabels ? 'min-h-12' : 'min-h-8',
                      i < currentStep ? 'bg-primary' : 'bg-border',
                    )}
                  />
                )}
              </div>
              {showLabels ? (
                <div className='min-w-0 pb-7 pt-0.5'>
                  <p
                    className={cn(
                      'text-sm font-semibold leading-tight',
                      status === 'active' && 'text-foreground',
                      status === 'completed' && 'text-foreground',
                      status === 'upcoming' &&
                        'font-medium text-muted-foreground',
                    )}
                  >
                    {step.label}
                    {step.optional && (
                      <span className='ml-1 text-xs font-normal text-muted-foreground'>
                        (opcional)
                      </span>
                    )}
                  </p>
                  {step.description && (
                    <p
                      className={cn(
                        'mt-1 text-xs leading-snug',
                        status === 'upcoming'
                          ? 'text-muted-foreground/80'
                          : 'text-muted-foreground',
                      )}
                    >
                      {step.description}
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)}>
      <div className='flex w-full items-center justify-center'>
        {steps.map((step, i) => (
          <React.Fragment key={step.id}>
            {i > 0 && (
              <div
                className={cn(
                  H_STEP_CONNECTOR,
                  i <= currentStep ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
            <div className={H_STEP_COL}>
              <StepIndicator
                step={step}
                index={i}
                status={getStatus(i)}
                size={size}
                onClick={
                  onStepClick ? () => onStepClick(i) : undefined
                }
              />
            </div>
          </React.Fragment>
        ))}
      </div>

      {showLabels ? (
        <StepperHorizontalLabels
          steps={steps}
          currentStep={currentStep}
          className='mt-4'
        />
      ) : null}
    </div>
  )
}
