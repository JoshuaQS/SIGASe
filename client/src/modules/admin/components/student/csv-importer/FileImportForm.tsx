import { CsvImport, type CsvImportParsed } from "@/modules/admin/components/student/csv-importer/CsvImport";

type FileImportFormProps = {
  fullWidth?: boolean;
  importing?: boolean;
  onImport?: (data: CsvImportParsed) => void | Promise<void>;
};

export function FileImportForm({ fullWidth, importing, onImport }: FileImportFormProps) {
  return <CsvImport showSimulateError fullWidth={fullWidth} importing={importing} onImport={onImport} />;
}
