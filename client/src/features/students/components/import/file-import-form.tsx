import { CsvImport, type CsvImportParsed } from "@/features/students/components/import/csv-import";

type FileImportFormProps = {
  fullWidth?: boolean;
  importing?: boolean;
  onImport?: (data: CsvImportParsed) => void | Promise<void>;
  onDownloadTemplate?: () => void;
};

export function FileImportForm({ fullWidth, importing, onImport, onDownloadTemplate }: FileImportFormProps) {
  return (
    <CsvImport
      showSimulateError
      fullWidth={fullWidth}
      importing={importing}
      onImport={onImport}
      onDownloadTemplate={onDownloadTemplate}
    />
  );
}
