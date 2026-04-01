import { Eye, Lock, Server, ShieldCheck } from 'lucide-react';
import { FormSection, FormSectionHeader } from '@/components/ui/forms/form-section';

interface SecurityRuleProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

function SecurityRule({ icon: Icon, title, description }: SecurityRuleProps) {
  return (
    <div className="flex gap-2.5">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary">
        <Icon className="h-3 w-3 text-muted-foreground" aria-hidden />
      </div>
      <div>
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function SsoSecurityCard() {
  return (
    <FormSection className="p-5">
      <FormSectionHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/10">
            <ShieldCheck className="h-3.5 w-3.5 text-warning" aria-hidden />
          </div>
          <p className="text-sm font-semibold text-foreground">Seguridad</p>
        </div>
      </FormSectionHeader>

      <div className="space-y-3.5 pt-1">
        <SecurityRule
          icon={Lock}
          title="Cifrado en reposo"
          description="Auth Token, Channel ID y Channel Secret se almacenan cifrados en base de datos. Nunca se devuelven en texto plano."
        />
        <SecurityRule
          icon={Eye}
          title="Sin exposición en UI"
          description="Los valores reales nunca se cargan en la interfaz. Solo se muestra '••••••••••••' para confirmar que están configurados."
        />
        <SecurityRule
          icon={Server}
          title="Transmisión segura"
          description="Las credenciales se envían únicamente en el flujo SSO server-to-server hacia auth.elibro.net bajo HTTPS."
        />
        <SecurityRule
          icon={ShieldCheck}
          title="Acceso restringido"
          description="Solo el rol Administrador TI puede ver y editar esta configuración."
        />
      </div>

      <div className="mt-3 rounded-md border border-border bg-muted/30 px-3 py-2">
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Flujo SSO: <code className="font-mono">POST /auth/sso/</code> con cabecera{' '}
          <code className="font-mono">Authorization: Token AUTH_TOKEN</code> y body{' '}
          <code className="font-mono">&#123; secret, channel_id, user &#125;</code>. Respuesta:{' '}
          <code className="font-mono">&#123; url: "…?ticket=…" &#125;</code>
        </p>
      </div>
    </FormSection>
  );
}
