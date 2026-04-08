"use client"

import { motion, type SpringOptions, useMotionValue, useSpring } from "framer-motion"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { cn } from "@/shared/lib/utils"

export interface BubbleBackgroundProps {
  className?: string
  children?: React.ReactNode
  interactive?: boolean
  transition?: SpringOptions
  colors?: {
    first: string
    second: string
    third: string
    fourth: string
    fifth: string
    sixth: string
  }
}

type BubbleColors = NonNullable<BubbleBackgroundProps["colors"]>

const DEFAULT_TRANSITION: SpringOptions = { stiffness: 100, damping: 20 }

const DEFAULT_COLORS: BubbleColors = {
  first: "18,113,255",
  second: "221,74,255",
  third: "0,220,255",
  fourth: "200,50,50",
  fifth: "180,180,50",
  sixth: "140,100,255",
}

const BUBBLE_COUNT = 42

function hashString(value: string) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function createRandom(seed: number) {
  let state = seed || 1

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

function makeGradient(color: string) {
  return `radial-gradient(circle at center, rgba(${color}, 0.8) 0%, rgba(${color}, 0) 70%)`
}

function createBubbleConfigs(colors: BubbleColors) {
  const colorKeys = Object.keys(colors) as (keyof BubbleColors)[]
  const seed = colorKeys.reduce(
    (accumulator, key) => accumulator ^ hashString(`${key}:${colors[key]}`),
    0x9e3779b9,
  )
  const random = createRandom(seed)

  return Array.from({ length: BUBBLE_COUNT }, (_, index) => {
    const size = 4 + random() * 6

    return {
      id: index,
      size: `${size}%`,
      top: `${random() * 100}%`,
      left: `${random() * 100}%`,
      color: colors[colorKeys[index % colorKeys.length]],
      duration: 20 + random() * 40,
      delay: random() * -20,
      xRange: [random() * -50, random() * 50],
      yRange: [random() * -50, random() * 50],
      opacity: 0.7 + random() * 0.25,
    }
  })
}

export function BubbleBackground({
  className,
  children,
  interactive = false,
  transition = DEFAULT_TRANSITION,
  colors = DEFAULT_COLORS,
}: BubbleBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springX = useSpring(mouseX, transition)
  const springY = useSpring(mouseY, transition)

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      mouseX.set(e.clientX - centerX)
      mouseY.set(e.clientY - centerY)
    },
    [mouseX, mouseY],
  )

  useEffect(() => {
    if (!interactive) return
    const container = containerRef.current
    if (!container) return

    container.addEventListener("mousemove", handleMouseMove)
    return () => container.removeEventListener("mousemove", handleMouseMove)
  }, [interactive, handleMouseMove])

  const bubbleConfigs = useMemo(() => createBubbleConfigs(colors), [colors])

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed inset-0 overflow-hidden bg-gradient-to-br from-violet-950 to-blue-950",
        className,
      )}
    >
      {/* SVG goo filter */}
      <svg className="hidden" aria-hidden="true">
        <defs>
          <filter id="bubble-goo">
            <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="8" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              result="goo"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      {/* Bubbles container with goo filter */}
      <div className="absolute inset-0" style={{ filter: "url(#bubble-goo) blur(10px)" }}>
        {bubbleConfigs.map((config) => (
          <motion.div
            key={config.id}
            className="absolute rounded-full mix-blend-hard-light"
            style={{
              width: config.size,
              height: config.size,
              top: config.top,
              left: config.left,
              background: makeGradient(config.color),
              opacity: config.opacity,
            }}
            animate={{
              x: config.xRange,
              y: config.yRange,
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: config.duration,
              delay: config.delay,
              ease: "easeInOut",
              repeat: Number.POSITIVE_INFINITY,
            }}
          />
        ))}

        {/* Interactive bubble - follows mouse */}
        {interactive && (
          <motion.div
            className="absolute rounded-full mix-blend-hard-light opacity-50"
            style={{
              width: "40%",
              height: "40%",
              background: makeGradient(colors.sixth),
              x: springX,
              y: springY,
              left: "30%",
              top: "30%",
            }}
          />
        )}
      </div>

      {/* Content layer */}
      {children && <div className="relative z-10 h-full w-full">{children}</div>}
    </div>
  )
}

export default function BubbleBackgroundDemo() {
  return <BubbleBackground interactive />
}
