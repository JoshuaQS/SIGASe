package mx.edu.utez.server.modules.reports.service;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.io.OutputStream;
import java.util.ArrayList;
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
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.streaming.SXSSFSheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class UnifiedAccessLogExportService {

    private static final int DETAIL_HEADER_ROW = 3;

    private static final String[] HEADERS = {
            "Ocurrió en",
            "Actor",
            "Scope",
            "Actor ID",
            "Actor nombre",
            "Actor email",
            "Resultado",
            "Motivo",
            "Request ID",
            "Correlation ID",
            "Session ID",
            "IP enmascarada",
            "User Agent",
            "Latencia (ms)",
            "Next URL",
            "Redirect URL",
            "Provider status",
            "Provider error code",
            "Provider error message",
            "Canal",
            "Metadata"
    };

    private static final int[] COLUMN_WIDTHS = {
            22, 12, 16, 38, 28, 30, 14, 36, 22, 24, 22, 16, 28, 14, 26, 26, 14, 18, 24, 18, 36
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

        long successful = rows.stream().filter(log -> "SUCCESS".equalsIgnoreCase(log.result())).count();
        long failed = Math.max(0L, rows.size() - successful);
        double successRate = rows.isEmpty() ? 0.0 : (successful * 100.0) / rows.size();

        try (SXSSFWorkbook workbook = new SXSSFWorkbook(500)) {
            XlsxExportService.ReportStyles styles = XlsxExportService.createReportStyles(workbook);

            XSSFSheet summarySheet = workbook.getXSSFWorkbook().createSheet("Resumen");
            buildSummarySheet(summarySheet, styles, filterMeta, rows.size(), successful, failed, successRate);

            SXSSFSheet detailSheet = workbook.createSheet("Logs de acceso");
            buildDetailSheet(detailSheet, styles, rows);

            workbook.write(out);
        } catch (Exception ex) {
            reportExportAuditService.auditExport(actor, "ACCESS_LOGS", filterMeta, rows.size(), "xlsx", AuditOutcome.FAILURE, request);
            throw new RuntimeException(ex);
        }

        reportExportAuditService.auditExport(actor, "ACCESS_LOGS", filterMeta, rows.size(), "xlsx", AuditOutcome.SUCCESS, request);
    }

    private void buildSummarySheet(
            XSSFSheet sheet,
            XlsxExportService.ReportStyles styles,
            Map<String, Object> filterMeta,
            int total,
            long successful,
            long failed,
            double successRate
    ) {
        XlsxExportService.applyColumnWidths(sheet, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16);

        int row = 0;
        XlsxExportService.writeMergedRow(sheet, row++, 11, "Logs de Acceso", styles.titleStyle());
        XlsxExportService.writeMergedRow(sheet, row++, 11, "Reporte ejecutivo de actividad de accesos", styles.subtitleStyle());
        row++;

        XlsxExportService.writeMergedRow(sheet, row++, 11, "Contexto del reporte", styles.sectionHeaderStyle());

        String exportType = filterMeta.isEmpty() ? "General" : "Filtrada";
        row = XlsxExportService.writeContextRow(
                sheet,
                row,
                11,
                "Tipo de exportación",
                exportType,
                styles.labelStyle(),
                styles.valueStyle()
        );
        row = XlsxExportService.writeContextRow(
                sheet,
                row,
                11,
                "Fecha de generación",
                XlsxExportService.formatInstantNow() + " UTC",
                styles.labelStyle(),
                styles.valueStyle()
        );
        row = XlsxExportService.writeContextRow(
                sheet,
                row,
                11,
                "Registros exportados",
                String.valueOf(total),
                styles.labelStyle(),
                styles.valueStyle()
        );

        row++;
        XlsxExportService.writeMergedRow(sheet, row++, 11, "Filtros aplicados", styles.sectionHeaderStyle());
        for (String filter : summarizeFilters(filterMeta)) {
            Row filterRow = sheet.createRow(row);
            XlsxExportService.createTextCell(filterRow, 0, "• " + filter, styles.valueStyle());
            sheet.addMergedRegion(new CellRangeAddress(row, row, 0, 11));
            row++;
        }

        int kpiStart = Math.max(row + 1, 12);
        XlsxExportService.writeMergedRow(sheet, kpiStart - 1, 11, "KPIs principales", styles.sectionHeaderStyle());

        XlsxExportService.buildKpiCard(
                sheet,
                styles,
                kpiStart,
                0,
                2,
                "Registros totales",
                total,
                XlsxExportService.KpiVariant.PRIMARY
        );
        XlsxExportService.buildKpiCard(
                sheet,
                styles,
                kpiStart,
                3,
                5,
                "Exitosos",
                successful,
                XlsxExportService.KpiVariant.SUCCESS
        );
        XlsxExportService.buildKpiCard(
                sheet,
                styles,
                kpiStart,
                6,
                8,
                "Fallidos",
                failed,
                XlsxExportService.KpiVariant.DANGER
        );
        XlsxExportService.buildKpiCard(
                sheet,
                styles,
                kpiStart,
                9,
                11,
                "% Éxito",
                successRate,
                XlsxExportService.KpiVariant.INFO
        );
    }

    private void buildDetailSheet(
            SXSSFSheet sheet,
            XlsxExportService.ReportStyles styles,
            List<AccessLogResponse> rows
    ) {
        XlsxExportService.applyColumnWidths(sheet, COLUMN_WIDTHS);

        XlsxExportService.writeMergedRow(sheet, 0, HEADERS.length - 1, "Logs de acceso", styles.titleStyle());
        XlsxExportService.writeMergedRow(sheet, 1, HEADERS.length - 1, "Detalle completo del conjunto exportado", styles.subtitleStyle());

        Row headerRow = sheet.createRow(DETAIL_HEADER_ROW);
        for (int i = 0; i < HEADERS.length; i++) {
            XlsxExportService.createTextCell(headerRow, i, HEADERS[i], styles.tableHeaderStyle());
        }

        int rowIndex = DETAIL_HEADER_ROW + 1;
        for (AccessLogResponse log : rows) {
            Row row = sheet.createRow(rowIndex++);
            XlsxExportService.createTextCell(row, 0, CsvExportService.formatInstant(log.occurredAt()), styles.dateTimeStyle());
            XlsxExportService.createTextCell(row, 1, log.actorType(), styles.valueStyle());
            XlsxExportService.createTextCell(row, 2, log.scope(), styles.valueStyle());
            XlsxExportService.createTextCell(row, 3, log.actorId(), styles.valueStyle());
            XlsxExportService.createTextCell(row, 4, log.actorName(), styles.valueStyle());
            XlsxExportService.createTextCell(row, 5, log.actorEmail(), styles.valueStyle());
            XlsxExportService.createTextCell(row, 6, log.result(), styles.valueStyle());
            XlsxExportService.createTextCell(row, 7, safeReason(log.reason()), styles.valueStyle());
            XlsxExportService.createTextCell(row, 8, log.requestId(), styles.valueStyle());
            XlsxExportService.createTextCell(row, 9, log.correlationId(), styles.valueStyle());
            XlsxExportService.createTextCell(row, 10, log.sessionId(), styles.valueStyle());
            XlsxExportService.createTextCell(row, 11, log.ipAddressMasked(), styles.valueStyle());
            XlsxExportService.createTextCell(row, 12, log.userAgentSanitized(), styles.valueStyle());
            XlsxExportService.createNumericCell(row, 13, log.latencyMs(), styles.numberStyle());
            XlsxExportService.createTextCell(row, 14, log.nextUrl(), styles.valueStyle());
            XlsxExportService.createTextCell(row, 15, log.redirectUrl(), styles.valueStyle());
            XlsxExportService.createNumericCell(row, 16, log.providerStatusCode(), styles.numberStyle());
            XlsxExportService.createTextCell(row, 17, log.providerErrorCode(), styles.valueStyle());
            XlsxExportService.createTextCell(row, 18, log.providerErrorMessage(), styles.valueStyle());
            XlsxExportService.createTextCell(row, 19, log.channelName(), styles.valueStyle());
            XlsxExportService.createTextCell(row, 20, metadataValue(log.metadata()), styles.valueStyle());
        }

        sheet.createFreezePane(0, DETAIL_HEADER_ROW + 1);
        if (!rows.isEmpty()) {
            sheet.setAutoFilter(new CellRangeAddress(DETAIL_HEADER_ROW, rows.size() + DETAIL_HEADER_ROW, 0, HEADERS.length - 1));
        }
    }

    private Map<String, Object> buildFilterMeta(AccessLogQueryFilters filters) {
        Map<String, Object> meta = new LinkedHashMap<>();
        if (filters.actorType() != null && filters.actorType() != AccessLogActorType.ALL) {
            meta.put("actorType", filters.actorType().name());
        }
        if (filters.scope() != null && filters.scope() != AccessLogScope.ALL) {
            meta.put("scope", filters.scope().name());
        }
        if (StringUtils.hasText(filters.result()) && !"ALL".equalsIgnoreCase(filters.result().trim())) {
            meta.put("result", filters.result().trim());
        }
        if (filters.dateFrom() != null) {
            meta.put("dateFrom", filters.dateFrom());
        }
        if (filters.dateTo() != null) {
            meta.put("dateTo", filters.dateTo());
        }
        if (filters.studentId() != null) {
            meta.put("studentId", filters.studentId());
        }
        if (filters.adminId() != null) {
            meta.put("adminId", filters.adminId());
        }
        if (filters.careerId() != null) {
            meta.put("careerId", filters.careerId());
        }
        if (StringUtils.hasText(filters.search())) {
            meta.put("search", filters.search().trim());
        }
        if (StringUtils.hasText(filters.sort())) {
            meta.put("sort", filters.sort().trim());
        }
        return meta;
    }

    private List<String> summarizeFilters(Map<String, Object> filterMeta) {
        if (filterMeta.isEmpty()) {
            return List.of("Sin filtros adicionales");
        }

        List<String> filters = new ArrayList<>();
        for (Map.Entry<String, Object> entry : filterMeta.entrySet()) {
            filters.add(entry.getKey() + ": " + entry.getValue());
        }
        return filters;
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
