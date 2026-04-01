import { useMemo, useState } from 'react';
import { AlertTriangle, Eye, EyeOff, LockKeyhole, LogOut, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

type ChangePasswordResult = {
  success: boolean;
  message?: string;
};

type StudentForcePasswordChangeViewProps = {
  studentName?: string;
  onSubmit: (payload: ChangePasswordPayload) => Promise<ChangePasswordResult>;
  onLogout: () => Promise<void> | void;
};

type FormState = {
  currentPassword: string;
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
  onLogout,
}: StudentForcePasswordChangeViewProps) {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
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
    form.currentPassword.trim().length > 0 &&
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
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });

      if (!result.success) {
        setServerError(result.message || 'No se pudo actualizar la contraseña.');
        return;
      }

      setSuccessMessage(result.message || 'Contraseña actualizada correctamente.');

      setTimeout(() => {
        navigate('/student/portal', { replace: true });
      }, 900);
    } catch {
      setServerError('Ocurrió un error al actualizar la contraseña.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await onLogout();
    navigate('/login', { replace: true });
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <PortalBackgroundMock />

      <div className="absolute inset-0 bg-background/45 backdrop-blur-md" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-xl rounded-3xl border border-border/70 bg-card/95 p-8 shadow-2xl backdrop-blur-xl lg:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-warning/20 bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
            <AlertTriangle className="h-4 w-4" />
            Acción obligatoria
          </div>

          <div className="mt-6 space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Cambia tu contraseña para continuar
            </h1>

            <p className="text-sm leading-6 text-muted-foreground">
              {studentName ? `${studentName}, e` : 'E'}stás usando una contraseña temporal.
              Antes de acceder al portal, necesitas establecer una contraseña nueva y segura.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-background/70 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-foreground">Requisitos mínimos</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {PASSWORD_RULES.map((rule) => (
                    <li key={rule} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <PasswordField
              label="Contraseña temporal actual"
              value={form.currentPassword}
              onChange={(value) => handleChange('currentPassword', value)}
              showPassword={showCurrentPassword}
              onToggleShow={() => setShowCurrentPassword((prev) => !prev)}
              autoComplete="current-password"
            />

            <PasswordField
              label="Nueva contraseña"
              value={form.newPassword}
              onChange={(value) => handleChange('newPassword', value)}
              showPassword={showNewPassword}
              onToggleShow={() => setShowNewPassword((prev) => !prev)}
              autoComplete="new-password"
            />

            {form.newPassword && passwordErrors.length > 0 && (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
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
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                {confirmError}
              </div>
            )}

            {serverError && (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                {serverError}
              </div>
            )}

            {successMessage && (
              <div className="rounded-2xl border border-success/20 bg-success/10 p-4 text-sm text-success">
                {successMessage}
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2">
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-accent"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

export { StudentForcePasswordChangeView };

function PortalBackgroundMock() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r border-border/60 bg-card/80 p-6 lg:block">
          <div className="h-10 w-36 rounded-2xl bg-muted" />
          <div className="mt-10 space-y-3">
            <div className="h-10 rounded-2xl bg-primary/15" />
            <div className="h-10 rounded-2xl bg-muted" />
            <div className="h-10 rounded-2xl bg-muted" />
            <div className="h-10 rounded-2xl bg-muted" />
          </div>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="border-b border-border/60 bg-background/80 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="h-9 w-56 rounded-2xl bg-muted" />
              <div className="h-9 w-28 rounded-2xl bg-muted" />
            </div>
          </header>

          <div className="grid flex-1 gap-6 p-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm lg:col-span-2">
              <div className="h-5 w-36 rounded bg-muted" />
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="h-28 rounded-2xl bg-muted" />
                <div className="h-28 rounded-2xl bg-muted" />
                <div className="h-28 rounded-2xl bg-muted" />
              </div>
              <div className="mt-6 h-64 rounded-3xl bg-muted" />
            </div>

            <div className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm">
              <div className="h-5 w-28 rounded bg-muted" />
              <div className="mt-6 space-y-4">
                <div className="h-16 rounded-2xl bg-muted" />
                <div className="h-16 rounded-2xl bg-muted" />
                <div className="h-16 rounded-2xl bg-muted" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted-foreground">
          <LockKeyhole className="h-4 w-4" />
        </div>

        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className="h-11 w-full rounded-2xl border border-input bg-background pl-11 pr-12 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
        />

        <button
          type="button"
          onClick={onToggleShow}
          className="absolute inset-y-0 right-3 inline-flex items-center text-muted-foreground transition hover:text-foreground"
          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}