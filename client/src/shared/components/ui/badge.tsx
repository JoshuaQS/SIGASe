import * as React from "react";
import { cn } from "@/shared/lib/utils";

export type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outlined"
  | "success"
  | "warning"
  | "info"
  | "muted"
  | "reserved"
  | "filled";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dotClassName?: string;
}

const variantClass: Record<BadgeVariant, string> = {
  default: "border-primary/30 bg-primary/10 text-primary",
  secondary: "border-transparent bg-secondary text-secondary-foreground",
  destructive: "border-destructive/30 bg-destructive/10 text-destructive",
  outlined: "border-border bg-transparent text-foreground",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  info: "border-info/30 bg-info/10 text-info",
  muted: "border-border bg-muted text-muted-foreground",
  reserved: "border-reserved/30 bg-reserved/10 text-reserved",
  filled: "border-transparent bg-primary text-primary-foreground",
};

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", dotClassName, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium flex-shrink-0",
        variantClass[variant],
        className
      )}
      {...props}
    >
      {dotClassName ? (
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotClassName)} aria-hidden />
      ) : null}
      {children}
    </span>
  )
);
Badge.displayName = "Badge";

export { Badge };
