package mx.edu.utez.server.modules.reports.service;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.StudentStatus;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import mx.edu.utez.server.modules.logs.audit.service.AuditTrailService;
import jakarta.servlet.http.HttpServletRequest;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.streaming.SXSSFSheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.io.OutputStream;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class StudentXlsxExportService {

    private static final int CHUNK_SIZE = 500;
    private static final int HEADER_ROW_IDX = 4;

    private static final String[] DISPLAY_HEADERS = {
            "Matrícula", "Nombre", "Apellido Paterno", "Apellido Materno",
            "Correo Institucional", "Carrera", "Cuatrimestre", "Sexo", "Estado",
            "Último Acceso", "Fecha Registro"
    };

    private static final int[] COL_WIDTHS = {
            12, 25, 20, 20, 30, 25, 14, 14, 12, 20, 20
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
            String q, UUID careerId, String careerCode, StudentStatus status,
            Admin actor, HttpServletRequest request
    ) {
        Specification<Student> spec = reportService.buildStudentSpec(q, careerId, careerCode, status);
        long total = studentRepository.count(spec);

        try (SXSSFWorkbook wb = new SXSSFWorkbook(CHUNK_SIZE)) {
            SXSSFSheet sheet = wb.createSheet("Estudiantes");

            CellStyle titleStyle = XlsxExportService.createTitleStyle(wb);
            CellStyle subtitleStyle = XlsxExportService.createSubtitleStyle(wb);
            CellStyle headerStyle = XlsxExportService.createHeaderStyle(wb);
            CellStyle activeStyle = XlsxExportService.createActiveStyle(wb);
            CellStyle inactiveStyle = XlsxExportService.createInactiveStyle(wb);

            int lastCol = DISPLAY_HEADERS.length - 1;

            // Metadata rows
            XlsxExportService.writeMergedRow(sheet, 0, lastCol,
                    "Reporte de Estudiantes — SIGASe", titleStyle);
            XlsxExportService.writeMergedRow(sheet, 1, lastCol,
                    "Generado: " + XlsxExportService.formatInstantNow() + " UTC", subtitleStyle);
            XlsxExportService.writeMergedRow(sheet, 2, lastCol,
                    "Filtros: " + buildFilterText(q, careerId, careerCode, status), subtitleStyle);

            // Header row
            Row headerRow = sheet.createRow(HEADER_ROW_IDX);
            for (int i = 0; i < DISPLAY_HEADERS.length; i++) {
                headerRow.createCell(i).setCellValue(DISPLAY_HEADERS[i]);
                headerRow.getCell(i).setCellStyle(headerStyle);
            }

            // Data rows
            int rowIdx = HEADER_ROW_IDX + 1;
                int page = 0;
            while (true) {
                PageRequest pageReq = PageRequest.of(page, CHUNK_SIZE, Sort.by(Sort.Direction.ASC, "enrollmentId"));
                Page<Student> result = studentRepository.findAll(spec, pageReq);
                if (result.isEmpty()) break;

                for (Student s : result.getContent()) {
                    Row row = sheet.createRow(rowIdx++);
                    row.createCell(0).setCellValue(XlsxExportService.sanitize(s.getEnrollmentId()));
                    row.createCell(1).setCellValue(XlsxExportService.sanitize(s.getName()));
                    row.createCell(2).setCellValue(XlsxExportService.sanitize(s.getLastNamePaternal()));
                    row.createCell(3).setCellValue(XlsxExportService.sanitize(
                            s.getLastNameMaternal() != null ? s.getLastNameMaternal() : ""));
                    row.createCell(4).setCellValue(XlsxExportService.sanitize(s.getInstitutionalEmail()));
                    row.createCell(5).setCellValue(XlsxExportService.sanitize(
                            s.getCareer() != null ? s.getCareer().getName() : ""));
                    row.createCell(6).setCellValue(s.getQuarter() != null ? s.getQuarter() : 0);
                    row.createCell(7).setCellValue(s.getSex() != null ? s.getSex().name() : "");
                    String statusVal = s.getStatus() != null ? s.getStatus().name() : "";
                    row.createCell(8).setCellValue(statusVal);
                    if (s.getStatus() == StudentStatus.ACTIVE) {
                        row.getCell(8).setCellStyle(activeStyle);
                    } else if (s.getStatus() == StudentStatus.INACTIVE) {
                        row.getCell(8).setCellStyle(inactiveStyle);
                    }
                    row.createCell(9).setCellValue(XlsxExportService.formatInstantDisplay(s.getLastLoginAt()));
                    row.createCell(10).setCellValue(XlsxExportService.formatInstantDisplay(s.getCreatedAt()));
                }
                page++;
            }

            // Column widths
            for (int i = 0; i < COL_WIDTHS.length; i++) {
                sheet.setColumnWidth(i, COL_WIDTHS[i] * 256);
            }

            // Freeze pane below header row
            sheet.createFreezePane(0, HEADER_ROW_IDX + 1);

            // Autofilter
            if (rowIdx > HEADER_ROW_IDX + 1) {
                sheet.setAutoFilter(new CellRangeAddress(HEADER_ROW_IDX, rowIdx - 1, 0, lastCol));
            }

            wb.write(out);
            wb.dispose();
        } catch (Exception ex) {
            Map<String, Object> meta = new LinkedHashMap<>();
            meta.put("format", "xlsx");
            auditExport(actor, "STUDENTS", meta, 0, AuditOutcome.FAILURE, request);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "Error generando XLSX de estudiantes.");
        }

        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("format", "xlsx");
        meta.put("rowCount", total);
        auditExport(actor, "STUDENTS", meta, total, AuditOutcome.SUCCESS, request);
    }

    private String buildFilterText(String q, UUID careerId, String careerCode, StudentStatus status) {
        StringBuilder sb = new StringBuilder();
        if (StringUtils.hasText(q)) sb.append("q=").append(q).append(", ");
        if (careerId != null) sb.append("careerId=").append(careerId).append(", ");
        if (StringUtils.hasText(careerCode)) sb.append("careerCode=").append(careerCode).append(", ");
        if (status != null) sb.append("status=").append(status.name()).append(", ");
        if (sb.isEmpty()) return "Sin filtros";
        return sb.substring(0, sb.length() - 2);
    }

    private void auditExport(Admin actor, String type, Map<String, Object> meta,
                             long count, AuditOutcome outcome, HttpServletRequest request) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("reportType", type);
        metadata.put("format", "xlsx");
        metadata.put("rowCount", count);
        metadata.putAll(meta);
        auditTrailService.auditAdminAction(actor, "REPORT_EXPORT", "REPORT", type, outcome, metadata, request);
    }
}
