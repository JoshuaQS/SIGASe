import { cn } from '@/lib/utils';

interface AuthDividerProps {
  label?: string;
  className?: string;
  labelClassName?: string;
}

export default function AuthDivider({
  label = 'Acceso alterno',
  className,
  labelClassName,
}: AuthDividerProps) {
  return (
    <div className={cn('flex w-full items-center gap-3', className)}>
      <div className="h-px flex-1 bg-border" />
      <span
        className={cn(
          'shrink-0 text-xs text-muted-foreground',
          labelClassName,
        )}
      >
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
