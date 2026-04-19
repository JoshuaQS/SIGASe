'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import GlassSurface from '@/shared/components/reactbits/glass-surface';
import { cn } from '@/shared/lib/utils';
import './elibro-cta-card.css';

type ElibroCtaCardProps = {
  onTrigger: () => Promise<void> | void;
  busy?: boolean;
  disabled?: boolean;
  statusMessage: string;
  errorMessage?: string | null;
  onRetry?: () => Promise<void> | void;
  className?: string;
  glassPerformanceMode?: 'full' | 'lite';
};

type ButtonPhase = 'idle' | 'exploding';

type SparkSpec = {
  sx: string;
  sy: string;
  dx: string;
  dy: string;
  delay: string;
  size: string;
};

const SPARKS: SparkSpec[] = [
  { sx: '8%', sy: '12%', dx: '-10px', dy: '-20px', delay: '-0.15s', size: '4px' },
  { sx: '28%', sy: '4%', dx: '0px', dy: '-22px', delay: '-0.45s', size: '3px' },
  { sx: '54%', sy: '2%', dx: '8px', dy: '-20px', delay: '-0.05s', size: '3px' },
  { sx: '82%', sy: '10%', dx: '13px', dy: '-12px', delay: '-0.7s', size: '4px' },
  { sx: '98%', sy: '34%', dx: '24px', dy: '-2px', delay: '-0.2s', size: '3px' },
  { sx: '99%', sy: '64%', dx: '21px', dy: '6px', delay: '-0.9s', size: '4px' },
  { sx: '86%', sy: '92%', dx: '12px', dy: '18px', delay: '-0.3s', size: '3px' },
  { sx: '56%', sy: '98%', dx: '2px', dy: '24px', delay: '-0.6s', size: '3px' },
  { sx: '30%', sy: '97%', dx: '-4px', dy: '20px', delay: '-0.12s', size: '4px' },
  { sx: '8%', sy: '88%', dx: '-14px', dy: '16px', delay: '-0.5s', size: '3px' },
  { sx: '1%', sy: '65%', dx: '-20px', dy: '6px', delay: '-0.95s', size: '4px' },
  { sx: '2%', sy: '34%', dx: '-19px', dy: '-8px', delay: '-0.35s', size: '3px' },
];

const EXPLOSION_MS = 700;
const REDUCED_MOTION_MS = 120;

type EnergyElibroCtaButtonProps = {
  onTrigger: () => Promise<void> | void;
  busy?: boolean;
  disabled?: boolean;
};

function EnergyElibroCtaButton({ onTrigger, busy = false, disabled = false }: EnergyElibroCtaButtonProps) {
  const [phase, setPhase] = useState<ButtonPhase>('idle');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [buttonSize, setButtonSize] = useState({ width: 100, height: 46 });
  const timerRef = useRef<number | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const gradientId = useId().replace(/:/g, '-');

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const target = buttonRef.current;
    if (!target) return;

    const syncSize = () => {
      const rect = target.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      setButtonSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };

    syncSize();
    const resizeObserver = new ResizeObserver(syncSize);
    resizeObserver.observe(target);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const shards = useMemo(() => {
    return Array.from({ length: 32 }, (_, index) => {
      const angle = (360 / 32) * index;
      const distance = 72 + (index % 6) * 18;
      const width = 4 + (index % 3);
      const height = 8 + (index % 4) * 2;
      const delay = (index % 5) * 16;

      return {
        angle: `${angle}deg`,
        distance: `${distance}px`,
        width: `${width}px`,
        height: `${height}px`,
        delay: `${delay}ms`,
      };
    });
  }, []);

  const runSequence = useCallback(async () => {
    if (disabled || busy || phase !== 'idle') return;

    setPhase('exploding');

    timerRef.current = window.setTimeout(async () => {
      try {
        await onTrigger();
      } finally {
        setPhase('idle');
      }
    }, reducedMotion ? REDUCED_MOTION_MS : EXPLOSION_MS);
  }, [busy, disabled, onTrigger, phase, reducedMotion]);

  const isBlocked = disabled || busy || phase !== 'idle';
  const edgeStroke = 2.2;
  const edgeInset = edgeStroke / 2;
  const edgeRadius = Math.max(0, 16 - edgeInset);
  const edgeWidth = Math.max(1, buttonSize.width - edgeStroke);
  const edgeHeight = Math.max(1, buttonSize.height - edgeStroke);

  return (
    <div className="wrapper">
      <button
        ref={buttonRef}
        type="button"
        className={[
          'button',
          busy ? 'busy' : '',
          phase === 'exploding' ? 'exploding' : '',
          reducedMotion ? 'reduced' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={runSequence}
        disabled={isBlocked}
        aria-label="Entrar a eLibro"
        aria-busy={busy || phase === 'exploding'}
      >
        <span className="edgeField" aria-hidden>
          <svg className="edgeSvg" viewBox={`0 0 ${buttonSize.width} ${buttonSize.height}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3dfbff" />
                <stop offset="42%" stopColor="#ffe34f" />
                <stop offset="75%" stopColor="#b8ff3b" />
                <stop offset="100%" stopColor="#3dfbff" />
              </linearGradient>
            </defs>
            <rect
              className="edgePulse"
              x={edgeInset}
              y={edgeInset}
              width={edgeWidth}
              height={edgeHeight}
              rx={edgeRadius}
              pathLength="100"
              stroke={`url(#${gradientId})`}
            />
          </svg>
        </span>

        <span className="sparkField" aria-hidden>
          {SPARKS.map((spark, index) => (
            <span
              key={`spark-${index}`}
              className="spark"
              style={
                {
                  '--sx': spark.sx,
                  '--sy': spark.sy,
                  '--dx': spark.dx,
                  '--dy': spark.dy,
                  '--sd': spark.delay,
                  '--ss': spark.size,
                } as CSSProperties
              }
            />
          ))}
        </span>

        <span className="label">{busy ? 'Entrando...' : 'Entrar a eLibro'}</span>

        <span className="icon">
          {busy ? <Loader2 className="h-5 w-5 animate-spin text-[#ecfffe]" /> : <ArrowRight className="h-5 w-5" />}
        </span>

        {phase === 'exploding' && !reducedMotion && (
          <span className="explosion" aria-hidden>
            <span className="flash" />
            {shards.map((shard, index) => (
              <span
                key={`shard-${index}`}
                className="shard"
                style={
                  {
                    '--angle': shard.angle,
                    '--dist': shard.distance,
                    '--sw': shard.width,
                    '--sh': shard.height,
                    '--delay': shard.delay,
                  } as CSSProperties
                }
              />
            ))}
          </span>
        )}
      </button>
    </div>
  );
}

export default function ElibroCtaCard({
  onTrigger,
  busy = false,
  disabled = false,
  statusMessage,
  errorMessage,
  onRetry,
  className,
  glassPerformanceMode = 'full',
}: ElibroCtaCardProps) {
  return (
    <section id="section-elibro" className={cn('elibro-cta-card', className)}>
      <GlassSurface
        width="100%"
        height="auto"
        borderRadius={28}
        borderWidth={0.08}
        brightness={58}
        opacity={0.9}
        blur={10}
        displace={0.45}
        backgroundOpacity={0.1}
        saturation={1.2}
        performanceMode={glassPerformanceMode}
        className="w-full"
      >
        <Card className="relative flex w-full min-h-[340px] flex-col items-center justify-center overflow-hidden rounded-3xl border border-white/40 bg-white/10 px-6 py-10 text-center shadow-none backdrop-blur-none dark:border-white/10 dark:bg-slate-950/15 lg:px-12 lg:py-16">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 xl:mb-8">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              Servicio eLibro en línea
            </span>
          </div>

          <h1 className="max-w-4xl text-balance text-3xl font-black tracking-tight text-foreground lg:text-4xl 2xl:text-5xl">
            Accede a tu{' '}
            <span className="bg-gradient-to-r from-primary via-info to-primary bg-[length:200%_auto] animate-shimmer bg-clip-text text-transparent">
              Biblioteca Digital
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground lg:text-lg xl:text-xl">
            Acceso directo al acervo de eLibro mediante tu identidad institucional. Explora
            miles de recursos académicos sin fricciones.
          </p>

          <div className="mt-9 w-full sm:max-w-md">
            <EnergyElibroCtaButton onTrigger={onTrigger} busy={busy} disabled={disabled} />
          </div>

          <div className="mt-6 flex items-center text-sm font-medium text-muted-foreground lg:text-base">
            <ShieldCheck className="mr-2 h-4 w-4 text-primary/80" />
            {statusMessage}
          </div>

          {errorMessage && onRetry ? (
            <button
              type="button"
              onClick={() => void onRetry()}
              className="mt-5 rounded-xl border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning transition hover:bg-warning/15"
            >
              Reintentar carga de resumen
            </button>
          ) : null}
        </Card>
      </GlassSurface>
    </section>
  );
}
