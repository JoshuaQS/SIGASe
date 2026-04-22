package mx.edu.utez.server.modules.reports.service;

import jakarta.servlet.http.HttpServletRequest;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.logs.audit.service.AuditTrailService;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.Sex;
import mx.edu.utez.server.shared.enums.StudentStatus;
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
public class StudentXlsxExportService {

    private static final int CHUNK_SIZE = 500;
    private static final int DETAIL_HEADER_ROW = 3;

    private static final String[] DETAIL_HEADERS = {
            "Matrícula", "Nombre", "Apellido Paterno", "Apellido Materno",
            "Correo Institucional", "Carrera", "Cuatrimestre", "Sexo", "Estado",
            "Último Acceso", "Fecha Registro"
    };

    private static final int[] DETAIL_COLUMN_WIDTHS = {
            14, 24, 20, 20, 30, 28, 14, 12, 12, 22, 22
    };

    private final StudentRepository studentRepository;
    private final ReportService reportService;
    private final AuditTrailService auditTrailService;

    public StudentXlsxExportService(
            StudentRepository studentRepository,
            ReportService reportService,
            AuditTrailService auditTrailService
    ) {
        this.studentRepository = studentRepository;
        this.reportService = reportService;
        this.auditTrailService = auditTrailService;
    }

    @Transactional(readOnly = true)
    public void export(
            OutputStream out,
            String q,
            String enrollmentId,
            String lastNamePaternal,
            String lastNameMaternal,
            UUID careerId,
            String careerCode,
            Sex sex,
            Integer quarter,
            StudentStatus status,
            Admin actor,
            HttpServletRequest request
    ) {
        Specification<Student> spec = reportService.buildStudentSpec(
                q,
                enrollmentId,
                lastNamePaternal,
                lastNameMaternal,
                careerId,
                careerCode,
                sex,
                quarter,
                status
        );

        long total = studentRepository.count(spec);
        long active = countByStatus(spec, StudentStatus.ACTIVE);
        long inactive = countByStatus(spec, StudentStatus.INACTIVE);
        long pending = countByStatus(spec, StudentStatus.PENDING);

        Map<String, Object> filterMeta = buildFilterMeta(
                q,
                enrollmentId,
                lastNamePaternal,
                lastNameMaternal,
                careerId,
                careerCode,
                sex,
                quarter,
                status
        );

        try (SXSSFWorkbook workbook = new SXSSFWorkbook(CHUNK_SIZE)) {
            XlsxExportService.ReportStyles styles = XlsxExportService.createReportStyles(workbook);

            XSSFSheet summarySheet = workbook.getXSSFWorkbook().createSheet("Resumen");
            buildSummarySheet(summarySheet, styles, filterMeta, total, active, inactive, pending);

            SXSSFSheet detailSheet = workbook.createSheet("Alumnos");
            buildDetailSheet(detailSheet, styles, spec);

            workbook.write(out);
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            Map<String, Object> meta = new LinkedHashMap<>(filterMeta);
            meta.put("format", "xlsx");
            auditExport(actor, "STUDENTS", meta, 0, AuditOutcome.FAILURE, request);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "Error generando XLSX de estudiantes.");
        }

        Map<String, Object> meta = new LinkedHashMap<>(filterMeta);
        meta.put("format", "xlsx");
        meta.put("rowCount", total);
        auditExport(actor, "STUDENTS", meta, total, AuditOutcome.SUCCESS, request);
    }

    private long countByStatus(Specification<Student> baseSpec, StudentStatus status) {
        Specification<Student> withStatus = Specification.where(baseSpec)
                .and((root, query, cb) -> cb.equal(root.get("status"), status));
        return studentRepository.count(withStatus);
    }

    private void buildSummarySheet(
            XSSFSheet sheet,
            XlsxExportService.ReportStyles styles,
            Map<String, Object> filterMeta,
            long total,
            long active,
            long inactive,
            long pending
    ) {
        XlsxExportService.applyColumnWidths(sheet, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16);

        int row = 0;
        XlsxExportService.writeMergedRow(sheet, row++, 11, "Alumnos", styles.titleStyle());
        XlsxExportService.writeMergedRow(sheet, row++, 11, "Reporte ejecutivo de gestión estudiantil", styles.subtitleStyle());
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
        List<String> filters = summarizeFilters(filterMeta);
        for (String filter : filters) {
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
                "Alumnos totales",
                total,
                XlsxExportService.KpiVariant.PRIMARY
        );
        XlsxExportService.buildKpiCard(
                sheet,
                styles,
                kpiStart,
                3,
                5,
                "Activos",
                active,
                XlsxExportService.KpiVariant.SUCCESS
        );
        XlsxExportService.buildKpiCard(
                sheet,
                styles,
                kpiStart,
                6,
                8,
                "Inactivos",
                inactive,
                XlsxExportService.KpiVariant.DANGER
        );
        XlsxExportService.buildKpiCard(
                sheet,
                styles,
                kpiStart,
                9,
                11,
                "Pendientes",
                pending,
                XlsxExportService.KpiVariant.INFO
        );
    }

    private void buildDetailSheet(
            SXSSFSheet sheet,
            XlsxExportService.ReportStyles styles,
            Specification<Student> spec
    ) {
        XlsxExportService.applyColumnWidths(sheet, DETAIL_COLUMN_WIDTHS);

        XlsxExportService.writeMergedRow(sheet, 0, DETAIL_HEADERS.length - 1, "Alumnos", styles.titleStyle());
        XlsxExportService.writeMergedRow(sheet, 1, DETAIL_HEADERS.length - 1, "Datos completos del conjunto exportado", styles.subtitleStyle());

        Row headerRow = sheet.createRow(DETAIL_HEADER_ROW);
        for (int i = 0; i < DETAIL_HEADERS.length; i++) {
            XlsxExportService.createTextCell(headerRow, i, DETAIL_HEADERS[i], styles.tableHeaderStyle());
        }

        int rowIndex = DETAIL_HEADER_ROW + 1;
        int page = 0;
        while (true) {
            PageRequest pageRequest = PageRequest.of(page, CHUNK_SIZE, Sort.by(Sort.Direction.ASC, "enrollmentId"));
            Page<Student> result = studentRepository.findAll(spec, pageRequest);
            if (result.isEmpty()) {
                break;
            }

            for (Student student : result.getContent()) {
                Row row = sheet.createRow(rowIndex++);
                XlsxExportService.createTextCell(row, 0, student.getEnrollmentId(), styles.valueStyle());
                XlsxExportService.createTextCell(row, 1, student.getName(), styles.valueStyle());
                XlsxExportService.createTextCell(row, 2, student.getLastNamePaternal(), styles.valueStyle());
                XlsxExportService.createTextCell(row, 3, student.getLastNameMaternal(), styles.valueStyle());
                XlsxExportService.createTextCell(row, 4, student.getInstitutionalEmail(), styles.valueStyle());
                XlsxExportService.createTextCell(
                        row,
                        5,
                        student.getCareer() == null ? "" : student.getCareer().getName(),
                        styles.valueStyle()
                );
                XlsxExportService.createNumericCell(row, 6, student.getQuarter(), styles.numberStyle());
                XlsxExportService.createTextCell(
                        row,
                        7,
                        student.getSex() == null ? "" : student.getSex().name(),
                        styles.valueStyle()
                );

                String status = student.getStatus() == null ? "" : student.getStatus().name();
                XlsxExportService.createTextCell(row, 8, status, styles.valueStyle());
                if (student.getStatus() == StudentStatus.ACTIVE) {
                    row.getCell(8).setCellStyle(styles.activeStatusStyle());
                } else if (student.getStatus() == StudentStatus.INACTIVE) {
                    row.getCell(8).setCellStyle(styles.inactiveStatusStyle());
                }

                XlsxExportService.createTextCell(
                        row,
                        9,
                        XlsxExportService.formatInstantDisplay(student.getLastLoginAt()),
                        styles.dateTimeStyle()
                );
                XlsxExportService.createTextCell(
                        row,
                        10,
                        XlsxExportService.formatInstantDisplay(student.getCreatedAt()),
                        styles.dateTimeStyle()
                );
            }
            page++;
        }

        sheet.createFreezePane(0, DETAIL_HEADER_ROW + 1);
        if (rowIndex > DETAIL_HEADER_ROW + 1) {
            sheet.setAutoFilter(new CellRangeAddress(DETAIL_HEADER_ROW, rowIndex - 1, 0, DETAIL_HEADERS.length - 1));
        }
    }

    private List<String> summarizeFilters(Map<String, Object> filterMeta) {
        if (filterMeta.isEmpty()) {
            return List.of("Sin filtros adicionales");
        }

        List<String> out = new ArrayList<>();
        for (Map.Entry<String, Object> entry : filterMeta.entrySet()) {
            out.add(entry.getKey() + ": " + entry.getValue());
        }
        return out;
    }

    private Map<String, Object> buildFilterMeta(
            String q,
            String enrollmentId,
            String lastNamePaternal,
            String lastNameMaternal,
            UUID careerId,
            String careerCode,
            Sex sex,
            Integer quarter,
            StudentStatus status
    ) {
        Map<String, Object> filters = new LinkedHashMap<>();
        if (StringUtils.hasText(q)) {
            filters.put("q", q.trim());
        }
        if (StringUtils.hasText(enrollmentId)) {
            filters.put("enrollmentId", enrollmentId.trim());
        }
        if (StringUtils.hasText(lastNamePaternal)) {
            filters.put("lastNamePaternal", lastNamePaternal.trim());
        }
        if (StringUtils.hasText(lastNameMaternal)) {
            filters.put("lastNameMaternal", lastNameMaternal.trim());
        }
        if (careerId != null) {
            filters.put("careerId", careerId);
        }
        if (StringUtils.hasText(careerCode)) {
            filters.put("careerCode", careerCode.trim());
        }
        if (sex != null) {
            filters.put("sex", sex.name());
        }
        if (quarter != null) {
            filters.put("quarter", quarter);
        }
        if (status != null) {
            filters.put("status", status.name());
        }
        return filters;
    }

    private void auditExport(
            Admin actor,
            String type,
            Map<String, Object> meta,
            long count,
            AuditOutcome outcome,
            HttpServletRequest request
    ) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("reportType", type);
        metadata.put("format", "xlsx");
        metadata.put("rowCount", count);
        metadata.putAll(meta);
        auditTrailService.auditAdminAction(actor, "REPORT_EXPORT", "REPORT", type, outcome, metadata, request);
    }
}
