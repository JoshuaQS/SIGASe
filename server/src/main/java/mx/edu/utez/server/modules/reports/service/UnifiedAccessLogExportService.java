package mx.edu.utez.server.modules.reports.service;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.io.OutputStream;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import mx.edu.utez.server.modules.accesslogs.dto.AccessLogActorType;
import mx.edu.utez.server.modules.accesslogs.dto.AccessLogQueryFilters;
import mx.edu.utez.server.modules.accesslogs.dto.AccessLogResponse;
import mx.edu.utez.server.modules.accesslogs.dto.AccessLogScope;
import mx.edu.utez.server.modules.accesslogs.service.AccessLogQueryService;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class UnifiedAccessLogExportService {

    private static final String[] HEADERS = {
            "occurredAt",
            "actorType",
            "scope",
            "actorId",
            "actorName",
            "actorEmail",
            "result",
            "reason",
            "requestId",
            "correlationId",
            "sessionId",
            "ipAddressMasked",
            "userAgentSanitized",
            "latencyMs",
            "nextUrl",
            "redirectUrl",
            "providerStatusCode",
            "providerErrorCode",
            "providerErrorMessage",
            "channelName",
            "metadata"
    };

    private static final List<Function<AccessLogResponse, String>> CSV_EXTRACTORS = List.of(
            log -> CsvExportService.formatInstant(log.occurredAt()),
            log -> stringValue(log.actorType()),
            log -> stringValue(log.scope()),
            log -> stringValue(log.actorId()),
            log -> stringValue(log.actorName()),
            log -> stringValue(log.actorEmail()),
            log -> stringValue(log.result()),
            log -> safeReason(log.reason()),
            log -> stringValue(log.requestId()),
            log -> stringValue(log.correlationId()),
            log -> stringValue(log.sessionId()),
            log -> stringValue(log.ipAddressMasked()),
            log -> stringValue(log.userAgentSanitized()),
            log -> numberValue(log.latencyMs()),
            log -> stringValue(log.nextUrl()),
            log -> stringValue(log.redirectUrl()),
            log -> numberValue(log.providerStatusCode()),
            log -> stringValue(log.providerErrorCode()),
            log -> stringValue(log.providerErrorMessage()),
            log -> stringValue(log.channelName()),
            log -> metadataValue(log.metadata())
    );

    private final AccessLogQueryService accessLogQueryService;
    private final CsvExportService csvExportService;
    private final ReportExportAuditService reportExportAuditService;

    public UnifiedAccessLogExportService(
            AccessLogQueryService accessLogQueryService,
            CsvExportService csvExportService,
            ReportExportAuditService reportExportAuditService
    ) {
        this.accessLogQueryService = accessLogQueryService;
        this.csvExportService = csvExportService;
        this.reportExportAuditService = reportExportAuditService;
    }

    public void exportCsv(
            OutputStream out,
            AccessLogQueryFilters filters,
            Admin actor,
            HttpServletRequest request
    ) {
        List<AccessLogResponse> rows = accessLogQueryService.listForExport(filters);
        Map<String, Object> filterMeta = buildFilterMeta(filters);
        try {
            csvExportService.write(out, HEADERS, CSV_EXTRACTORS, page -> page == 0 ? rows : List.of());
        } catch (IOException ex) {
            reportExportAuditService.auditExport(actor, "ACCESS_LOGS", filterMeta, rows.size(), "csv", AuditOutcome.FAILURE, request);
            throw new RuntimeException(ex);
        }
        reportExportAuditService.auditExport(actor, "ACCESS_LOGS", filterMeta, rows.size(), "csv", AuditOutcome.SUCCESS, request);
    }

    public void exportXlsx(
            OutputStream out,
            AccessLogQueryFilters filters,
            Admin actor,
            HttpServletRequest request
    ) {
        List<AccessLogResponse> rows = accessLogQueryService.listForExport(filters);
        Map<String, Object> filterMeta = buildFilterMeta(filters);
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            XSSFSheet summarySheet = workbook.createSheet("Resumen");
            writeSummary(summarySheet, workbook, filters, rows.size());

            XSSFSheet detailSheet = workbook.createSheet("Detalle");
            writeDetail(detailSheet, workbook, rows);

            workbook.write(out);
        } catch (Exception ex) {
            reportExportAuditService.auditExport(actor, "ACCESS_LOGS", filterMeta, rows.size(), "xlsx", AuditOutcome.FAILURE, request);
            throw new RuntimeException(ex);
        }
        reportExportAuditService.auditExport(actor, "ACCESS_LOGS", filterMeta, rows.size(), "xlsx", AuditOutcome.SUCCESS, request);
    }

    private void writeSummary(XSSFSheet sheet, XSSFWorkbook workbook, AccessLogQueryFilters filters, int total) {
        CellStyle titleStyle = XlsxExportService.createTitleStyle(workbook);
        CellStyle subtitleStyle = XlsxExportService.createSubtitleStyle(workbook);
        CellStyle labelStyle = XlsxExportService.createKpiLabelStyle(workbook);

        int rowIndex = 0;
        createCell(sheet, rowIndex++, 0, "Reporte de Access Logs — SIGASe", titleStyle);
        createCell(sheet, rowIndex++, 0, "Generado: " + XlsxExportService.formatInstantNow() + " UTC", subtitleStyle);
        createCell(sheet, rowIndex++, 0, "Orden: " + (StringUtils.hasText(filters.sort()) ? filters.sort() : "occurredAt,desc"), subtitleStyle);
        createCell(sheet, rowIndex++, 0, "Filtros: " + summarizeFilters(filters), subtitleStyle);
        rowIndex++;

        writeKpi(sheet, rowIndex++, "Total de registros", total, labelStyle);
        sheet.setColumnWidth(0, 48 * 256);
        sheet.setColumnWidth(1, 18 * 256);
    }

    private void writeDetail(XSSFSheet sheet, XSSFWorkbook workbook, List<AccessLogResponse> rows) {
        CellStyle headerStyle = XlsxExportService.createHeaderStyle(workbook);
        Row headerRow = sheet.createRow(0);
        for (int i = 0; i < HEADERS.length; i++) {
            headerRow.createCell(i).setCellValue(HEADERS[i]);
            headerRow.getCell(i).setCellStyle(headerStyle);
        }

        int rowIndex = 1;
        for (AccessLogResponse row : rows) {
            Row excelRow = sheet.createRow(rowIndex++);
            excelRow.createCell(0).setCellValue(CsvExportService.formatInstant(row.occurredAt()));
            excelRow.createCell(1).setCellValue(XlsxExportService.sanitize(stringValue(row.actorType())));
            excelRow.createCell(2).setCellValue(XlsxExportService.sanitize(stringValue(row.scope())));
            excelRow.createCell(3).setCellValue(XlsxExportService.sanitize(stringValue(row.actorId())));
            excelRow.createCell(4).setCellValue(XlsxExportService.sanitize(stringValue(row.actorName())));
            excelRow.createCell(5).setCellValue(XlsxExportService.sanitize(stringValue(row.actorEmail())));
            excelRow.createCell(6).setCellValue(XlsxExportService.sanitize(stringValue(row.result())));
            excelRow.createCell(7).setCellValue(XlsxExportService.sanitize(safeReason(row.reason())));
            excelRow.createCell(8).setCellValue(XlsxExportService.sanitize(stringValue(row.requestId())));
            excelRow.createCell(9).setCellValue(XlsxExportService.sanitize(stringValue(row.correlationId())));
            excelRow.createCell(10).setCellValue(XlsxExportService.sanitize(stringValue(row.sessionId())));
            excelRow.createCell(11).setCellValue(XlsxExportService.sanitize(stringValue(row.ipAddressMasked())));
            excelRow.createCell(12).setCellValue(XlsxExportService.sanitize(stringValue(row.userAgentSanitized())));
            excelRow.createCell(13).setCellValue(numberValue(row.latencyMs()));
            excelRow.createCell(14).setCellValue(XlsxExportService.sanitize(stringValue(row.nextUrl())));
            excelRow.createCell(15).setCellValue(XlsxExportService.sanitize(stringValue(row.redirectUrl())));
            excelRow.createCell(16).setCellValue(numberValue(row.providerStatusCode()));
            excelRow.createCell(17).setCellValue(XlsxExportService.sanitize(stringValue(row.providerErrorCode())));
            excelRow.createCell(18).setCellValue(XlsxExportService.sanitize(stringValue(row.providerErrorMessage())));
            excelRow.createCell(19).setCellValue(XlsxExportService.sanitize(stringValue(row.channelName())));
            excelRow.createCell(20).setCellValue(XlsxExportService.sanitize(metadataValue(row.metadata())));
        }

        sheet.createFreezePane(0, 1);
        if (!rows.isEmpty()) {
            sheet.setAutoFilter(new CellRangeAddress(0, rows.size(), 0, HEADERS.length - 1));
        }

        int[] widths = {20, 12, 18, 22, 26, 28, 18, 32, 18, 20, 18, 16, 24, 12, 26, 26, 14, 18, 24, 20, 32};
        for (int i = 0; i < widths.length; i++) {
            sheet.setColumnWidth(i, widths[i] * 256);
        }
    }

    private void createCell(Sheet sheet, int rowIndex, int columnIndex, String value, CellStyle style) {
        Row row = sheet.getRow(rowIndex);
        if (row == null) {
            row = sheet.createRow(rowIndex);
        }
        row.createCell(columnIndex).setCellValue(value);
        row.getCell(columnIndex).setCellStyle(style);
    }

    private void writeKpi(Sheet sheet, int rowIndex, String label, long value, CellStyle labelStyle) {
        Row row = sheet.createRow(rowIndex);
        row.createCell(0).setCellValue(label);
        row.getCell(0).setCellStyle(labelStyle);
        row.createCell(1).setCellValue(value);
    }

    private Map<String, Object> buildFilterMeta(AccessLogQueryFilters filters) {
        Map<String, Object> meta = new LinkedHashMap<>();
        if (filters.actorType() != null && filters.actorType() != AccessLogActorType.ALL) {
            meta.put("actorType", filters.actorType().name());
        }
        if (filters.scope() != null && filters.scope() != AccessLogScope.ALL) {
            meta.put("scope", filters.scope().name());
        }
        if (StringUtils.hasText(filters.result())) {
            meta.put("result", filters.result().trim());
        }
        if (filters.dateFrom() != null) {
            meta.put("dateFrom", filters.dateFrom().toString());
        }
        if (filters.dateTo() != null) {
            meta.put("dateTo", filters.dateTo().toString());
        }
        if (filters.studentId() != null) {
            meta.put("studentId", filters.studentId().toString());
        }
        if (filters.adminId() != null) {
            meta.put("adminId", filters.adminId().toString());
        }
        if (filters.careerId() != null) {
            meta.put("careerId", filters.careerId().toString());
        }
        if (StringUtils.hasText(filters.search())) {
            meta.put("search", filters.search().trim());
        }
        meta.put("sort", StringUtils.hasText(filters.sort()) ? filters.sort() : "occurredAt,desc");
        return meta;
    }

    private String summarizeFilters(AccessLogQueryFilters filters) {
        Map<String, Object> meta = buildFilterMeta(filters);
        if (meta.isEmpty()) {
            return "Sin filtros";
        }
        return meta.entrySet().stream()
                .map(entry -> entry.getKey() + "=" + entry.getValue())
                .reduce((left, right) -> left + ", " + right)
                .orElse("Sin filtros");
    }

    private static String stringValue(String value) {
        return value == null ? "" : value;
    }

    private static String numberValue(Number value) {
        return value == null ? "" : String.valueOf(value);
    }

    private static String metadataValue(JsonNode value) {
        return value == null ? "" : value.toString();
    }

    private static String safeReason(String value) {
        return ReportService.truncateErrorDetail(value);
    }
}
