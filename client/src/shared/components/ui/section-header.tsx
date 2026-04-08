import { cn } from '@/shared/lib/utils';

interface SectionHeaderProps {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 flex-wrap', className)}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold leading-tight text-foreground">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
