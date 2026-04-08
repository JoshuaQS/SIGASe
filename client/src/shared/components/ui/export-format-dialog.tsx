import { FileSpreadsheet, FileText } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'

type ExportFormat = 'csv' | 'xlsx'

type ExportFormatDialogProps = {
  open: boolean
  title: string
  description: string
  loading?: boolean
  onClose: () => void
  onSelect: (format: ExportFormat) => void
}

export function ExportFormatDialog({
  open,
  title,
  description,
  loading = false,
  onClose,
  onSelect,
}: ExportFormatDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent size="2">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            variant="outline"
            className="h-auto min-h-28 flex-col items-start justify-start gap-2 p-4 text-left"
            disabled={loading}
            onClick={() => onSelect('csv')}
          >
            <FileText className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold">CSV</span>
            <span className="text-xs text-muted-foreground">
              Ligero y fácil de abrir en hojas de cálculo o procesos de soporte.
            </span>
          </Button>
          <Button
            variant="outline"
            className="h-auto min-h-28 flex-col items-start justify-start gap-2 p-4 text-left"
            disabled={loading}
            onClick={() => onSelect('xlsx')}
          >
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold">XLSX</span>
            <span className="text-xs text-muted-foreground">
              Mantiene mejor estructura para análisis manual y trabajo en Excel.
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
