'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Check,
  X,
  AlertTriangle,
  Info,
} from 'lucide-react';

/* ─── types ─── */

export type ToastSeverity = 'success' | 'error' | 'warning' | 'info';

export type ToastInput = {
  severity: ToastSeverity;
  title: string;
  description?: string;
};

type ToastContextValue = {
  showToast: (input: ToastInput) => void;
};

export type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<ToastContextValue | null>(null);

/* ─── severity visual config ─── */

export const TOAST_DURATION = 4200;

const SEVERITY: Record<
  ToastSeverity,
  {
    icon: typeof Check;
    iconBg: string;
    iconFg: string;
    progressBg: string;
  }
> = {
  success: {
    icon: Check,
    iconBg: 'bg-success',
    iconFg: 'text-success-foreground',
    progressBg: 'bg-primary',
  },
  error: {
    icon: X,
    iconBg: 'bg-destructive',
    iconFg: 'text-destructive-foreground',
    progressBg: 'bg-destructive',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-warning',
    iconFg: 'text-warning-foreground',
    progressBg: 'bg-warning',
  },
  info: {
    icon: Info,
    iconBg: 'bg-info',
    iconFg: 'text-info-foreground',
    progressBg: 'bg-info',
  },
};

/* ─── severity visual config (exported for reuse) ─── */

export { SEVERITY };

/* ─── single toast ─── */

export function ToastCard({
  item,
  onDismiss,
  style,
}: {
  item: ToastItem;
  onDismiss: () => void;
  style?: React.CSSProperties;
}) {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter');
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainRef = useRef(TOAST_DURATION);
  const startRef = useRef(0);
  const progressRef = useRef<HTMLDivElement>(null);

  const exit = useCallback(() => {
    setPhase('exit');
    setTimeout(onDismiss, 280);
  }, [onDismiss]);

  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase('visible'));
    });
  }, []);

  useEffect(() => {
    if (hovered) {
      if (timerRef.current) clearTimeout(timerRef.current);
      remainRef.current -= Date.now() - startRef.current;
      if (progressRef.current) {
        progressRef.current.style.animationPlayState = 'paused';
      }
    } else {
      startRef.current = Date.now();
      timerRef.current = setTimeout(exit, Math.max(remainRef.current, 500));
      if (progressRef.current) {
        progressRef.current.style.animationPlayState = 'running';
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hovered, exit]);

  const cfg = SEVERITY[item.severity];
  const Icon = cfg.icon;

  const transform =
    phase === 'enter'
      ? 'translateY(-6px) scale(0.97)'
      : phase === 'exit'
        ? 'translateY(-4px) scale(0.98)'
        : 'translateY(0) scale(1)';
  const opacity = phase === 'visible' ? 1 : 0;

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="pointer-events-auto group relative w-[296px] overflow-hidden rounded-2xl border border-border/60 bg-card shadow-lg"
      style={{
        transition: 'transform 280ms cubic-bezier(0.22,1,0.36,1), opacity 280ms cubic-bezier(0.22,1,0.36,1), box-shadow 200ms ease',
        transform,
        opacity,
        ...style,
      }}
    >
      {/* content */}
      <div className="grid grid-cols-[auto_1fr_auto] items-stretch gap-3.5 px-3 py-2.5">
        {/* icon with animated entrance */}
        <div
          className={`flex h-full min-h-[40px] aspect-square shrink-0 items-center justify-center rounded-lg ${cfg.iconBg}`}
          style={{
            transition: 'transform 400ms cubic-bezier(0.34,1.56,0.64,1)',
            transform: phase === 'visible' ? 'scale(1)' : 'scale(0.5)',
          }}
        >
          <Icon className={`h-5 w-5 ${cfg.iconFg}`} strokeWidth={2.3} />
        </div>

        {/* text */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold leading-tight text-foreground">
            {item.title}
          </p>
          {item.description && (
            <p className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-tight text-muted-foreground">
              {item.description}
            </p>
          )}
        </div>

        {/* close */}
        <button
          onClick={exit}
          aria-label="Cerrar notificación"
          className="shrink-0 rounded-lg p-1 text-muted-foreground transition-all duration-150 hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* progress bar */}
      <div className="h-[2px] w-full bg-border/50">
        <div
          ref={progressRef}
          className={`h-full ${cfg.progressBg} origin-left rounded-full`}
          style={{
            animation: `toast-progress ${TOAST_DURATION}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}

/* ─── toast stack (shows up to 3) ─── */

export function AppToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((input: ToastInput) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev.slice(-2), { ...input, id }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  const visible = toasts.slice(-3);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* keyframe injected once */}
      <style>{`@keyframes toast-progress{from{transform:scaleX(1)}to{transform:scaleX(0)}}`}</style>

      <div
        className="pointer-events-none fixed right-4 top-4 z-[100] flex flex-col-reverse items-end gap-2"
        aria-label="Notificaciones"
      >
        {visible.map((t, i) => {
          const depth = visible.length - 1 - i;
          return (
            <ToastCard
              key={t.id}
              item={t}
              onDismiss={() => dismiss(t.id)}
              style={
                depth > 0
                  ? {
                      transform: `scale(${1 - depth * 0.04}) translateY(${depth * 4}px)`,
                      opacity: 1 - depth * 0.15,
                      zIndex: 10 - depth,
                    }
                  : undefined
              }
            />
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useAppToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useAppToast must be used within AppToastProvider');
  }
  return ctx;
}
