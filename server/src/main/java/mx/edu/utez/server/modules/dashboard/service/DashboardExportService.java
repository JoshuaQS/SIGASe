package mx.edu.utez.server.modules.dashboard.service;

import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTopCareerItemResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTopStudentItemResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTrendPointResponse;
import mx.edu.utez.server.shared.enums.StudentStatus;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.springframework.stereotype.Service;

@Service
public class DashboardExportService {

    private static final DateTimeFormatter FILE_TS_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd_HHmmss").withZone(ZoneOffset.UTC);

    private final DashboardService dashboardService;

    public DashboardExportService(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    public void export(
            OutputStream out,
            String format,
            Instant dateFrom,
            Instant dateTo,
            String analysisType,
            UUID studentId,
            List<String> careerCodes,
            String status,
            StudentStatus studentStatus,
            String sortDir,
            Boolean topEnabled,
            Integer topN
    ) throws IOException {
        DashboardService.DashboardExportSnapshot snapshot = dashboardService.buildExportSnapshot(
                dateFrom,
                dateTo,
                analysisType,
                studentId,
                careerCodes,
                status,
                studentStatus,
                sortDir,
                topEnabled,
                topN
        );

        if ("xlsx".equalsIgnoreCase(format)) {
            exportXlsx(out, snapshot);
            return;
        }
        exportCsv(out, snapshot);
    }

    public String buildFilename(String format) {
        return "dashboard-monitoring_" + FILE_TS_FORMAT.format(Instant.now()) + "." + format.toLowerCase(Locale.ROOT);
    }

    private void exportCsv(OutputStream out, DashboardService.DashboardExportSnapshot snapshot) throws IOException {
        try (Writer writer = new OutputStreamWriter(out, StandardCharsets.UTF_8)) {
            writer.write('\uFEFF');

            writer.write("SECCION,CLAVE,VALOR\r\n");
            writeCsvLine(writer, "resumen", "totalStudents", String.valueOf(snapshot.summary().totalStudents()));
            writeCsvLine(writer, "resumen", "activeStudents", String.valueOf(snapshot.summary().activeStudents()));
            writeCsvLine(writer, "resumen", "inactiveStudents", String.valueOf(snapshot.summary().inactiveStudents()));
            writeCsvLine(writer, "resumen", "successfulAccessesInRange", String.valueOf(snapshot.summary().successfulAccessesInRange()));
            writeCsvLine(writer, "resumen", "failedAccessesInRange", String.valueOf(snapshot.summary().failedAccessesInRange()));
            writeCsvLine(writer, "resumen", "successRate", String.valueOf(snapshot.summary().successRate()));
            writeCsvLine(writer, "resumen", "uniqueStudentsWithSuccessfulAccess", String.valueOf(snapshot.summary().uniqueStudentsWithSuccessfulAccess()));
            writeCsvLine(writer, "resumen", "currentElibroConfigStatus", snapshot.summary().currentElibroConfigStatus());

            writer.write("\r\n");
            writer.write("TENDENCIAS_DIA,SUCCESS,FAILED\r\n");
            for (DashboardTrendPointResponse point : snapshot.trends().points()) {
                writeCsvLine(writer, point.day(), String.valueOf(point.successful()), String.valueOf(point.failed()));
            }

            writer.write("\r\n");
            writer.write("TOP_CARRERAS_CODE,TOP_CARRERAS_NAME,SUCCESS,FAILED,TOTAL\r\n");
            for (DashboardTopCareerItemResponse item : snapshot.topCareers().careers()) {
                writeCsvLine(
                        writer,
                        item.careerCode(),
                        item.careerName(),
                        String.valueOf(item.successfulAccesses()),
                        String.valueOf(item.failedAccesses()),
                        String.valueOf(item.totalAccesses())
                );
            }

            writer.write("\r\n");
            writer.write("TOP_USERS_ID,TOP_USERS_NAME,ENROLLMENT,SUCCESS,FAILED,TOTAL\r\n");
            for (DashboardTopStudentItemResponse item : snapshot.topStudents().students()) {
                writeCsvLine(
                        writer,
                        item.studentId() == null ? "" : item.studentId().toString(),
                        item.name(),
                        item.enrollmentId(),
                        String.valueOf(item.successfulAccesses()),
                        String.valueOf(item.failedAccesses()),
                        String.valueOf(item.totalAccesses())
                );
            }
            writer.flush();
        }
    }

    private void exportXlsx(OutputStream out, DashboardService.DashboardExportSnapshot snapshot) throws IOException {
        try (SXSSFWorkbook wb = new SXSSFWorkbook(100)) {
            CellStyle headerStyle = createHeaderStyle(wb);

            Sheet summary = wb.createSheet("Resumen");
            writeHeader(summary.createRow(0), headerStyle, "Clave", "Valor");
            writeSummaryRows(summary, snapshot);
            autosize(summary, 2);

            Sheet trends = wb.createSheet("Tendencias");
            writeHeader(trends.createRow(0), headerStyle, "Dia", "Success", "Failed");
            int trendRow = 1;
            for (DashboardTrendPointResponse point : snapshot.trends().points()) {
                Row row = trends.createRow(trendRow++);
                row.createCell(0).setCellValue(point.day());
                row.createCell(1).setCellValue(point.successful());
                row.createCell(2).setCellValue(point.failed());
            }
            autosize(trends, 3);

            Sheet careers = wb.createSheet("Top Carreras");
            writeHeader(careers.createRow(0), headerStyle, "Career Code", "Career Name", "Success", "Failed", "Total");
            int careerRow = 1;
            for (DashboardTopCareerItemResponse item : snapshot.topCareers().careers()) {
                Row row = careers.createRow(careerRow++);
                row.createCell(0).setCellValue(item.careerCode());
                row.createCell(1).setCellValue(item.careerName());
                row.createCell(2).setCellValue(item.successfulAccesses());
                row.createCell(3).setCellValue(item.failedAccesses());
                row.createCell(4).setCellValue(item.totalAccesses());
            }
            autosize(careers, 5);

            Sheet students = wb.createSheet("Top Usuarios");
            writeHeader(students.createRow(0), headerStyle, "Student Id", "Name", "Enrollment", "Success", "Failed", "Total");
            int studentRow = 1;
            for (DashboardTopStudentItemResponse item : snapshot.topStudents().students()) {
                Row row = students.createRow(studentRow++);
                row.createCell(0).setCellValue(item.studentId() == null ? "" : item.studentId().toString());
                row.createCell(1).setCellValue(item.name());
                row.createCell(2).setCellValue(item.enrollmentId());
                row.createCell(3).setCellValue(item.successfulAccesses());
                row.createCell(4).setCellValue(item.failedAccesses());
                row.createCell(5).setCellValue(item.totalAccesses());
            }
            autosize(students, 6);

            wb.write(out);
        }
    }

    private void writeSummaryRows(Sheet sheet, DashboardService.DashboardExportSnapshot snapshot) {
        String[][] rows = new String[][]{
                {"totalStudents", String.valueOf(snapshot.summary().totalStudents())},
                {"activeStudents", String.valueOf(snapshot.summary().activeStudents())},
                {"inactiveStudents", String.valueOf(snapshot.summary().inactiveStudents())},
                {"successfulAccessesInRange", String.valueOf(snapshot.summary().successfulAccessesInRange())},
                {"failedAccessesInRange", String.valueOf(snapshot.summary().failedAccessesInRange())},
                {"successRate", String.valueOf(snapshot.summary().successRate())},
                {"uniqueStudentsWithSuccessfulAccess", String.valueOf(snapshot.summary().uniqueStudentsWithSuccessfulAccess())},
                {"currentElibroConfigStatus", snapshot.summary().currentElibroConfigStatus()}
        };

        int rowIndex = 1;
        for (String[] rowData : rows) {
            Row row = sheet.createRow(rowIndex++);
            row.createCell(0).setCellValue(rowData[0]);
            row.createCell(1).setCellValue(rowData[1]);
        }
    }

    private CellStyle createHeaderStyle(SXSSFWorkbook wb) {
        CellStyle style = wb.createCellStyle();
        Font font = wb.createFont();
        font.setBold(true);
        style.setFont(font);
        return style;
    }

    private void writeHeader(Row row, CellStyle style, String... values) {
        for (int i = 0; i < values.length; i++) {
            Cell cell = row.createCell(i);
            cell.setCellValue(values[i]);
            cell.setCellStyle(style);
        }
    }

    private void autosize(Sheet sheet, int columns) {
        // SXSSFWorkbook can throw at runtime when auto-size tracking is not enabled.
        // Use fixed, readable widths instead of auto-sizing to keep streaming export stable.
        for (int i = 0; i < columns; i++) {
            sheet.setColumnWidth(i, 20 * 256);
        }
    }

    private void writeCsvLine(Writer writer, String... values) throws IOException {
        for (int i = 0; i < values.length; i++) {
            if (i > 0) {
                writer.write(',');
            }
            writer.write(escapeCsv(values[i]));
        }
        writer.write("\r\n");
    }

    private String escapeCsv(String value) {
        String safe = value == null ? "" : value;
        if (!safe.isEmpty()) {
            char first = safe.charAt(0);
            if (first == '=' || first == '+' || first == '-' || first == '@' || first == '\t' || first == '\r') {
                safe = "'" + safe;
            }
        }
        boolean needsQuotes = safe.contains(",") || safe.contains("\n") || safe.contains("\r") || safe.contains("\"");
        if (!needsQuotes) {
            return safe;
        }
        return "\"" + safe.replace("\"", "\"\"") + "\"";
    }
}
