import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "success"
  | "warning"
  | "info"
  | "link";

export type ButtonSize =
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "icon"
  | "icon-sm"
  | "icon-xs";

export type ButtonShape = "rounded" | "pill";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode | React.ElementType;
  rightIcon?: React.ReactNode | React.ElementType;
  asChild?: boolean;
}

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 active:scale-[0.98]",
  secondary:
    "border border-border bg-secondary text-secondary-foreground hover:bg-muted active:scale-[0.98]",
  outline:
    "border border-border bg-transparent text-foreground hover:bg-accent active:scale-[0.98]",
  ghost:
    "bg-transparent text-foreground hover:bg-accent active:scale-[0.98]",
  destructive:
    "bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90 active:scale-[0.98]",
  success:
    "bg-success text-success-foreground shadow-md hover:bg-success/90 active:scale-[0.98]",
  warning:
    "bg-warning text-warning-foreground shadow-md hover:bg-warning/90 active:scale-[0.98]",
  info: "bg-info text-info-foreground shadow-md hover:bg-info/90 active:scale-[0.98]",
  link: "h-auto p-0 text-primary underline-offset-4 hover:underline active:scale-100",
};

const sizeClass: Record<ButtonSize, string> = {
  xs: "h-7 px-2 text-[10px] gap-1",
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-6 text-base gap-2.5",
  icon: "h-9 w-9 p-0",
  "icon-sm": "h-8 w-8 p-0",
  "icon-xs": "h-7 w-7 p-0",
};

const iconSizeClass: Record<ButtonSize, string> = {
  xs: "h-3 w-3",
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
  icon: "h-4 w-4",
  "icon-sm": "h-3.5 w-3.5",
  "icon-xs": "h-3 w-3",
};

function renderIcon(
  icon: React.ReactNode | React.ElementType | undefined,
  iconSize: string
) {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon;
  const IconComponent = icon as React.ElementType;
  return <IconComponent className={cn("shrink-0", iconSize)} />;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      shape = "rounded",
      fullWidth = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      asChild = false,
      onClick,
      tabIndex,
      type,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;
    const Comp = asChild ? Slot : "button";
    const iconSize = iconSizeClass[size];
    const isLinkVariant = variant === "link";
    const isIconOnly = size === "icon" || size === "icon-sm" || size === "icon-xs";

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      onClick?.(e);
    };

    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : (type ?? "button")}
        disabled={asChild ? undefined : isDisabled}
        aria-disabled={isDisabled || undefined}
        data-disabled={isDisabled ? "" : undefined}
        tabIndex={isDisabled && asChild ? -1 : tabIndex}
        onClick={handleClick}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-50",
          !asChild && "cursor-pointer",
          isDisabled && asChild && "pointer-events-none opacity-50",
          !isLinkVariant && sizeClass[size],
          variantClass[variant],
          shape === "pill" ? "rounded-full" : "rounded-sm",
          fullWidth && "w-full",
          isIconOnly && "shrink-0",
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className={cn("animate-spin shrink-0", iconSize)} />
            {!isIconOnly && children ? <span>{children}</span> : null}
          </>
        ) : (
          <>
            {renderIcon(leftIcon, iconSize)}
            {children}
            {renderIcon(rightIcon, iconSize)}
          </>
        )}
      </Comp>
    );
  }
);

Button.displayName = "Button";