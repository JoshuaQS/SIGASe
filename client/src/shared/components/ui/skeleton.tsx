import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/shared/lib/utils'

export const skeletonSizeClasses = {
  line: 'h-2.5',
  pillSm: 'h-3 w-16',
  pillMd: 'h-3 w-20',
  pillLg: 'h-3 w-24',
  value: 'h-6 w-12',
  block: 'h-16 w-full',
} as const

const skeletonVariants = cva('animate-pulse', {
  variants: {
    variant: {
      default: 'rounded-md',
      line: 'rounded-md',
      pill: 'rounded-full',
      value: 'rounded-md',
      block: 'rounded-md',
    },
    size: {
      auto: '',
      line: skeletonSizeClasses.line,
      pillSm: skeletonSizeClasses.pillSm,
      pillMd: skeletonSizeClasses.pillMd,
      pillLg: skeletonSizeClasses.pillLg,
      value: skeletonSizeClasses.value,
      block: skeletonSizeClasses.block,
    },
    tone: {
      muted: 'bg-muted',
      primary: 'bg-primary/35',
      success: 'bg-emerald-100',
      danger: 'bg-rose-300/80',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'auto',
    tone: 'muted',
  },
})

type SkeletonProps = React.ComponentProps<'div'> &
  VariantProps<typeof skeletonVariants>

function Skeleton({ className, variant, tone, ...props }: SkeletonProps) {
  return (
    <div
      data-slot='skeleton'
      className={cn(skeletonVariants({ variant, tone }), className)}
      {...props}
    />
  )
}

export { Skeleton }
