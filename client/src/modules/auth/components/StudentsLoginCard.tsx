import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { button as Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormField } from '@/components/ui/forms/form-field';
import { PasswordField } from '@/components/ui/forms/password-field';
import { authSession } from '@//auth/auth-session-store';
import { useAppToast } from '@/components/ui/app-toast-provider';
import { useTheme } from '@//hooks/use-theme';
import { studentPasswordLoginSchema, type StudentPasswordLoginFields } from '../lib/auth-schemas';

import AuthBrand from './AuthBrand';
import AuthHeader from './AuthHeader';

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: {
          type?: 'standard' | 'icon';
          theme?: 'outline' | 'filled_blue' | 'filled_black';
          size?: 'large' | 'medium' | 'small';
          text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
          shape?: 'rectangular' | 'pill' | 'circle' | 'square';
          width?: string | number;
          logo_alignment?: 'left' | 'center';
        },
      ) => void;
      prompt: () => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

const GOOGLE_IDENTITY_SCRIPT_ID = 'google-identity-services-script';

function loadGoogleIdentityScript() {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Google Identity solo está disponible en navegador.'));
      return;
    }

    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existing = document.getElementById(GOOGLE_IDENTITY_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar Google Identity Services.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_IDENTITY_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Google Identity Services.'));
    document.head.appendChild(script);
  });
}

interface StudentLoginCardProps {
  onSwitchToAdmin?: () => void;
  onForgotPassword?: () => void;
}

export default function StudentsLoginCard({
  onSwitchToAdmin,
  onForgotPassword,
}: StudentLoginCardProps) {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { showToast } = useAppToast();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  const googleClientId = useMemo(() => {
    const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
    return env?.VITE_GOOGLE_CLIENT_ID?.trim() || '';
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudentPasswordLoginFields>({
    resolver: zodResolver(studentPasswordLoginSchema),
    mode: 'onTouched',
  });

  const isBusy = isSubmitting || isGoogleSubmitting;

  const onPasswordLogin = async (data: StudentPasswordLoginFields) => {
    setErrorMessage(null);

    try {
      const session = await authSession.loginStudent(data.email, data.password);
      showToast({
        severity: 'success',
        title: 'Sesión iniciada',
        description: 'Bienvenido al portal estudiantil.',
      });

      if (session?.mustChangePassword) {
        navigate('/student/force-password-change', { replace: true });
      } else {
        navigate('/student/portal', { replace: true });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo iniciar sesión.';
      setErrorMessage(message);
      showToast({
        severity: 'error',
        title: 'Error de autenticación',
        description: message,
      });
    }
  };

  const handleGoogleCredential = useCallback(
    async (idToken: string) => {
      setIsGoogleSubmitting(true);
      setErrorMessage(null);
      setGoogleError(null);

      try {
        const session = await authSession.loginStudentWithGoogle(idToken);
        showToast({
          severity: 'success',
          title: 'Sesión iniciada',
          description: 'Autenticación con Google completada.',
        });

        if (session?.mustChangePassword) {
          navigate('/student/force-password-change', { replace: true });
        } else {
          navigate('/student/portal', { replace: true });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo iniciar sesión con Google.';
        setGoogleError(message);
        showToast({
          severity: 'error',
          title: 'Error con Google',
          description: message,
        });
      } finally {
        setIsGoogleSubmitting(false);
      }
    },
    [navigate, showToast],
  );

  useEffect(() => {
    if (!googleClientId) {
      setGoogleError('Configura VITE_GOOGLE_CLIENT_ID para habilitar acceso con Google.');
      return;
    }

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    const renderGoogleButton = () => {
      if (cancelled || !googleButtonRef.current || !window.google?.accounts?.id) return;

      googleButtonRef.current.innerHTML = '';
      const containerWidth = Math.round(googleButtonRef.current.getBoundingClientRect().width);
      const targetWidth = Math.min(400, Math.max(280, containerWidth));

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: 'standard',
        theme: isDark ? 'filled_black' : 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: targetWidth,
        logo_alignment: 'left',
      });
    };

    void loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !googleButtonRef.current || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => {
            if (!response.credential) {
              setGoogleError('Google no regresó credencial válida.');
              return;
            }
            void handleGoogleCredential(response.credential);
          },
        });

        renderGoogleButton();
        window.google.accounts.id.prompt();

        resizeObserver = new ResizeObserver(() => {
          renderGoogleButton();
        });
        resizeObserver.observe(googleButtonRef.current);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setGoogleError(error instanceof Error ? error.message : 'No se pudo inicializar Google OAuth.');
      });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
    };
  }, [googleClientId, handleGoogleCredential, isDark]);

  return (
    <div className="flex flex-col gap-8 transition-all">
      <Card className="overflow-visible rounded-lg border-border bg-card shadow-lg ring-1 ring-border/5">
        <CardContent className="p-8 sm:p-10">
          <form className="flex flex-col gap-8" onSubmit={handleSubmit(onPasswordLogin)}>
            <div className="flex flex-col items-center gap-6">
              <AuthBrand />

              <AuthHeader
                title="Bienvenido/a estudiante"
                description="Accede con tu correo institucional o con Google para eLibro"
              />
            </div>

            <div className="mx-auto w-full max-w-sm">
              <fieldset className="flex flex-col gap-5" disabled={isBusy}>
                <FormField
                  label="Correo"
                  htmlFor="student-email"
                  error={errors.email?.message}
                >
                  <Input
                    {...register('email')}
                    id="student-email"
                    type="email"
                    autoComplete="email"
                    placeholder="estudiante@utez.edu.mx"
                    className="h-10 w-full"
                    state={errors.email ? 'error' : 'default'}
                    aria-invalid={errors.email ? 'true' : 'false'}
                  />
                </FormField>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 px-0.5">
                    <Label htmlFor="student-password-field-contraseña" className="text-sm font-semibold">
                      Contraseña
                    </Label>
                    <button
                      type="button"
                      onClick={onForgotPassword}
                      className="shrink-0 text-xs text-muted-foreground underline decoration-muted-foreground/40 underline-offset-2 transition-colors hover:text-foreground"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <PasswordField
                    {...register('password')}
                    id="student-password"
                    label="" // Ya tenemos el label arriba con el link de "olvidaste"
                    error={errors.password?.message}
                    placeholder="Ingresa tu contraseña"
                    className="h-10 w-full"
                  />
                </div>

                {errorMessage ? (
                  <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-center text-xs font-medium text-destructive animate-in fade-in slide-in-from-top-1">
                    {errorMessage}
                  </p>
                ) : null}

                <Button type="submit" size="lg" className="h-11 w-full rounded-lg font-bold tracking-tight shadow-sm" disabled={isBusy}>
                  {isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
                </Button>

                <div className="relative mt-2 w-full border-t border-border/60" aria-hidden>
                  <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    o
                  </span>
                </div>
              </fieldset>

              <div className="my-6">
                <div className="mx-auto w-full max-w-[400px]">
                  <div
                    ref={googleButtonRef}
                    className="w-full transition-opacity hover:opacity-95 [&>div]:!w-full [&>div]:!max-w-[400px] [&>div]:!mx-auto [&_iframe]:!w-full"
                  >
                    {!googleClientId ? (
                      <span className="px-3 text-center text-[11px] text-muted-foreground">
                        Google OAuth deshabilitado (falta client id).
                      </span>
                    ) : isGoogleSubmitting ? (
                      <div className="flex flex-col items-center gap-2 py-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span className="text-[11px] font-medium text-muted-foreground">Validando con Google...</span>
                      </div>
                    ) : null}
                  </div>

                  {googleError ? (
                    <p className="mt-2 text-center text-[11px] text-destructive">{googleError}</p>
                  ) : null}
                </div>
              </div>

              <p className="text-center">
                <button
                  type="button"
                  onClick={onSwitchToAdmin}
                  disabled={isBusy}
                  className="text-xs font-medium text-muted-foreground underline decoration-muted-foreground/40 underline-offset-2 transition-colors hover:text-foreground disabled:no-underline"
                >
                  Acceso para administradores
                </button>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
