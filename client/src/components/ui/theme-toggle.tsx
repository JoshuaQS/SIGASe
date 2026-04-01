'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { flushSync } from 'react-dom';
import { cn } from '@//lib/utils';
import { useTheme } from '@//hooks/use-theme';

interface ThemeToggleProps {
  className?: string;
  duration?: number;
  showChrome?: boolean;
  iconVariant?: 'auto' | 'moon';
  fillWhenDark?: boolean;
  strokeWidth?: number;
  fillIcon?: boolean;
}

type ViewTransitionLike = {
  ready?: Promise<unknown>;
  finished?: Promise<void>;
};

type DocumentWithViewTransition = Document & {
  startViewTransition?: (updateCallback: () => void) => ViewTransitionLike;
};

export function ThemeToggle({
  className,
  duration = 800,
  showChrome = false,
  iconVariant = 'auto',
  fillWhenDark = false,
  strokeWidth = 2,
  fillIcon = false,
}: ThemeToggleProps) {
  const { isDark, mounted, setTheme } = useTheme();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const primeTimeoutRef = useRef<number | null>(null);
  const [isPriming, setIsPriming] = useState(false);
  const [primingFromDark, setPrimingFromDark] = useState(false);

  const toggleTheme = useCallback(() => {
    if (!mounted) return;

    const runThemeTransition = () => {
      const button = buttonRef.current;
      const nextTheme = isDark ? 'light' : 'dark';
      const applyNextTheme = () => setTheme(nextTheme);

      if (!button) {
        applyNextTheme();
        return;
      }

      const shouldReduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;

      const documentWithTransition = document as DocumentWithViewTransition;

      if (
        shouldReduceMotion ||
        typeof documentWithTransition.startViewTransition !== 'function'
      ) {
        applyNextTheme();
        return;
      }

      const { top, left, width, height } = button.getBoundingClientRect();
      const x = left + width / 2;
      const y = top + height / 2;
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const maxRadius = Math.hypot(
        Math.max(x, viewportWidth - x),
        Math.max(y, viewportHeight - y),
      );

      const rootEl = document.documentElement;
      // Origen del círculo desde el primer frame; si solo animamos en `ready`, un frame
      // sin recorte muestra el tema nuevo en toda la pantalla.
      rootEl.style.setProperty('--theme-vt-x', `${x}px`);
      rootEl.style.setProperty('--theme-vt-y', `${y}px`);

      const clearVtOrigin = () => {
        rootEl.style.removeProperty('--theme-vt-x');
        rootEl.style.removeProperty('--theme-vt-y');
      };

      const transition = documentWithTransition.startViewTransition(() => {
        flushSync(() => {
          applyNextTheme();
        });
      });

      transition.finished?.finally(clearVtOrigin);

      transition.ready
        ?.then(() => {
          rootEl.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${maxRadius}px at ${x}px ${y}px)`,
              ],
            },
            {
              duration,
              easing: 'ease-in-out',
              fill: 'forwards',
              pseudoElement: '::view-transition-new(root)',
            },
          );
        })
        .catch(() => undefined);
    };

    if (primeTimeoutRef.current) {
      window.clearTimeout(primeTimeoutRef.current);
    }

    setPrimingFromDark(isDark);
    setIsPriming(true);

    primeTimeoutRef.current = window.setTimeout(() => {
      runThemeTransition();
      setIsPriming(false);
      primeTimeoutRef.current = null;
    }, 110);
  }, [duration, isDark, mounted, setTheme]);

  useEffect(() => {
    return () => {
      if (primeTimeoutRef.current) {
        window.clearTimeout(primeTimeoutRef.current);
      }
    };
  }, []);

  const fillCurrentIcon = fillIcon || isPriming || (fillWhenDark && isDark);
  const shouldShowSun = isPriming ? primingFromDark : isDark;

  return (
    <button
      type="button"
      ref={buttonRef}
      onClick={toggleTheme}
      aria-label={
        mounted
          ? isDark
            ? 'Cambiar a tema claro'
            : 'Cambiar a tema oscuro'
          : 'Cambiar tema'
      }
      title={
        mounted
          ? isDark
            ? 'Cambiar a tema claro'
            : 'Cambiar a tema oscuro'
          : 'Cambiar tema'
      }
      className={cn(
        showChrome
          ? 'inline-flex size-9 items-center justify-center rounded-lg bg-card text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70'
          : 'inline-flex size-9 items-center justify-center rounded-lg border-0 bg-transparent p-0 text-muted-foreground shadow-none transition-colors focus-visible:outline-none focus-visible:ring-0',
        className,
      )}
    >
      {mounted ? (
        iconVariant === 'moon' ? (
          <Moon
            className="size-5 transition-[fill,color,stroke] duration-200"
            strokeWidth={strokeWidth}
            fill={fillCurrentIcon ? 'currentColor' : 'none'}
          />
        ) : shouldShowSun ? (
          <Sun
            className="size-5 transition-[fill,color,stroke] duration-200"
            strokeWidth={strokeWidth}
            fill={fillCurrentIcon ? 'currentColor' : 'none'}
          />
        ) : (
          <Moon
            className="size-5 transition-[fill,color,stroke] duration-200"
            strokeWidth={strokeWidth}
            fill={fillCurrentIcon ? 'currentColor' : 'none'}
          />
        )
      ) : (
        <Moon className="size-5" strokeWidth={strokeWidth} fill="none" />
      )}

      <span className="sr-only">Cambiar tema</span>
    </button>
  );
}