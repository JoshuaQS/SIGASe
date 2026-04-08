package mx.edu.utez.server.modules.reports.service;

import jakarta.servlet.http.HttpServletRequest;
import java.io.OutputStream;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.UUID;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.elibro.entity.ElibroAccessLog;
import mx.edu.utez.server.modules.logs.audit.entity.AuditLog;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.shared.enums.ElibroAccessResult;
import mx.edu.utez.server.shared.enums.AuditActorType;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.AuditSeverity;
import mx.edu.utez.server.shared.enums.Sex;
import mx.edu.utez.server.shared.enums.StudentStatus;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

@Service
public class ReportService {

    public static final String[] ACCESS_LOG_HEADERS = AccessLogReportService.ACCESS_LOG_HEADERS;
    public static final String[] AUDIT_LOG_HEADERS = AuditLogReportService.AUDIT_LOG_HEADERS;

    private static final DateTimeFormatter FILENAME_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd_HHmmss");

    private final StudentReportService studentReportService;
    private final AccessLogReportService accessLogReportService;
    private final AuditLogReportService auditLogReportService;

    public ReportService(
            StudentReportService studentReportService,
            AccessLogReportService accessLogReportService,
            AuditLogReportService auditLogReportService
    ) {
        this.studentReportService = studentReportService;
        this.accessLogReportService = accessLogReportService;
        this.auditLogReportService = auditLogReportService;
    }

    public void exportStudents(
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
        studentReportService.export(
                out,
                q,
                enrollmentId,
                lastNamePaternal,
                lastNameMaternal,
                careerId,
                careerCode,
                sex,
                quarter,
                status,
                actor,
                request
        );
    }

    Specification<Student> buildStudentSpec(
            String query,
            String enrollmentId,
            String lastNamePaternal,
            String lastNameMaternal,
            UUID careerId,
            String careerCode,
            Sex sex,
            Integer quarter,
            StudentStatus status
    ) {
        return studentReportService.buildSpec(
                query,
                enrollmentId,
                lastNamePaternal,
                lastNameMaternal,
                careerId,
                careerCode,
                sex,
                quarter,
                status
        );
    }

    public void exportAccessLogs(
            OutputStream out,
            Instant dateFrom,
            Instant dateTo,
            ElibroAccessResult result,
            String normalizedEmail,
            String attemptedEmail,
            UUID studentId,
            String ipAddress,
            String channelName,
            Admin actor,
            HttpServletRequest request
    ) {
        accessLogReportService.export(
                out,
                dateFrom,
                dateTo,
                result,
                normalizedEmail,
                attemptedEmail,
                studentId,
                ipAddress,
                channelName,
                actor,
                request
        );
    }

    Specification<ElibroAccessLog> buildAccessLogSpec(
            Instant dateFrom,
            Instant dateTo,
            ElibroAccessResult result,
            String normalizedEmail,
            String attemptedEmail,
            UUID studentId,
            String ipAddress,
            String channelName
    ) {
        return accessLogReportService.buildSpec(
                dateFrom,
                dateTo,
                result,
                normalizedEmail,
                attemptedEmail,
                studentId,
                ipAddress,
                channelName
        );
    }

    public void exportAuditLogs(
            OutputStream out,
            Instant dateFrom,
            Instant dateTo,
            AuditActorType actorType,
            String actorEmail,
            String action,
            String entityType,
            AuditOutcome outcome,
            AuditSeverity severity,
            Admin actor,
            HttpServletRequest request
    ) {
        auditLogReportService.export(
                out,
                dateFrom,
                dateTo,
                actorType,
                actorEmail,
                action,
                entityType,
                outcome,
                severity,
                actor,
                request
        );
    }

    Specification<AuditLog> buildAuditLogSpec(
            Instant dateFrom,
            Instant dateTo,
            AuditActorType actorType,
            String actorEmail,
            String action,
            String entityType,
            AuditOutcome outcome,
            AuditSeverity severity
    ) {
        return auditLogReportService.buildSpec(dateFrom, dateTo, actorType, actorEmail, action, entityType, outcome, severity);
    }

    public void validateStudentExport(
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
        studentReportService.validateExport(
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
    }

    public void validateLogExport(Instant dateFrom, Instant dateTo) {
        accessLogReportService.validateRange(dateFrom, dateTo);
    }

    static String truncateErrorDetail(String errorDetail) {
        return AccessLogReportService.truncateErrorDetail(errorDetail);
    }

    public static String generateFilename(String reportType) {
        return generateFilename(reportType, "csv");
    }

    public static String generateFilename(String reportType, String extension) {
        String timestamp = FILENAME_FORMATTER.format(LocalDateTime.now(ZoneOffset.UTC));
        return reportType + "_" + timestamp + "." + extension;
    }
}
