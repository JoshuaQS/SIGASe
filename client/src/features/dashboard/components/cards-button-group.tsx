import { Button } from "@/shared/components/ui/button"
import { ButtonGroup } from "@/shared/components/ui/button-group"
import { cn } from "@/shared/lib/utils"

export type CardsButtonGroupValue = "ALL" | "SUCCESS" | "FAILED"

export function CardsButtonGroup({
  value,
  onValueChange,
  disabled = false,
  size = "sm",
}: {
  value: CardsButtonGroupValue
  onValueChange: (value: CardsButtonGroupValue) => void
  disabled?: boolean
  size?: "xs" | "sm" | "md"
}) {
  return (
    <ButtonGroup className="h-8 rounded-lg border border-border/70 bg-muted/20 p-1 shadow-xs">
      {(["ALL", "SUCCESS", "FAILED"] as const).map((key) => (
        <Button
          key={key}
          type="button"
          variant="ghost"
          size={size}
          shape="rounded"
          disabled={disabled}
          className={cn(
            "h-6 min-w-[78px] rounded-md px-3 text-[11px] font-semibold shadow-none",
            "hover:bg-muted/70",
            value === key && key === "ALL" && "bg-foreground text-background hover:bg-foreground/90",
            value === key && key === "SUCCESS" && "bg-emerald-600 text-white hover:bg-emerald-600/90",
            value === key && key === "FAILED" && "bg-rose-600 text-white hover:bg-rose-600/90",
            value !== key && key === "SUCCESS" && "text-emerald-700",
            value !== key && key === "FAILED" && "text-rose-700",
            value !== key && key === "ALL" && "text-foreground/80",
          )}
          onClick={() => onValueChange(key)}
        >
          {key === "ALL" ? "Ambos" : key === "SUCCESS" ? "Exitosos" : "Fallidos"}
        </Button>
      ))}
    </ButtonGroup>
  )
}
