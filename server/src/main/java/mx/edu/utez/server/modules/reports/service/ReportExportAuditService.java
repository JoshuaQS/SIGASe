package mx.edu.utez.server.modules.reports.service;

import java.util.LinkedHashMap;
import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.logs.audit.service.AuditTrailService;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import org.springframework.stereotype.Service;

@Service
public class ReportExportAuditService {

    private final AuditTrailService auditTrailService;

    public ReportExportAuditService(AuditTrailService auditTrailService) {
        this.auditTrailService = auditTrailService;
    }

    public void auditCsvExport(
            Admin actor,
            String reportType,
            Map<String, Object> filters,
            long rowCount,
            AuditOutcome outcome,
            HttpServletRequest request
    ) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("reportType", reportType);
        metadata.put("filters", filters);
        metadata.put("rowCount", rowCount);
        metadata.put("format", "csv");
        auditTrailService.auditAdminAction(
                actor,
                "REPORT_EXPORT",
                "REPORT",
                reportType,
                outcome,
                metadata,
                request
        );
    }
}
