package mx.edu.utez.server.modules.logs.audit.dto;

import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.AuditSeverity;
import java.util.List;

public record AuditLogSummaryResponse(
        long total,
        long uniqueActors,
        long critical,
        long failures,
        List<ActionCount> topActions,
        List<SeverityCount> severityBreakdown,
        List<OutcomeCount> outcomeBreakdown
) {
    public record ActionCount(String action, long total) {}
    public record SeverityCount(AuditSeverity severity, long total) {}
    public record OutcomeCount(AuditOutcome outcome, long total) {}
}

