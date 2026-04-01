import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type InputState = "default" | "error" | "success";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  state?: InputState;
  leadingIcon?: LucideIcon;
  trailingIcon?: LucideIcon;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      state = "default",
      leadingIcon: LeadingIcon,
      trailingIcon: TrailingIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <div className="relative">
        {LeadingIcon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <LeadingIcon className="h-4 w-4" />
          </span>
        ) : null}

        <input
          ref={ref}
          disabled={disabled}
          className={cn(
            "flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition-all",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus-visible:border-transparent focus-visible:ring-2",
            "disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:opacity-60",
            state === "default" && "focus-visible:ring-ring",
            state === "error" &&
            "border-destructive focus-visible:ring-destructive/30",
            state === "success" &&
            "border-success focus-visible:ring-success/30",
            LeadingIcon && "pl-9",
            TrailingIcon && "pr-9",
            className
          )}
          {...props}
        />

        {TrailingIcon ? (
          <span
            className={cn(
              "pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2",
              state === "error" && "text-destructive",
              state === "success" && "text-success",
              state === "default" && "text-muted-foreground"
            )}
          >
            <TrailingIcon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";