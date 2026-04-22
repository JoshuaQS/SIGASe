package mx.edu.utez.server.modules.logs.audit.service;

import java.util.List;
import mx.edu.utez.server.modules.logs.audit.dto.AuditLogSummaryResponse;
import mx.edu.utez.server.modules.logs.audit.repository.AuditLogRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditLogSummaryService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogSummaryService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional(readOnly = true)
    public AuditLogSummaryResponse getGlobalSummary() {
        long total = auditLogRepository.countAll();
        long uniqueActors = auditLogRepository.countDistinctActorsNative();
        long critical = auditLogRepository.countCriticalLike();
        long failures = auditLogRepository.countFailureLike();

        List<AuditLogSummaryResponse.ActionCount> topActions = auditLogRepository
                .findTopActions(PageRequest.of(0, 8))
                .stream()
                .map(p -> new AuditLogSummaryResponse.ActionCount(p.getAction(), p.getTotal()))
                .toList();

        List<AuditLogSummaryResponse.SeverityCount> severities = auditLogRepository
                .countBySeverity()
                .stream()
                .map(p -> new AuditLogSummaryResponse.SeverityCount(p.getSeverity(), p.getTotal()))
                .toList();

        List<AuditLogSummaryResponse.OutcomeCount> outcomes = auditLogRepository
                .countByOutcome()
                .stream()
                .map(p -> new AuditLogSummaryResponse.OutcomeCount(p.getOutcome(), p.getTotal()))
                .toList();

        return new AuditLogSummaryResponse(total, uniqueActors, critical, failures, topActions, severities, outcomes);
    }
}

