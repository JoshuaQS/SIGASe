import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

import styles from '@//styles/energy-elibro-cta-button.module.css';

type EnergyElibroCtaButtonProps = {
  onTrigger: () => Promise<void> | void;
  busy?: boolean;
  disabled?: boolean;
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

export function EnergyElibroCtaButton({
  onTrigger,
  busy = false,
  disabled = false,
}: EnergyElibroCtaButtonProps) {
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
      setButtonSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height },
      );
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
  const edgeStroke = 6;
  const edgeInset = edgeStroke / 2;
  const edgeRadius = Math.max(0, 16 - edgeInset);
  const edgeWidth = Math.max(1, buttonSize.width - edgeStroke);
  const edgeHeight = Math.max(1, buttonSize.height - edgeStroke);

  return (
    <div className={styles.wrapper}>
      <button
        ref={buttonRef}
        type="button"
        className={[
          styles.button,
          busy ? styles.busy : '',
          phase === 'exploding' ? styles.exploding : '',
          reducedMotion ? styles.reduced : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={runSequence}
        disabled={isBlocked}
        aria-label="Entrar a eLibro"
        aria-busy={busy || phase === 'exploding'}
      >
        <span className={styles.edgeField} aria-hidden>
          <svg
            className={styles.edgeSvg}
            viewBox={`0 0 ${buttonSize.width} ${buttonSize.height}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6ee7b7" />
                <stop offset="42%" stopColor="#34d399" />
                <stop offset="75%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>
            <rect
              className={styles.edgePulse}
              x={edgeInset}
              y={edgeInset}
              width={edgeWidth}
              height={edgeHeight}
              rx={edgeRadius}
              pathLength={100}
              stroke={`url(#${gradientId})`}
            />
          </svg>
        </span>

        <span className={styles.sparkField} aria-hidden>
          {SPARKS.map((spark, index) => (
            <span
              key={`spark-${index}`}
              className={styles.spark}
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

        <span className={styles.label}>{busy ? 'Entrando...' : 'Entrar a eLibro'}</span>

        <span className={styles.icon}>
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin text-current" />
          ) : (
            <ArrowRight className="h-5 w-5" />
          )}
        </span>

        {phase === 'exploding' && !reducedMotion && (
          <span className={styles.explosion} aria-hidden>
            <span className={styles.flash} />
            {shards.map((shard, index) => (
              <span
                key={`shard-${index}`}
                className={styles.shard}
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
