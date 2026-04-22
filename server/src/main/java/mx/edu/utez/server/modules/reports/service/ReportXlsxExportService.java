package mx.edu.utez.server.modules.reports.service;

import jakarta.servlet.http.HttpServletRequest;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.logs.audit.dto.AuditLogFilterRequest;
import mx.edu.utez.server.modules.logs.audit.entity.AuditLog;
import mx.edu.utez.server.modules.logs.audit.repository.AuditLogRepository;
import mx.edu.utez.server.modules.logs.audit.service.AuditLogQueryService;
import mx.edu.utez.server.modules.logs.audit.service.AuditTrailService;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.AuditSeverity;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.streaming.SXSSFSheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class ReportXlsxExportService {

    private static final int CHUNK_SIZE = 500;
    private static final int MAX_EXPORT_SIZE = 50_000;
    private static final int DETAIL_HEADER_ROW = 3;

    private static final String[] DETAIL_HEADERS = {
            "Ocurrió en",
            "Actor",
            "Actor email",
            "Acción",
            "Entidad",
            "Entity ID",
            "Resultado",
            "Severidad",
            "Módulo",
            "Request ID",
            "Correlation ID",
            "Descripción",
            "Target label",
            "IP enmascarada",
            "User Agent"
    };

    private static final int[] DETAIL_COLUMN_WIDTHS = {
            22, 12, 30, 24, 18, 38, 12, 12, 16, 22, 24, 40, 28, 18, 30
    };

    private final AuditLogRepository auditLogRepository;
    private final AuditLogQueryService auditLogQueryService;
    private final AuditTrailService auditTrailService;

    public ReportXlsxExportService(
            AuditLogRepository auditLogRepository,
            AuditLogQueryService auditLogQueryService,
            AuditTrailService auditTrailService
    ) {
        this.auditLogRepository = auditLogRepository;
        this.auditLogQueryService = auditLogQueryService;
        this.auditTrailService = auditTrailService;
    }

    @Transactional(readOnly = true)
    public void exportAuditLogs(
            OutputStream out,
            AuditLogFilterRequest filters,
            Admin actor,
            HttpServletRequest request
    ) {
        AuditLogFilterRequest exportFilters = filters.withoutPagination();
        auditLogQueryService.validateForExport(exportFilters);

        Specification<AuditLog> baseSpec = auditLogQueryService.buildSpecification(exportFilters);
        Sort sort = auditLogQueryService.buildSort(exportFilters);

        long total = auditLogRepository.count(baseSpec);
        if (total > MAX_EXPORT_SIZE) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "El resultado excede el límite de " + MAX_EXPORT_SIZE + " registros. Aplique filtros más específicos."
            );
        }

        long success = countByOutcome(baseSpec, AuditOutcome.SUCCESS);
        long failure = countByOutcome(baseSpec, AuditOutcome.FAILURE);
        long critical = countBySeverity(baseSpec, AuditSeverity.CRITICAL);

        Map<String, Object> filterMeta = buildFilterMeta(exportFilters);

        try (SXSSFWorkbook workbook = new SXSSFWorkbook(CHUNK_SIZE)) {
            XlsxExportService.ReportStyles styles = XlsxExportService.createReportStyles(workbook);

            XSSFSheet summarySheet = workbook.getXSSFWorkbook().createSheet("Resumen");
            buildSummarySheet(summarySheet, styles, filterMeta, total, success, failure, critical);

            SXSSFSheet detailSheet = workbook.createSheet("Logs de auditoría");
            buildDetailSheet(detailSheet, styles, baseSpec, sort);

            workbook.write(out);
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            auditExport(actor, "AUDIT_LOGS", filterMeta, 0, AuditOutcome.FAILURE, request);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "Error generando XLSX de audit logs.");
        }

        auditExport(actor, "AUDIT_LOGS", filterMeta, total, AuditOutcome.SUCCESS, request);
    }

    private long countByOutcome(Specification<AuditLog> baseSpec, AuditOutcome outcome) {
        Specification<AuditLog> outcomeSpec = Specification.where(baseSpec)
                .and((root, query, cb) -> cb.equal(root.get("outcome"), outcome));
        return auditLogRepository.count(outcomeSpec);
    }

    private long countBySeverity(Specification<AuditLog> baseSpec, AuditSeverity severity) {
        Specification<AuditLog> severitySpec = Specification.where(baseSpec)
                .and((root, query, cb) -> cb.equal(root.get("severity"), severity));
        return auditLogRepository.count(severitySpec);
    }

    private void buildSummarySheet(
            XSSFSheet sheet,
            XlsxExportService.ReportStyles styles,
            Map<String, Object> filterMeta,
            long total,
            long success,
            long failure,
            long critical
    ) {
        XlsxExportService.applyColumnWidths(sheet, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16);

        int row = 0;
        XlsxExportService.writeMergedRow(sheet, row++, 11, "Logs de Auditoría", styles.titleStyle());
        XlsxExportService.writeMergedRow(sheet, row++, 11, "Reporte ejecutivo de eventos auditables", styles.subtitleStyle());
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
                "Éxito",
                success,
                XlsxExportService.KpiVariant.SUCCESS
        );
        XlsxExportService.buildKpiCard(
                sheet,
                styles,
                kpiStart,
                6,
                8,
                "Fallo",
                failure,
                XlsxExportService.KpiVariant.DANGER
        );
        XlsxExportService.buildKpiCard(
                sheet,
                styles,
                kpiStart,
                9,
                11,
                "Críticos",
                critical,
                XlsxExportService.KpiVariant.INFO
        );
    }

    private void buildDetailSheet(
            SXSSFSheet sheet,
            XlsxExportService.ReportStyles styles,
            Specification<AuditLog> spec,
            Sort sort
    ) {
        XlsxExportService.applyColumnWidths(sheet, DETAIL_COLUMN_WIDTHS);

        XlsxExportService.writeMergedRow(sheet, 0, DETAIL_HEADERS.length - 1, "Logs de auditoría", styles.titleStyle());
        XlsxExportService.writeMergedRow(sheet, 1, DETAIL_HEADERS.length - 1, "Detalle completo del conjunto exportado", styles.subtitleStyle());

        Row headerRow = sheet.createRow(DETAIL_HEADER_ROW);
        for (int i = 0; i < DETAIL_HEADERS.length; i++) {
            XlsxExportService.createTextCell(headerRow, i, DETAIL_HEADERS[i], styles.tableHeaderStyle());
        }

        int rowIndex = DETAIL_HEADER_ROW + 1;
        int page = 0;
        while (true) {
            PageRequest pageRequest = PageRequest.of(page, CHUNK_SIZE, sort);
            Page<AuditLog> result = auditLogRepository.findAll(spec, pageRequest);
            if (result.isEmpty()) {
                break;
            }

            for (AuditLog log : result.getContent()) {
                Row row = sheet.createRow(rowIndex++);
                XlsxExportService.createTextCell(row, 0, CsvExportService.formatInstant(log.getOccurredAt()), styles.dateTimeStyle());
                XlsxExportService.createTextCell(row, 1, log.getActorType() == null ? "" : log.getActorType().name(), styles.valueStyle());
                XlsxExportService.createTextCell(
                        row,
                        2,
                        log.getActorAdmin() == null ? "" : log.getActorAdmin().getEmail(),
                        styles.valueStyle()
                );
                XlsxExportService.createTextCell(row, 3, log.getAction(), styles.valueStyle());
                XlsxExportService.createTextCell(row, 4, log.getEntityType(), styles.valueStyle());
                XlsxExportService.createTextCell(row, 5, log.getEntityId(), styles.valueStyle());
                XlsxExportService.createTextCell(
                        row,
                        6,
                        log.getOutcome() == null ? "" : log.getOutcome().name(),
                        styles.valueStyle()
                );
                XlsxExportService.createTextCell(
                        row,
                        7,
                        log.getSeverity() == null ? "" : log.getSeverity().name(),
                        styles.valueStyle()
                );
                XlsxExportService.createTextCell(
                        row,
                        8,
                        log.getSourceModule() == null ? "" : log.getSourceModule().name(),
                        styles.valueStyle()
                );
                XlsxExportService.createTextCell(row, 9, log.getRequestId(), styles.valueStyle());
                XlsxExportService.createTextCell(row, 10, log.getCorrelationId(), styles.valueStyle());
                XlsxExportService.createTextCell(row, 11, log.getDescription(), styles.valueStyle());
                XlsxExportService.createTextCell(row, 12, log.getTargetLabel(), styles.valueStyle());
                XlsxExportService.createTextCell(row, 13, log.getIpAddressMasked(), styles.valueStyle());
                XlsxExportService.createTextCell(row, 14, log.getUserAgentSanitized(), styles.valueStyle());
            }

            page++;
        }

        sheet.createFreezePane(0, DETAIL_HEADER_ROW + 1);
        if (rowIndex > DETAIL_HEADER_ROW + 1) {
            sheet.setAutoFilter(new CellRangeAddress(DETAIL_HEADER_ROW, rowIndex - 1, 0, DETAIL_HEADERS.length - 1));
        }
    }

    private Map<String, Object> buildFilterMeta(AuditLogFilterRequest filters) {
        Map<String, Object> meta = new LinkedHashMap<>();
        if (filters.dateFrom() != null) {
            meta.put("dateFrom", filters.dateFrom());
        }
        if (filters.dateTo() != null) {
            meta.put("dateTo", filters.dateTo());
        }
        if (filters.actorType() != null) {
            meta.put("actorType", filters.actorType().name());
        }
        if (StringUtils.hasText(filters.actorEmail())) {
            meta.put("actorEmail", filters.actorEmail().trim());
        }
        if (StringUtils.hasText(filters.action())) {
            meta.put("action", filters.action().trim());
        }
        if (StringUtils.hasText(filters.entityType())) {
            meta.put("entityType", filters.entityType().trim());
        }
        if (filters.resolvedOutcome() != null) {
            meta.put("outcome", filters.resolvedOutcome().name());
        }
        if (StringUtils.hasText(filters.requestId())) {
            meta.put("requestId", filters.requestId().trim());
        }
        if (StringUtils.hasText(filters.correlationId())) {
            meta.put("correlationId", filters.correlationId().trim());
        }
        if (filters.severity() != null) {
            meta.put("severity", filters.severity().name());
        }
        if (StringUtils.hasText(filters.search())) {
            meta.put("search", filters.search().trim());
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

    private void auditExport(
            Admin actor,
            String type,
            Map<String, Object> filterMeta,
            long count,
            AuditOutcome outcome,
            HttpServletRequest request
    ) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("reportType", type);
        metadata.put("format", "xlsx");
        metadata.put("rowCount", count);
        metadata.putAll(filterMeta);
        auditTrailService.auditAdminAction(actor, "REPORT_EXPORT", "REPORT", type, outcome, metadata, request);
    }
}
