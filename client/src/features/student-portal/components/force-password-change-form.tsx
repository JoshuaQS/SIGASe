import { useMemo, useState } from 'react';
import { AlertTriangle, Eye, EyeOff, LockKeyhole, LogOut, ShieldCheck } from 'lucide-react';
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
};

type FormState = {
  newPassword: string;
  confirmPassword: string;
};

const PASSWORD_RULES = [
  'Mínimo 12 caracteres',
  'Al menos una mayúscula',
  'Al menos una minúscula',
  'Al menos un número',
  'Al menos un símbolo',
];

function validatePassword(password: string): string[] {
  const errors: string[] = [];

  if (password.length < 12) errors.push('La contraseña debe tener al menos 12 caracteres.');
  if (!/[A-Z]/.test(password)) errors.push('Debe incluir al menos una mayúscula.');
  if (!/[a-z]/.test(password)) errors.push('Debe incluir al menos una minúscula.');
  if (!/\d/.test(password)) errors.push('Debe incluir al menos un número.');
  if (!/[^\w\s]/.test(password)) errors.push('Debe incluir al menos un símbolo.');

  return errors;
}

function StudentForcePasswordChangeView({
  studentName,
  onSubmit,
  onCompleted,
  onLogout,
}: StudentForcePasswordChangeViewProps) {
  const [form, setForm] = useState<FormState>({
    newPassword: '',
    confirmPassword: '',
  });

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const passwordErrors = useMemo(() => validatePassword(form.newPassword), [form.newPassword]);

  const confirmError =
    form.confirmPassword && form.newPassword !== form.confirmPassword
      ? 'Las contraseñas no coinciden.'
      : '';

  const canSubmit =
    form.newPassword.trim().length > 0 &&
    form.confirmPassword.trim().length > 0 &&
    passwordErrors.length === 0 &&
    !confirmError &&
    !submitting;

  const handleChange = (field: keyof FormState, value: string) => {
    setServerError('');
    setSuccessMessage('');
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) return;

    setSubmitting(true);
    setServerError('');
    setSuccessMessage('');

    try {
      const result = await onSubmit({
        newPassword: form.newPassword,
      });

      if (!result.success) {
        setServerError(result.message || 'No se pudo actualizar la contraseña.');
        return;
      }

      setSuccessMessage(result.message || 'Contraseña actualizada correctamente.');

      setTimeout(() => {
        void onCompleted?.();
      }, 900);
    } catch {
      setServerError('Ocurrió un error al actualizar la contraseña.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await onLogout();
  };

  return (
    <section className="mx-auto w-full max-w-xl p-4">
      <Card>
        <CardHeader>
          <Badge variant="warning">
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
                {PASSWORD_RULES.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </CardHeader>
          </Card>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <PasswordField
              label="Nueva contraseña"
              value={form.newPassword}
              onChange={(value) => handleChange('newPassword', value)}
              showPassword={showNewPassword}
              onToggleShow={() => setShowNewPassword((prev) => !prev)}
              autoComplete="new-password"
            />

            {form.newPassword && passwordErrors.length > 0 && (
              <div className="p-4 text-sm" role="alert">
                <ul className="space-y-1">
                  {passwordErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <PasswordField
              label="Confirmar nueva contraseña"
              value={form.confirmPassword}
              onChange={(value) => handleChange('confirmPassword', value)}
              showPassword={showConfirmPassword}
              onToggleShow={() => setShowConfirmPassword((prev) => !prev)}
              autoComplete="new-password"
            />

            {confirmError && (
              <p className="p-4 text-sm" role="alert">
                {confirmError}
              </p>
            )}

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
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={!canSubmit}
                isLoading={submitting}
              >
                Establecer contraseña
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                fullWidth
                leftIcon={LogOut}
                onClick={() => void handleLogout()}
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
  value: string;
  onChange: (value: string) => void;
  showPassword: boolean;
  onToggleShow: () => void;
  autoComplete?: string;
};

function PasswordField({
  label,
  value,
  onChange,
  showPassword,
  onToggleShow,
  autoComplete,
}: PasswordFieldProps) {
  return (
    <label>
      <span className="text-sm">{label}</span>

      <Input
        size="lg"
        className="w-full"
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        startAdornment={<LockKeyhole className="h-4 w-4" aria-hidden />}
      />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        leftIcon={showPassword ? EyeOff : Eye}
        onClick={onToggleShow}
        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {showPassword ? 'Ocultar' : 'Mostrar'}
      </Button>
    </label>
  );
}
