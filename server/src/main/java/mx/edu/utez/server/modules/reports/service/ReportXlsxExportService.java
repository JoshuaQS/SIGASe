package mx.edu.utez.server.modules.reports.service;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.elibro.entity.ElibroAccessLog;
import mx.edu.utez.server.modules.elibro.repository.ElibroAccessLogRepository;
import mx.edu.utez.server.modules.logs.audit.entity.AuditLog;
import mx.edu.utez.server.modules.logs.audit.repository.AuditLogRepository;
import mx.edu.utez.server.modules.logs.audit.service.AuditTrailService;
import mx.edu.utez.server.shared.enums.AuditActorType;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.AuditSeverity;
import mx.edu.utez.server.shared.enums.ElibroAccessResult;
import mx.edu.utez.server.shared.enums.StudentStatus;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.streaming.SXSSFSheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.OutputStream;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class ReportXlsxExportService {

    private static final int CHUNK_SIZE = 500;

    private final ElibroAccessLogRepository accessLogRepository;
    private final AuditLogRepository auditLogRepository;
    private final ReportService reportService;
    private final ReportDataCollector reportDataCollector;
    private final AuditTrailService auditTrailService;

    public ReportXlsxExportService(
            ElibroAccessLogRepository accessLogRepository,
            AuditLogRepository auditLogRepository,
            ReportService reportService,
            ReportDataCollector reportDataCollector,
            AuditTrailService auditTrailService
    ) {
        this.accessLogRepository = accessLogRepository;
        this.auditLogRepository = auditLogRepository;
        this.reportService = reportService;
        this.reportDataCollector = reportDataCollector;
        this.auditTrailService = auditTrailService;
    }

    // ── Access Logs XLSX ────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public void exportAccessLogs(
            OutputStream out,
            Instant dateFrom, Instant dateTo, ElibroAccessResult result,
            String normalizedEmail, String attemptedEmail, UUID studentId,
            String ipAddress, String channelName,
            Admin actor, HttpServletRequest request
    ) {
        Specification<ElibroAccessLog> spec = reportService.buildAccessLogSpec(
                dateFrom, dateTo, result, normalizedEmail, attemptedEmail, studentId, ipAddress, channelName
        );
        long total = accessLogRepository.count(spec);
        if (total > 50_000) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "El resultado excede el límite de 50000 registros.");
        }

        // Determine career/status from filters for data collector (null if not filtered)
        UUID careerIdFilter = null; // Access log export doesn't filter by career directly
        String careerCodeFilter = null;
        StudentStatus statusFilter = null;

        ReportDataCollector.ReportData data = reportDataCollector.collect(
                dateFrom, dateTo, result, careerIdFilter, careerCodeFilter, statusFilter
        );

        try (SXSSFWorkbook wb = new SXSSFWorkbook(CHUNK_SIZE)) {
            XSSFWorkbook xssfWb = wb.getXSSFWorkbook();

            // Sheet 1: Summary (via underlying XSSF for chart support)
            XSSFSheet summarySheet = xssfWb.createSheet("Resumen");
            writeSummarySheet(summarySheet, xssfWb, data, dateFrom, dateTo);

            // Sheet 3: Support data (hidden, created before detail for SXSSF ordering)
            boolean hasSupportData = data.showPieChart() || data.showTrendChart()
                    || data.showTopStudentsChart() || data.showTopCareersChart()
                    || data.showErrorBreakdownChart();
            if (hasSupportData) {
                XSSFSheet supportSheet = xssfWb.createSheet("Datos de soporte");
                writeSupportSheet(supportSheet, data);
                xssfWb.setSheetHidden(xssfWb.getSheetIndex(supportSheet), true);
            }

            // Sheet 2: Detail (SXSSF streaming)
            SXSSFSheet detailSheet = wb.createSheet("Detalle");
            writeAccessLogDetail(detailSheet, wb, spec);

            wb.write(out);
            wb.dispose();
        } catch (BusinessException e) {
            throw e;
        } catch (Exception ex) {
            auditExport(actor, "ACCESS_LOGS", total, AuditOutcome.FAILURE, request);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "Error generando XLSX de access logs.");
        }

        auditExport(actor, "ACCESS_LOGS", total, AuditOutcome.SUCCESS, request);
    }

    private void writeSummarySheet(XSSFSheet sheet, XSSFWorkbook wb,
                                   ReportDataCollector.ReportData data,
                                   Instant dateFrom, Instant dateTo) {
        CellStyle titleStyle = XlsxExportService.createTitleStyle(wb);
        CellStyle subtitleStyle = XlsxExportService.createSubtitleStyle(wb);
        CellStyle kpiLabel = XlsxExportService.createKpiLabelStyle(wb);

        int r = 0;
        createCell(sheet, r++, 0, data.title(), titleStyle);
        createCell(sheet, r++, 0, "Período: " + XlsxExportService.formatInstantDisplay(dateFrom)
                + " a " + XlsxExportService.formatInstantDisplay(dateTo), subtitleStyle);
        String filterText = data.appliedFilters().entrySet().stream()
                .filter(e -> !"dateFrom".equals(e.getKey()) && !"dateTo".equals(e.getKey()))
                .map(e -> e.getKey() + "=" + e.getValue())
                .reduce((a, b) -> a + ", " + b)
                .orElse("Sin filtros adicionales");
        createCell(sheet, r++, 0, "Filtros: " + filterText, subtitleStyle);
        createCell(sheet, r++, 0, "Generado: " + XlsxExportService.formatInstantNow() + " UTC", subtitleStyle);
        r++; // blank row

        // KPIs
        writeKpi(sheet, r++, "Total de accesos", data.totalAccesses(), kpiLabel);
        writeKpi(sheet, r++, "Accesos exitosos", data.successfulAccesses(), kpiLabel);
        writeKpi(sheet, r++, "Accesos fallidos", data.failedAccesses(), kpiLabel);
        writeKpiPercent(sheet, r++, "Tasa de éxito (%)", data.successRate(), kpiLabel);
        writeKpi(sheet, r++, "Estudiantes únicos con éxito", data.uniqueStudentsWithSuccess(), kpiLabel);

        sheet.setColumnWidth(0, 35 * 256);
        sheet.setColumnWidth(1, 20 * 256);
    }

    private void writeSupportSheet(XSSFSheet sheet, ReportDataCollector.ReportData data) {
        int r = 0;

        // Trend data
        Row trendHeader = sheet.createRow(r++);
        trendHeader.createCell(0).setCellValue("Día");
        trendHeader.createCell(1).setCellValue("Exitosos");
        trendHeader.createCell(2).setCellValue("Fallidos");
        for (var tp : data.trendPoints()) {
            Row row = sheet.createRow(r++);
            row.createCell(0).setCellValue(tp.day());
            row.createCell(1).setCellValue(tp.successful());
            row.createCell(2).setCellValue(tp.failed());
        }
        r++; // separator

        // Top students
        Row tsHeader = sheet.createRow(r++);
        tsHeader.createCell(0).setCellValue("Matrícula");
        tsHeader.createCell(1).setCellValue("Nombre");
        tsHeader.createCell(2).setCellValue("Carrera");
        tsHeader.createCell(3).setCellValue("Accesos");
        for (var ts : data.topStudents()) {
            Row row = sheet.createRow(r++);
            row.createCell(0).setCellValue(ts.enrollmentId());
            row.createCell(1).setCellValue(ts.name());
            row.createCell(2).setCellValue(ts.career());
            row.createCell(3).setCellValue(ts.accesses());
        }
        r++;

        // Top careers
        Row tcHeader = sheet.createRow(r++);
        tcHeader.createCell(0).setCellValue("Carrera");
        tcHeader.createCell(1).setCellValue("Accesos");
        for (var tc : data.topCareers()) {
            Row row = sheet.createRow(r++);
            row.createCell(0).setCellValue(tc.career());
            row.createCell(1).setCellValue(tc.total());
        }
        r++;

        // Error breakdown
        Row ebHeader = sheet.createRow(r++);
        ebHeader.createCell(0).setCellValue("Tipo de Error");
        ebHeader.createCell(1).setCellValue("Cantidad");
        for (var eb : data.errorBreakdown()) {
            Row row = sheet.createRow(r++);
            row.createCell(0).setCellValue(eb.errorType());
            row.createCell(1).setCellValue(eb.total());
        }
    }

    private void writeAccessLogDetail(SXSSFSheet sheet, SXSSFWorkbook wb,
                                      Specification<ElibroAccessLog> spec) {
        CellStyle headerStyle = XlsxExportService.createHeaderStyle(wb);
        String[] headers = ReportService.ACCESS_LOG_HEADERS;

        Row headerRow = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            headerRow.createCell(i).setCellValue(headers[i]);
            headerRow.getCell(i).setCellStyle(headerStyle);
        }

        int rowIdx = 1;
        int page = 0;
        while (true) {
            PageRequest pr = PageRequest.of(page, CHUNK_SIZE, Sort.by(Sort.Direction.DESC, "occurredAt"));
            Page<ElibroAccessLog> result = accessLogRepository.findAll(spec, pr);
            if (result.isEmpty()) break;
            for (ElibroAccessLog a : result.getContent()) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(CsvExportService.formatInstant(a.getOccurredAt()));
                row.createCell(1).setCellValue(XlsxExportService.sanitize(nullSafe(a.getAttemptedEmail())));
                row.createCell(2).setCellValue(XlsxExportService.sanitize(nullSafe(a.getNormalizedEmail())));
                row.createCell(3).setCellValue(a.getResult() != null ? a.getResult().name() : "");
                row.createCell(4).setCellValue(nullSafe(a.getErrorCode()));
                row.createCell(5).setCellValue(ReportService.truncateErrorDetail(a.getErrorDetail()));
                row.createCell(6).setCellValue(a.getLatencyMs() != null ? a.getLatencyMs() : 0);
                row.createCell(7).setCellValue(XlsxExportService.sanitize(nullSafe(a.getIpAddressMasked())));
                row.createCell(8).setCellValue(nullSafe(a.getIpAddressHash()));
                row.createCell(9).setCellValue(nullSafe(a.getUserAgentSanitized()));
                row.createCell(10).setCellValue(nullSafe(a.getNextUrl()));
                row.createCell(11).setCellValue(nullSafe(a.getRedirectUrl()));
                row.createCell(12).setCellValue(nullSafe(a.getRequestId()));
                row.createCell(13).setCellValue(nullSafe(a.getChannelNameSnapshot()));
            }
            page++;
        }

        sheet.createFreezePane(0, 1);
        if (rowIdx > 1) {
            sheet.setAutoFilter(new CellRangeAddress(0, rowIdx - 1, 0, headers.length - 1));
        }

        int[] widths = {20, 25, 25, 28, 15, 20, 10, 15, 22, 24, 25, 25, 20, 18};
        for (int i = 0; i < widths.length && i < headers.length; i++) {
            sheet.setColumnWidth(i, widths[i] * 256);
        }
    }

    // ── Audit Logs XLSX ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public void exportAuditLogs(
            OutputStream out,
            Instant dateFrom, Instant dateTo,
            AuditActorType actorType, String actorEmail,
            String action, String entityType,
            AuditOutcome outcome, AuditSeverity severity,
            Admin actor, HttpServletRequest request
    ) {
        Specification<AuditLog> spec = reportService.buildAuditLogSpec(
                dateFrom, dateTo, actorType, actorEmail, action, entityType, outcome, severity
        );
        long total = auditLogRepository.count(spec);
        if (total > 50_000) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "El resultado excede el límite de 50000 registros.");
        }

        try (SXSSFWorkbook wb = new SXSSFWorkbook(CHUNK_SIZE)) {
            XSSFWorkbook xssfWb = wb.getXSSFWorkbook();

            // Sheet 1: Summary (XSSF for simple metadata)
            XSSFSheet summarySheet = xssfWb.createSheet("Resumen");
            writeAuditSummary(summarySheet, xssfWb, dateFrom, dateTo, total);

            // Sheet 2: Detail (SXSSF streaming)
            SXSSFSheet detailSheet = wb.createSheet("Detalle");
            writeAuditLogDetail(detailSheet, wb, spec);

            wb.write(out);
            wb.dispose();
        } catch (BusinessException e) {
            throw e;
        } catch (Exception ex) {
            auditExport(actor, "AUDIT_LOGS", total, AuditOutcome.FAILURE, request);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "Error generando XLSX de audit logs.");
        }

        auditExport(actor, "AUDIT_LOGS", total, AuditOutcome.SUCCESS, request);
    }

    private void writeAuditSummary(XSSFSheet sheet, XSSFWorkbook wb,
                                   Instant dateFrom, Instant dateTo, long total) {
        CellStyle titleStyle = XlsxExportService.createTitleStyle(wb);
        CellStyle subtitleStyle = XlsxExportService.createSubtitleStyle(wb);
        CellStyle kpiLabel = XlsxExportService.createKpiLabelStyle(wb);

        int r = 0;
        createCell(sheet, r++, 0, "Reporte de Audit Logs — SIGASe", titleStyle);
        createCell(sheet, r++, 0, "Período: " + XlsxExportService.formatInstantDisplay(dateFrom)
                + " a " + XlsxExportService.formatInstantDisplay(dateTo), subtitleStyle);
        createCell(sheet, r++, 0, "Generado: " + XlsxExportService.formatInstantNow() + " UTC", subtitleStyle);
        r++;
        writeKpi(sheet, r++, "Total de registros", total, kpiLabel);

        sheet.setColumnWidth(0, 35 * 256);
        sheet.setColumnWidth(1, 20 * 256);
    }

    private void writeAuditLogDetail(SXSSFSheet sheet, SXSSFWorkbook wb,
                                     Specification<AuditLog> spec) {
        CellStyle headerStyle = XlsxExportService.createHeaderStyle(wb);
        String[] headers = ReportService.AUDIT_LOG_HEADERS;

        Row headerRow = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            headerRow.createCell(i).setCellValue(headers[i]);
            headerRow.getCell(i).setCellStyle(headerStyle);
        }

        int rowIdx = 1;
        int page = 0;
        while (true) {
            PageRequest pr = PageRequest.of(page, CHUNK_SIZE, Sort.by(Sort.Direction.DESC, "occurredAt"));
            Page<AuditLog> result = auditLogRepository.findAll(spec, pr);
            if (result.isEmpty()) break;
            for (AuditLog a : result.getContent()) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(CsvExportService.formatInstant(a.getOccurredAt()));
                row.createCell(1).setCellValue(a.getActorType() != null ? a.getActorType().name() : "");
                row.createCell(2).setCellValue(a.getActorAdmin() != null ? a.getActorAdmin().getEmail() : "");
                row.createCell(3).setCellValue(nullSafe(a.getAction()));
                row.createCell(4).setCellValue(nullSafe(a.getEntityType()));
                row.createCell(5).setCellValue(nullSafe(a.getEntityId()));
                row.createCell(6).setCellValue(a.getOutcome() != null ? a.getOutcome().name() : "");
                row.createCell(7).setCellValue(a.getSeverity() != null ? a.getSeverity().name() : "");
                row.createCell(8).setCellValue(XlsxExportService.sanitize(nullSafe(a.getIpAddressMasked())));
                row.createCell(9).setCellValue(nullSafe(a.getIpAddressHash()));
                row.createCell(10).setCellValue(nullSafe(a.getUserAgentSanitized()));
                row.createCell(11).setCellValue(nullSafe(a.getRequestId()));
            }
            page++;
        }

        sheet.createFreezePane(0, 1);
        if (rowIdx > 1) {
            sheet.setAutoFilter(new CellRangeAddress(0, rowIdx - 1, 0, headers.length - 1));
        }

        int[] widths = {20, 12, 25, 25, 15, 20, 10, 10, 15, 20, 22, 20};
        for (int i = 0; i < widths.length && i < headers.length; i++) {
            sheet.setColumnWidth(i, widths[i] * 256);
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────────

    private void createCell(Sheet sheet, int rowIdx, int colIdx, String value, CellStyle style) {
        Row row = sheet.getRow(rowIdx);
        if (row == null) row = sheet.createRow(rowIdx);
        row.createCell(colIdx).setCellValue(value);
        row.getCell(colIdx).setCellStyle(style);
    }

    private void writeKpi(Sheet sheet, int rowIdx, String label, long value, CellStyle labelStyle) {
        Row row = sheet.createRow(rowIdx);
        row.createCell(0).setCellValue(label);
        row.getCell(0).setCellStyle(labelStyle);
        row.createCell(1).setCellValue(value);
    }

    private void writeKpiPercent(Sheet sheet, int rowIdx, String label, double value, CellStyle labelStyle) {
        Row row = sheet.createRow(rowIdx);
        row.createCell(0).setCellValue(label);
        row.getCell(0).setCellStyle(labelStyle);
        row.createCell(1).setCellValue(value);
    }

    private String nullSafe(String val) {
        return val != null ? val : "";
    }

    private void auditExport(Admin actor, String type, long count,
                             AuditOutcome outcome, HttpServletRequest request) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("reportType", type);
        metadata.put("format", "xlsx");
        metadata.put("rowCount", count);
        auditTrailService.auditAdminAction(actor, "REPORT_EXPORT", "REPORT", type, outcome, metadata, request);
    }
}
