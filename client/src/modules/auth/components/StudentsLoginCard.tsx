import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormField } from '@/components/ui/forms/form-field';
import { PasswordField } from '@/components/ui/forms/password-field';
import { authSession } from '@//auth/auth-session-store';
import { useAppToast } from '@/components/ui/app-toast-provider';
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
      cancel: () => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
    __sigaseGsiInitializedClientId?: string;
    __sigaseGsiCredentialDispatcher?: ((response: GoogleCredentialResponse) => void) | null;
  }
}

const GOOGLE_IDENTITY_SCRIPT_ID = 'google-identity-services-script';
 
function getInitializedGoogleClientId() {
  return window.__sigaseGsiInitializedClientId ?? null;
}
 
function setInitializedGoogleClientId(clientId: string | null) {
  if (!clientId) {
    delete window.__sigaseGsiInitializedClientId;
    return;
  }
  window.__sigaseGsiInitializedClientId = clientId;
}
 
function setGoogleCredentialDispatcher(dispatcher: ((response: GoogleCredentialResponse) => void) | null) {
  window.__sigaseGsiCredentialDispatcher = dispatcher;
}

function initializeGoogleIdentity(clientId: string) {
  if (!window.google?.accounts?.id) {
    throw new Error('Google Identity Services no está disponible.');
  }

  const initializedGoogleClientId = getInitializedGoogleClientId();
  if (initializedGoogleClientId === clientId) {
    return;
  }

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => {
      window.__sigaseGsiCredentialDispatcher?.(response);
    },
  });

  setInitializedGoogleClientId(clientId);
}

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
  const navigate = useNavigate();
  const { showToast } = useAppToast();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isGoogleIdentityReady, setIsGoogleIdentityReady] = useState(false);
  const [isGoogleInteractionBlocked, setIsGoogleInteractionBlocked] = useState(false);
  const [isGoogleButtonRendered, setIsGoogleButtonRendered] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleCredentialHandlerRef = useRef<(idToken: string) => void>(() => undefined);

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

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    // Bloquea submits programáticos (autofill del password manager de Chrome,
    // Credential Management API, "Sign in with Google" del navegador, eventos
    // colaterales del botón hijo de Google Identity, etc.). Solo aceptamos
    // submits originados por el botón de submit explícito.
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (!submitter || (submitter as HTMLButtonElement).type !== 'submit') {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    void handleSubmit(onPasswordLogin)(event);
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
    googleCredentialHandlerRef.current = (idToken: string) => {
      void handleGoogleCredential(idToken);
    };
  }, [handleGoogleCredential]);

  useEffect(() => {
    if (!googleClientId) {
      setGoogleError('Configura VITE_GOOGLE_CLIENT_ID para habilitar acceso con Google.');
      setIsGoogleIdentityReady(false);
      return;
    }

    let cancelled = false;
    setGoogleError(null);

    void loadGoogleIdentityScript()
      .then(() => {
        if (cancelled) return;

        setGoogleCredentialDispatcher((response) => {
          if (!response.credential) {
            setGoogleError('Google no regresó credencial válida.');
            return;
          }
          googleCredentialHandlerRef.current(response.credential);
        });

        initializeGoogleIdentity(googleClientId);
        setIsGoogleIdentityReady(true);
        setIsGoogleInteractionBlocked(true);
        window.setTimeout(() => {
          if (cancelled) return;
          setIsGoogleInteractionBlocked(false);
        }, 2000);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setIsGoogleIdentityReady(false);
        setGoogleError(error instanceof Error ? error.message : 'No se pudo inicializar Google OAuth.');
      });

    return () => {
      cancelled = true;
      setGoogleCredentialDispatcher(null);
      // Cancela cualquier diálogo One Tap / overlay que Google haya dejado
      // vivo para que no termine disparando submits colaterales en otra ruta.
      try {
        window.google?.accounts?.id?.cancel?.();
      } catch {
        // noop
      }
    };
  }, [googleClientId]);

  useEffect(() => {
    if (!googleClientId || !isGoogleIdentityReady) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    let frameId: number | null = null;
    let lastRenderedWidth = -1;

    const renderGoogleButton = (targetWidth: number) => {
      if (cancelled || !googleButtonRef.current || !window.google?.accounts?.id) return;

      googleButtonRef.current.innerHTML = '';
      lastRenderedWidth = targetWidth;

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: targetWidth,
        logo_alignment: 'left',
      });

      // Marca el botón como renderizado en el siguiente frame para evitar clicks
      // prematuros (antes de que el iframe/div[role=button] de Google exista).
      window.requestAnimationFrame(() => {
        if (cancelled) return;
        setIsGoogleButtonRendered(true);
      });
    };

    const scheduleGoogleButtonRender = () => {
      if (cancelled || !googleButtonRef.current || !window.google?.accounts?.id) return;

      const widthSource = googleButtonRef.current.parentElement ?? googleButtonRef.current;
      const containerWidth = Math.round(widthSource.getBoundingClientRect().width);
      if (!Number.isFinite(containerWidth) || containerWidth <= 0) return;

      const targetWidth = Math.min(384, containerWidth);
      if (targetWidth === lastRenderedWidth) return;

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      // Run render in the next frame to avoid ResizeObserver recursive layout loops.
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        renderGoogleButton(targetWidth);
      });
    };

    scheduleGoogleButtonRender();

    resizeObserver = new ResizeObserver(() => {
      scheduleGoogleButtonRender();
    });
    const observedElement = googleButtonRef.current?.parentElement ?? googleButtonRef.current;
    if (observedElement) {
      resizeObserver.observe(observedElement);
    }

    return () => {
      cancelled = true;
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      resizeObserver?.disconnect();
      setIsGoogleButtonRendered(false);
    };
  }, [googleClientId, isGoogleIdentityReady]);

  const triggerGoogleSignIn = useCallback(() => {
    const googleButton = googleButtonRef.current?.querySelector('div[role="button"]') as HTMLElement | null;
    if (googleButton) {
      googleButton.click();
      return true;
    }
    return false;
  }, []);

  const handleGoogleSignInClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      // Garantiza que este click nunca pueda llegar al submit del <form> padre.
      event.preventDefault();
      event.stopPropagation();

      if (
        isBusy ||
        !googleClientId ||
        !isGoogleIdentityReady ||
        isGoogleInteractionBlocked ||
        !isGoogleButtonRendered
      ) {
        return;
      }

      setGoogleError(null);
      if (!triggerGoogleSignIn()) {
        setGoogleError('No se pudo inicializar el botón de Google. Intenta nuevamente.');
      }
    },
    [
      googleClientId,
      isBusy,
      isGoogleButtonRendered,
      isGoogleIdentityReady,
      isGoogleInteractionBlocked,
      triggerGoogleSignIn,
    ],
  );

  return (
    <div className="flex flex-col gap-8 transition-all">
      <Card className="overflow-visible rounded-2xl bg-card shadow-2xl ">
        <CardContent className="p-8 sm:p-10">
          <form className="flex flex-col gap-8" onSubmit={handleFormSubmit}>
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
                  controlId="student-email"
                  error={errors.email?.message}
                >
                  <Input
                    {...register('email')}
                    id="student-email"
                    type="email"
                    autoComplete="email"
                    placeholder="estudiante@utez.edu.mx"
                    size="lg"
                    invalid={Boolean(errors.email)}
                  />
                </FormField>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 px-0.5">
                    <Label htmlFor="student-password" className="text-sm font-semibold">
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
                    size="lg"
                  />
                </div>

                {errorMessage ? (
                  <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-center text-xs font-medium text-destructive animate-in fade-in slide-in-from-top-1">
                    {errorMessage}
                  </p>
                ) : null}

                <Button type="submit" size="lg" disabled={isBusy}>
                  {isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
                </Button>

                <div className="relative mt-2 w-full border-t border-border/60" aria-hidden>
                  <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    o
                  </span>
                </div>
              </fieldset>

              <div className="my-6">
                <div className="mx-auto w-full max-w-sm">
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    disabled={
                      isBusy ||
                      !googleClientId ||
                      !isGoogleIdentityReady ||
                      isGoogleInteractionBlocked ||
                      !isGoogleButtonRendered
                    }
                    onClick={handleGoogleSignInClick}
                    className="w-full"
                    leftIcon={
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden className="h-5 w-5 shrink-0">
                        <defs>
                          <radialGradient id="google-icon-b" cx="1.479" cy="12.788" fx="1.479" fy="12.788" r="9.655" gradientTransform="matrix(.8032 0 0 1.0842 2.459 -.293)" gradientUnits="userSpaceOnUse">
                            <stop offset=".368" stopColor="#ffcf09" />
                            <stop offset=".718" stopColor="#ffcf09" stopOpacity=".7" />
                            <stop offset="1" stopColor="#ffcf09" stopOpacity="0" />
                          </radialGradient>
                          <radialGradient id="google-icon-c" cx="14.295" cy="23.291" fx="14.295" fy="23.291" r="11.878" gradientTransform="matrix(1.3272 0 0 1.0073 -3.434 -.672)" gradientUnits="userSpaceOnUse">
                            <stop offset=".383" stopColor="#34a853" />
                            <stop offset=".706" stopColor="#34a853" stopOpacity=".7" />
                            <stop offset="1" stopColor="#34a853" stopOpacity="0" />
                          </radialGradient>
                          <linearGradient id="google-icon-d" x1="23.558" y1="6.286" x2="12.148" y2="20.299" gradientUnits="userSpaceOnUse">
                            <stop offset=".671" stopColor="#4285f4" />
                            <stop offset=".885" stopColor="#4285f4" stopOpacity="0" />
                          </linearGradient>
                          <clipPath id="google-icon-a">
                            <path d="M22.36 10H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53h-.013l.013-.01c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09c.87-2.6 3.3-4.53 6.16-4.53 1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07 1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93v.01C3.99 20.53 7.7 23 12 23c2.97 0 5.46-.98 7.28-2.66 2.08-1.92 3.28-4.74 3.28-8.09 0-.78-.07-1.53-.2-2.25z" fill="none" />
                          </clipPath>
                        </defs>
                        <path d="M22.36 10H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53h-.013l.013-.01c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09c.87-2.6 3.3-4.53 6.16-4.53 1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07 1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93v.01C3.99 20.53 7.7 23 12 23c2.97 0 5.46-.98 7.28-2.66 2.08-1.92 3.28-4.74 3.28-8.09 0-.78-.07-1.53-.2-2.25z" fill="#fc4c53" />
                        <g clipPath="url(#google-icon-a)">
                          <ellipse cx="3.646" cy="13.572" rx="7.755" ry="10.469" fill="url(#google-icon-b)" />
                          <ellipse cx="15.538" cy="22.789" rx="15.765" ry="11.965" transform="rotate(-7.12 15.539 22.789)" fill="url(#google-icon-c)" />
                          <path fill="url(#google-icon-d)" d="M11.105 8.28l.491 5.596.623 3.747 7.362 6.848 8.607-15.897-17.083-.294z" />
                        </g>
                      </svg>
                    }
                  >
                    {isGoogleSubmitting
                      ? 'Validando con Google...'
                      : isGoogleInteractionBlocked || !isGoogleButtonRendered
                        ? 'Preparando Google...'
                        : 'Continuar con Google'}
                  </Button>

                  <div
                    ref={googleButtonRef}
                    className="absolute -left-[9999px] top-0 w-full opacity-0"
                    aria-hidden
                  >
                    {!googleClientId ? (
                      <span className="px-3 text-center text-[11px] text-muted-foreground">
                        Google OAuth deshabilitado (falta client id).
                      </span>
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
