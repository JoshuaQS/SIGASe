import { useMemo, useState } from 'react';
import { AlertTriangle, Eye, EyeOff, LockKeyhole, LogOut, ShieldCheck } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';

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
    <section className="relative flex min-h-[calc(100dvh-6.5rem)] items-center justify-center overflow-hidden px-4 py-3 md:px-6 md:py-4">
      <PortalBackdropMock />
      <div className="absolute inset-0 bg-background/14 backdrop-blur-md" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,hsl(var(--primary)/0.10),transparent_22%),radial-gradient(circle_at_84%_24%,hsl(var(--primary)/0.08),transparent_20%),radial-gradient(circle_at_72%_78%,hsl(var(--primary)/0.07),transparent_22%),radial-gradient(circle_at_24%_80%,hsl(var(--primary)/0.06),transparent_20%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-primary/6 via-primary/3 to-transparent" />

      <div className="relative z-10 w-full max-w-lg rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-2xl backdrop-blur-2xl lg:p-7">
        <div className="inline-flex items-center gap-2 rounded-full border border-warning/20 bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
          <AlertTriangle className="h-4 w-4" />
          Acción obligatoria
        </div>

        <div className="mt-4 space-y-2.5">
          <h1 className="text-3xl font-bold tracking-tight text-foreground lg:text-[2rem]">
            Establece una contraseña para continuar
          </h1>

          <p className="text-sm leading-6 text-muted-foreground">
            {studentName ? `${studentName}, p` : 'P'}ara entrar al portal estudiantil por primera vez,
            necesitas crear una contraseña nueva y segura.
          </p>
        </div>

        <div className="mt-5 rounded-[1.35rem] border border-border/80 bg-background/60 p-4 shadow-sm">
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

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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

          <div className="flex flex-col gap-3 pt-1">
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Estableciendo...' : 'Establecer contraseña'}
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
    </section>
  );
}

export { StudentForcePasswordChangeView };

function PortalBackdropMock() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-[8%] top-[10%] h-20 w-20 rounded-full bg-primary/8 blur-3xl" />
      <div className="absolute right-[14%] top-[16%] h-16 w-16 rounded-full bg-primary/7 blur-3xl" />
      <div className="absolute left-[24%] bottom-[18%] h-14 w-14 rounded-full bg-primary/6 blur-2xl" />
      <div className="absolute right-[28%] bottom-[14%] h-[4.5rem] w-[4.5rem] rounded-full bg-primary/7 blur-3xl" />

      <div className="mx-auto grid h-full w-full max-w-[1700px] grid-cols-1 gap-2.5 px-6 py-5 xl:grid-cols-12 xl:items-start xl:gap-x-4 xl:gap-y-2.5">
        <Card className="rounded-[calc(2rem-1px)] border-border/50 bg-card/34 px-6 py-4 shadow-sm backdrop-blur-xl xl:col-span-12">
          <div className="flex items-center justify-between gap-6">
            <div className="space-y-2.5">
              <div className="h-3 w-28 rounded-full bg-primary/20" />
              <div className="h-8 w-72 rounded-2xl bg-foreground/10" />
              <div className="h-3.5 w-52 rounded-full bg-muted/80" />
            </div>
            <div className="hidden h-12 w-36 rounded-[1.5rem] bg-primary/12 lg:block" />
          </div>
        </Card>

        <Card className="rounded-[1.5rem] border-border/50 bg-card/34 p-4 shadow-sm backdrop-blur-xl xl:col-span-7">
          <div className="mb-3 flex items-center justify-between">
            <div className="h-3 w-32 rounded-full bg-muted/80" />
            <div className="h-7 w-24 rounded-full bg-primary/12" />
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div className="h-20 rounded-[1.1rem] bg-background/70" />
            <div className="h-20 rounded-[1.1rem] bg-background/70" />
            <div className="h-20 rounded-[1.1rem] bg-background/70" />
          </div>
        </Card>

        <Card className="rounded-[1.5rem] border-border/50 bg-card/34 p-4 shadow-sm backdrop-blur-xl xl:col-span-5">
          <div className="mb-3 h-3 w-36 rounded-full bg-muted/80" />
          <div className="space-y-2.5">
            <div className="h-12 rounded-[1.1rem] bg-background/70" />
            <div className="h-12 rounded-[1.1rem] bg-background/70" />
            <div className="h-12 rounded-[1.1rem] bg-background/70" />
          </div>
        </Card>

        <Card className="rounded-[1.5rem] border-border/50 bg-card/34 p-4 shadow-sm backdrop-blur-xl xl:col-span-4">
          <div className="mb-3 h-3 w-28 rounded-full bg-muted/80" />
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="h-2.5 w-2.5 rounded-full bg-success/70" />
              <div className="h-3.5 w-40 rounded-full bg-foreground/10" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2.5 w-2.5 rounded-full bg-warning/70" />
              <div className="h-3.5 w-44 rounded-full bg-foreground/10" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2.5 w-2.5 rounded-full bg-info/70" />
              <div className="h-3.5 w-36 rounded-full bg-foreground/10" />
            </div>
          </div>
        </Card>

        <Card className="rounded-[1.5rem] border-border/50 bg-card/34 p-4 shadow-sm backdrop-blur-xl xl:col-span-4">
          <div className="mb-3 h-3 w-24 rounded-full bg-muted/80" />
          <div className="flex h-[8.5rem] items-end gap-2.5">
            <div className="h-12 flex-1 rounded-t-[0.9rem] bg-primary/14" />
            <div className="h-[4.5rem] flex-1 rounded-t-[0.9rem] bg-primary/18" />
            <div className="h-24 flex-1 rounded-t-[0.9rem] bg-primary/20" />
            <div className="h-14 flex-1 rounded-t-[0.9rem] bg-primary/14" />
          </div>
        </Card>

        <Card className="rounded-[1.5rem] border-border/50 bg-card/34 p-4 shadow-sm backdrop-blur-xl xl:col-span-4">
          <div className="mb-3 h-3 w-32 rounded-full bg-muted/80" />
          <div className="flex h-[8.5rem] items-center justify-center rounded-[1.1rem] bg-background/65">
            <div className="h-20 w-20 rounded-full border-8 border-primary/18 border-t-primary/35" />
          </div>
        </Card>
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
