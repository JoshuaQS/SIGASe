'use client';

import { ArrowLeft } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { authSession } from '@//auth/auth-session-store';
import { useAppToast } from '@/components/ui/app-toast-provider';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/forms/form-field';
import { PasswordField } from '@/components/ui/forms/password-field';
import { adminLoginSchema, type AdminLoginFields } from '../lib/auth-schemas';

import AuthBrand from '@/modules/auth/components/AuthBrand';
import AuthHeader from '@/modules/auth/components/AuthHeader';

interface AdminLoginCardProps {
  onSwitchToStudent?: () => void;
  onForgotPassword?: () => void;
}

const SEED_ADMIN_USERS = [
  {
    label: 'Admin TI',
    email: 'admin.ti@utez.edu.mx',
    password: 'ChangeMe.123',
  },
  {
    label: 'Biblioteca',
    email: 'admin.biblioteca@utez.edu.mx',
    password: 'ChangeMe.123',
  },
] as const;

export default function AdminLoginCard({
  onSwitchToStudent,
  onForgotPassword,
}: AdminLoginCardProps) {
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AdminLoginFields>({
    resolver: zodResolver(adminLoginSchema),
    mode: 'onTouched',
  });

  const onAdminLogin = async (data: AdminLoginFields) => {
    setErrorMessage(null);

    try {
      await authSession.loginAdmin(data.email, data.password);
      showToast({
        severity: 'success',
        title: 'Sesión iniciada',
        description: 'Bienvenido al panel administrativo.',
      });
      navigate('/admin/monitoreo-reportes', { replace: true });
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

  const fillSeedUser = useCallback((email: string, pass: string) => {
    setValue('email', email, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    setValue('password', pass, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    setErrorMessage(null);
  }, [setValue]);

  const showSeedUsers = import.meta.env.DEV;

  return (
    <div className="flex flex-col gap-8 transition-all">
      <Card className="overflow-visible rounded-2xl bg-card shadow-lg">
        <CardContent className="p-8 sm:p-10">
          <form className="flex flex-col gap-8" onSubmit={handleSubmit(onAdminLogin)}>
            <div className="flex flex-col items-center gap-6">
              <AuthBrand />

              <AuthHeader
                title="Acceso administrador"
                description="Ingresa tus credenciales para continuar"
              />
            </div>

            <div className="mx-auto w-full max-w-sm space-y-5">
              <fieldset className="space-y-5" disabled={isSubmitting}>
                <FormField
                  label="Correo"
                  controlId="admin-email"
                  error={errors.email?.message}
                >
                  <Input
                    {...register('email')}
                    id="admin-email"
                    type="email"
                    autoComplete="email"
                    placeholder="admin.ti@utez.edu.mx"
                    size="lg"
                    invalid={Boolean(errors.email)}
                  />
                </FormField>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 px-0.5">
                    <span className="text-sm font-semibold">Contraseña</span>
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
                    id="admin-password"
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

                <Button type="submit" size="lg" className="h-11 w-full rounded-lg font-bold tracking-tight shadow-sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
                </Button>
              </fieldset>

              {showSeedUsers && (
                <div className="space-y-2.5 rounded-xl border border-border/70 bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-2 px-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                      Entorno de Desarrollo
                    </p>
                    <div className="h-1 w-1 animate-pulse rounded-full bg-warning" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {SEED_ADMIN_USERS.map((seedUser) => (
                      <Button
                        key={seedUser.label}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isSubmitting}
                        className="h-8 justify-start bg-background/50 px-3 text-[11px] font-bold"
                        onClick={() => fillSeedUser(seedUser.email, seedUser.password)}
                      >
                        {seedUser.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <p className="pt-2 text-center">
                <button
                  type="button"
                  onClick={onSwitchToStudent}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground transition-all hover:text-foreground disabled:no-underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="underline decoration-muted-foreground/40 underline-offset-2">
                    Volver al login de estudiantes
                  </span>
                </button>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
