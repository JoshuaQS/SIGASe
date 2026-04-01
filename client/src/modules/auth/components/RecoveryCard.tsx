import { useEffect, useState } from 'react';
import { ArrowLeft, KeyRound, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  confirmAdminPasswordReset,
  confirmStudentPasswordReset,
  requestAdminPasswordReset,
  requestStudentPasswordReset,
} from '@//lib/api/auth-api';
import { button as Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/forms/form-field';
import { PasswordField } from '@/components/ui/forms/password-field';
import {
  recoveryRequestSchema,
  passwordResetSchema,
  type RecoveryRequestFields,
  type PasswordResetFields,
} from '../lib/auth-schemas';

import AuthBrand from './AuthBrand';
import AuthHeader from './AuthHeader';

type RecoveryMode = 'request' | 'reset';
type RecoveryAudience = 'admin' | 'student';

interface RecoveryCardProps {
  mode: RecoveryMode;
  audience: RecoveryAudience;
  token?: string | null;
  onBackToLogin?: () => void;
  /** Placeholder del campo de correo en modo solicitud */
  emailPlaceholder?: string;
}

/**
 * FORMULARIO DE SOLICITUD DE RECUPERACIÓN (Paso 1)
 */
function RecoveryRequestForm({
  audience,
  emailPlaceholder,
  onSuccess,
  onError,
}: {
  audience: RecoveryAudience;
  emailPlaceholder: string;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecoveryRequestFields>({
    resolver: zodResolver(recoveryRequestSchema),
    mode: 'onTouched',
  });

  const onSubmit = async (data: RecoveryRequestFields) => {
    try {
      if (audience === 'admin') {
        await requestAdminPasswordReset(data.email);
      } else {
        await requestStudentPasswordReset(data.email);
      }
      onSuccess('Si tu correo institucional está registrado, recibirás un enlace de recuperación pronto.');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'No se pudo procesar tu solicitud por un error de red.');
    }
  };

  return (
    <form className="flex flex-col gap-8" onSubmit={handleSubmit(onSubmit)}>
      <fieldset className="flex flex-col gap-6" disabled={isSubmitting}>
        <FormField
          label="Correo institucional"
          htmlFor="recovery-email"
          error={errors.email?.message}
          hint="Usaremos este correo para enviarte el código de acceso."
        >
          <Input
            {...register('email')}
            id="recovery-email"
            type="email"
            placeholder={emailPlaceholder}
            leadingIcon={Mail}
            className="h-10"
            state={errors.email ? 'error' : 'default'}
            aria-invalid={errors.email ? 'true' : 'false'}
          />
        </FormField>

        <Button type="submit" size="lg" className="h-11 w-full font-bold shadow-sm" disabled={isSubmitting}>
          {isSubmitting ? 'Procesando...' : 'Enviar instrucciones'}
        </Button>
      </fieldset>
    </form>
  );
}

/**
 * FORMULARIO DE RESTABLECIMIENTO (Paso 2)
 */
function PasswordResetForm({
  audience,
  token,
  onSuccess,
  onError,
}: {
  audience: RecoveryAudience;
  token: string | null;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordResetFields>({
    resolver: zodResolver(passwordResetSchema),
    mode: 'onTouched',
  });

  const onSubmit = async (data: PasswordResetFields) => {
    if (!token) {
      onError('Token de recuperación inválido o expirado. Por favor solicita uno nuevo.');
      return;
    }

    try {
      if (audience === 'admin') {
        await confirmAdminPasswordReset(token, data.newPassword);
      } else {
        await confirmStudentPasswordReset(token, data.newPassword);
      }
      onSuccess('¡Contraseña actualizada! Ya puedes volver a usar tu cuenta con seguridad.');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Error al guardar. Verifica tu conexión a internet.');
    }
  };

  return (
    <form className="flex flex-col gap-8" onSubmit={handleSubmit(onSubmit)}>
      <fieldset className="flex flex-col gap-6" disabled={isSubmitting}>
        <PasswordField
          {...register('newPassword')}
          id="new-password"
          label="Nueva contraseña"
          error={errors.newPassword?.message}
          placeholder="Escribe tu nueva clave"
          className="h-10"
          requirementHint="Mínimo 10 caracteres, una mayúscula, un número y un símbolo."
        />

        <PasswordField
          {...register('confirmPassword')}
          id="confirm-password"
          label="Confirmar contraseña"
          error={errors.confirmPassword?.message}
          placeholder="Repite tu nueva clave"
          className="h-10"
          showCapsLockWarning={false} // Evitar duplicar el warning si ya está arriba
        />

        <div className="pt-2">
          <Button type="submit" size="lg" className="h-11 w-full font-bold shadow-sm" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Restablecer acceso'}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}

/**
 * COMPONENTE PRINCIPAL RECOVERY CARD
 */
export default function RecoveryCard({
  mode,
  audience,
  token = null,
  onBackToLogin,
  emailPlaceholder = 'admin@utez.edu.mx',
}: RecoveryCardProps) {
  const isRequest = mode === 'request';
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [mode]);

  const handleSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage(null);
  };

  const handleError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage(null);
  };

  return (
    <div className="flex flex-col gap-8 transition-all">
      <Card className="overflow-visible border-border bg-card shadow-lg ring-1 ring-border/5">
        <CardContent className="p-8 sm:p-10">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col items-center gap-6">
              <AuthBrand />

              <AuthHeader
                title={isRequest ? 'Recuperar contraseña' : 'Restablecer contraseña'}
                description={
                  isRequest
                    ? '¿Problemas con tu clave? Ingresa tu correo para recibir soporte.'
                    : 'Estás a solo un paso de recuperar el control de tu cuenta.'
                }
              />
            </div>

            <div className="mx-auto w-full max-w-sm flex flex-col gap-6">
              {isRequest ? (
                <RecoveryRequestForm
                  audience={audience}
                  emailPlaceholder={emailPlaceholder}
                  onSuccess={handleSuccess}
                  onError={handleError}
                />
              ) : (
                <PasswordResetForm
                  audience={audience}
                  token={token}
                  onSuccess={handleSuccess}
                  onError={handleError}
                />
              )}

              {errorMessage && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-center animate-in fade-in slide-in-from-top-1">
                  <p className="text-xs font-bold text-destructive">{errorMessage}</p>
                </div>
              )}

              {successMessage && (
                <div className="rounded-lg border border-success/20 bg-success/10 px-4 py-3 text-center animate-in fade-in slide-in-from-top-1">
                  <p className="text-xs font-bold text-success leading-relaxed">{successMessage}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={onBackToLogin}
                className="flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground transition-all hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="underline decoration-muted-foreground/40 underline-offset-2">
                  Volver al inicio de sesión
                </span>
              </button>

              {!isRequest && !successMessage && (
                <div className="flex items-center justify-center gap-2.5 rounded-lg bg-muted/30 px-3 py-2 text-[10px] text-muted-foreground/80">
                  <KeyRound className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  <p>Asegúrate de que tu nueva clave sea fácil de recordar para ti pero difícil para otros.</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
