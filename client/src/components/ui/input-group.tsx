import * as React from "react"
import { cn } from "@/lib/utils"
import { Slot } from "@radix-ui/react-slot"
import { button as Button } from "@/components/ui/button"

const InputGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex w-full items-center rounded-xl border border-sidebar-border bg-sidebar-accent/30 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-all px-3",
        className
      )}
      {...props}
    />
  )
)
InputGroup.displayName = "InputGroup"

const InputGroupAddon = React.forwardRef<
  HTMLDivElement, 
  React.HTMLAttributes<HTMLDivElement> & { align?: "inline-start" | "inline-end" }
>(({ className, align = "inline-start", ...props }, ref) => (
  <div
    ref={ref}
    data-slot="input-group-addon"
    className={cn(
      "flex items-center text-muted-foreground shrink-0 gap-1",
      align === "inline-start" ? "mr-1" : "ml-auto",
      className
    )}
    {...props}
  />
))
InputGroupAddon.displayName = "InputGroupAddon"

const InputGroupInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground/50 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
InputGroupInput.displayName = "InputGroupInput"

const InputGroupButton = React.forwardRef<
  HTMLButtonElement, 
  React.ComponentPropsWithoutRef<typeof Button> & { render?: React.ReactNode }
>(({ className, render, ...props }, ref) => {
  if (render) {
    return (
      <Slot
        ref={ref}
        className={cn("shrink-0", className)}
        {...props}
      >
        {render}
      </Slot>
    )
  }

  return (
    <Button
      ref={ref}
      className={cn("shrink-0", className)}
      {...props}
    />
  )
})
InputGroupButton.displayName = "InputGroupButton"

export { InputGroup, InputGroupAddon, InputGroupInput, InputGroupButton }
