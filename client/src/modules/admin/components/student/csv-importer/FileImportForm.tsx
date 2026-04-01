import { CsvImport } from "@/modules/admin/components/student/csv-importer/CsvImport";

export function FileImportForm({ fullWidth }: { fullWidth?: boolean }) {
  return <CsvImport showSimulateError fullWidth={fullWidth} />;
}
