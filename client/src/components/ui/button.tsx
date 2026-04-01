import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export type buttonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "success"
  | "warning"
  | "info"
  | "link";

export type buttonSize = "xs" | "sm" | "md" | "lg" | "icon" | "icon-sm" | "icon-xs";
export type buttonShape = "rounded" | "pill";

export interface buttonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: buttonVariant;
  size?: buttonSize;
  shape?: buttonShape;
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode | React.ElementType;
  rightIcon?: React.ReactNode | React.ElementType;
}

const variantClass: Record<buttonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md active:scale-[0.98]",
  secondary: "bg-secondary text-secondary-foreground border border-border hover:bg-muted active:bg-secondary/80 active:scale-[0.98]",
  outline: "border border-border text-foreground hover:bg-accent active:bg-accent/80 active:scale-[0.98]",
  ghost: "text-foreground hover:bg-accent active:bg-accent/80 active:scale-[0.98]",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md active:scale-[0.98]",
  success: "bg-success text-success-foreground hover:bg-success/90 shadow-md active:scale-[0.98]",
  warning: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-md active:scale-[0.98]",
  info: "bg-info text-info-foreground hover:bg-info/90 shadow-md active:scale-[0.98]",
  link: "text-primary underline-offset-4 hover:underline p-0 h-auto active:scale-100",
};

const sizeClass: Record<buttonSize, string> = {
  xs: "h-7 px-2 text-[10px] gap-1",
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 py-2 text-sm gap-2",
  lg: "h-11 px-6 text-base gap-2.5",
  icon: "h-9 w-9 p-0 justify-center",
  "icon-sm": "h-8 w-8 p-0 justify-center",
  "icon-xs": "h-7 w-7 p-0 justify-center",
};

const button = React.forwardRef<HTMLButtonElement, buttonProps>(
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
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    const renderIcon = (icon: React.ReactNode | React.ElementType, iconSize: string) => {
      if (!icon) return null;
      if (React.isValidElement(icon)) return icon;
      const IconComp = icon as React.ElementType;
      return <IconComp className={cn("shrink-0", iconSize)} />;
    };

    const iconSize = size === "sm" || size === "xs" ? "h-3.5 w-3.5" : "h-4 w-4";

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
          variantClass[variant],
          sizeClass[size],
          shape === "pill" ? "rounded-full" : "rounded-sm",
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
        {!isLoading && renderIcon(leftIcon, iconSize)}
        {children}
        {!isLoading && renderIcon(rightIcon, iconSize)}
      </button>
    );
  }
);

button.displayName = "button";

export { button };
