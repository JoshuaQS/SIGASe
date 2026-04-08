import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface FieldMessageProps extends React.HTMLAttributes<HTMLParagraphElement> {
  variant?: "hint" | "error" | "success" | "warning";
  icon?: LucideIcon;
}

export function FieldMessage({
  className,
  variant = "hint",
  icon: Icon,
  children,
  ...props
}: FieldMessageProps) {
  return (
    <p
      className={cn(
        "flex items-center gap-1 text-xs",
        variant === "hint" && "text-muted-foreground",
        variant === "error" && "text-destructive",
        variant === "success" && "text-success",
        variant === "warning" && "text-warning",
        className
      )}
      {...props}
    >
      {Icon ? <Icon className="h-3 w-3 flex-shrink-0" /> : null}
      <span>{children}</span>
    </p>
  );
}