import { Outlet } from 'react-router-dom';

import { AmbientAuthBackground } from '@/modules/auth/components/ambient-auth-background';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function AuthLayout() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <AmbientAuthBackground />

      <div className="absolute right-6 top-6 z-20">
        <ThemeToggle showChrome />
      </div>

      <div className="relative z-10 flex min-h-screen">
        <div className="hidden lg:flex w-1/2 items-center justify-center px-16">
          <div className="max-w-xl">
            <span className="auth-shine-chip inline-flex items-center rounded-full bg-primary px-4 py-1.5 text-sm font-semibold tracking-[0.02em] text-primary-foreground shadow-sm">
              SIGASe
            </span>
            <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
              <span className="absolute top-[-100%] left-[-100%] h-[300%] w-[50%] rotate-45 animate-chip-shine-diagonal bg-gradient-to-r from-transparent via-primary-foreground/35 to-transparent" />
            </span>

            <div className="mt-6 space-y-5">
              <h1 className="max-w-lg text-5xl font-bold leading-[1.05] tracking-tight text-foreground">
                Tu acceso institucional a eLibro
              </h1>

              <p className="max-w-md text-base leading-7 text-foreground/70">
                Accede a miles de recursos académicos de eLibro a través del Sistema Integral de Gestión y Acceso SSO eLibro de la UTEZ.
              </p>

              <p className="text-sm font-medium text-foreground/80">
                Tu puerta de entrada al conocimiento digital universitario.
                <br />
                Rápido, seguro y centralizado.
              </p>
            </div>
          </div>
        </div>

        <div className="flex w-full lg:w-1/2 items-center justify-center px-6 py-10 lg:px-10">
          <div className="w-full max-w-lg">
            <Outlet />
          </div>
        </div>
      </div>
    </main>
  );
}
