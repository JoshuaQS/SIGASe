import { CsvImport, type CsvImportParsed } from "@/features/students/components/import/csv-import";

type FileImportFormProps = {
  fullWidth?: boolean;
  importing?: boolean;
  hideActions?: boolean;
  onOpenPickerReady?: (openPicker: () => void) => void;
  onImport?: (data: CsvImportParsed) => void | Promise<void>;
  onDownloadTemplate?: () => void;
};

export function FileImportForm({
  fullWidth,
  importing,
  hideActions,
  onOpenPickerReady,
  onImport,
  onDownloadTemplate,
}: FileImportFormProps) {
  return (
    <CsvImport
      fullWidth={fullWidth}
      importing={importing}
      hideActions={hideActions}
      onOpenPickerReady={onOpenPickerReady}
      onImport={onImport}
      onDownloadTemplate={onDownloadTemplate}
    />
  );
}

