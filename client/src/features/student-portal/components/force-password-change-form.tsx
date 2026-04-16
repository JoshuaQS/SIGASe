import { useMemo, useState } from 'react';
import { AlertTriangle, Eye, EyeOff, LockKeyhole, LogOut, ShieldCheck } from 'lucide-react';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { confirmPasswordSchema, passwordSchema as passwordPolicySchema } from '@/shared/lib/validation';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';

type ChangePasswordPayload = {
  newPassword: string;
};

type ChangePasswordResult = {
  success: boolean;
  message?: string;
};

type StudentForcePasswordChangeViewProps = {
  studentName?: string;
  onSubmit: (payload: ChangePasswordPayload) => Promise<ChangePasswordResult>;
  onCompleted?: () => Promise<void> | void;
  onLogout: () => Promise<void> | void;
  logoutLoading?: boolean;
};

const passwordSchema = z
  .object({
    newPassword: passwordPolicySchema,
    confirmNewPassword: confirmPasswordSchema,
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    path: ['confirmNewPassword'],
    message: 'Las contraseñas no coinciden.',
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

function StudentForcePasswordChangeView({
  studentName,
  onSubmit,
  onCompleted,
  onLogout,
  logoutLoading = false,
}: StudentForcePasswordChangeViewProps) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isValid, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    mode: 'onChange',
    defaultValues: {
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const newPasswordValue = watch('newPassword') ?? '';

  const passwordChecklist = useMemo(() => [
    {
      message: 'La contraseña debe tener al menos 12 caracteres.',
      satisfied: newPasswordValue.length >= 12,
    },
    {
      message: 'Debe incluir al menos una mayúscula.',
      satisfied: /[A-Z]/.test(newPasswordValue),
    },
    {
      message: 'Debe incluir al menos una minúscula.',
      satisfied: /[a-z]/.test(newPasswordValue),
    },
    {
      message: 'Debe incluir al menos un número.',
      satisfied: /\d/.test(newPasswordValue),
    },
    {
      message: 'Debe incluir al menos un símbolo.',
      satisfied: /[^\w\s]/.test(newPasswordValue),
    },
  ], [newPasswordValue]);

  const canSubmit = isValid && !isSubmitting;

  const onFormSubmit = handleSubmit(async (values) => {
    setServerError('');
    setSuccessMessage('');

    try {
      const result = await onSubmit({
        newPassword: values.newPassword,
      });

      if (!result.success) {
        setServerError(result.message || 'No se pudo actualizar la contraseña.');
        return;
      }

      setSuccessMessage(result.message || 'Contraseña actualizada correctamente.');
      reset({ newPassword: '', confirmNewPassword: '' });

      setTimeout(() => {
        void onCompleted?.();
      }, 900);
    } catch {
      setServerError('Ocurrió un error al actualizar la contraseña.');
    }
  });

  const handleLogout = async () => {
    if (logoutLoading || isSubmitting) return;
    await onLogout();
  };

  return (
    <section className="mx-auto w-full max-w-3xl p-4">
      <Card className="size-full">
        <CardHeader>
          <Badge variant="warning" className="inline-flex w-fit">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            Acción obligatoria
          </Badge>

          <CardTitle className="text-3xl">Establece una contraseña para continuar</CardTitle>

          <CardDescription>
            Bienvenido{studentName ? `, ${studentName}` : ''}, para entrar al portal estudiantil por primera vez,
            necesitas crear una contraseña nueva y segura.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <Card className="border-warning/30 bg-warning/5">
            <CardHeader>
              <ShieldCheck className="h-5 w-5" aria-hidden />
              <CardTitle className="text-sm">Requisitos mínimos</CardTitle>
              <ul className="space-y-1 text-sm">
                {passwordChecklist.map((rule) => (
                  <li
                    key={rule.message}
                    className={rule.satisfied ? 'text-foreground' : 'text-muted-foreground'}
                  >
                    {rule.message}
                  </li>
                ))}
              </ul>
            </CardHeader>
          </Card>

          <form className="space-y-4" onSubmit={onFormSubmit}>
            <PasswordField
              label="Nueva contraseña"
              showPassword={showNewPassword}
              onToggleShow={() => setShowNewPassword((prev) => !prev)}
              autoComplete="new-password"
              error={errors.newPassword?.message}
              inputProps={register('newPassword', {
                onChange: () => {
                  setServerError('');
                  setSuccessMessage('');
                },
              })}
            />

            {newPasswordValue && passwordChecklist.some((rule) => !rule.satisfied) && (
              <div className="p-4 text-sm" role="alert">
                <ul className="space-y-1">
                  {passwordChecklist
                    .filter((rule) => !rule.satisfied)
                    .map((rule) => (
                      <li key={rule.message}>{rule.message}</li>
                    ))}
                </ul>
              </div>
            )}

            <PasswordField
              label="Confirmar nueva contraseña"
              showPassword={showConfirmPassword}
              onToggleShow={() => setShowConfirmPassword((prev) => !prev)}
              autoComplete="new-password"
              error={errors.confirmNewPassword?.message}
              inputProps={register('confirmNewPassword', {
                onChange: () => {
                  setServerError('');
                  setSuccessMessage('');
                },
              })}
            />

            {serverError && (
              <p className="p-4 text-sm" role="alert">
                {serverError}
              </p>
            )}

            {successMessage && (
              <p className="p-4 text-sm" role="status">
                {successMessage}
              </p>
            )}

            <div className="space-y-3 pt-1">
              <Button type="submit" variant="primary" size="lg" fullWidth disabled={!canSubmit} isLoading={isSubmitting}>
                Establecer contraseña
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                fullWidth
                leftIcon={LogOut}
                onClick={() => void handleLogout()}
                disabled={logoutLoading || isSubmitting}
                isLoading={logoutLoading}
              >
                Cerrar sesión
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

export { StudentForcePasswordChangeView };

type PasswordFieldProps = {
  label: string;
  showPassword: boolean;
  onToggleShow: () => void;
  autoComplete?: string;
  error?: string;
  inputProps: UseFormRegisterReturn;
};

function PasswordField({
  label,
  showPassword,
  onToggleShow,
  autoComplete,
  error,
  inputProps,
}: PasswordFieldProps) {
  return (
    <label className="block space-y-2">
      <span className="text-sm">{label}</span>

      <div className="relative">
        <Input
          size="lg"
          className="w-full pr-12"
          type={showPassword ? 'text' : 'password'}
          autoComplete={autoComplete}
          startAdornment={<LockKeyhole className="h-4 w-4" aria-hidden />}
          {...inputProps}
        />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-2 top-1/2 -translate-y-1/2 px-2"
          onClick={onToggleShow}
          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </Button>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </label>
  );
}
