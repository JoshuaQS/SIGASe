package mx.edu.utez.server.modules.logs.audit.service;

import mx.edu.utez.server.modules.logs.audit.dto.AuditLogResponse;
import mx.edu.utez.server.modules.logs.audit.entity.AuditLog;
import mx.edu.utez.server.modules.logs.audit.mapper.AuditLogMapper;
import mx.edu.utez.server.modules.logs.audit.repository.AuditLogRepository;
import mx.edu.utez.server.shared.api.PageResponse;
import mx.edu.utez.server.shared.enums.AuditActorType;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.AuditSeverity;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import java.time.Instant;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class AuditLogQueryService {

    private static final int MAX_PAGE_SIZE = 200;

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "occurredAt", "actorType", "action", "entityType", "outcome", "severity", "requestId", "correlationId"
    );

    private final AuditLogRepository auditLogRepository;
    private final AuditLogMapper auditLogMapper;

    public AuditLogQueryService(
            AuditLogRepository auditLogRepository,
            AuditLogMapper auditLogMapper
    ) {
        this.auditLogRepository = auditLogRepository;
        this.auditLogMapper = auditLogMapper;
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditLogResponse> list(
            Instant dateFrom,
            Instant dateTo,
            AuditActorType actorType,
            String actorEmail,
            String action,
            String entityType,
            AuditOutcome outcome,
            String requestId,
            String correlationId,
            AuditSeverity severity,
            int page,
            int size,
            String sortBy,
            String sortDir
    ) {
        validate(page, size, dateFrom, dateTo);
        Pageable pageable = PageRequest.of(page, size, buildSort(sortBy, sortDir));
        Specification<AuditLog> specification = buildSpecification(
                dateFrom,
                dateTo,
                actorType,
                actorEmail,
                action,
                entityType,
                outcome,
                requestId,
                correlationId,
                severity
        );
        Page<AuditLogResponse> resultPage = auditLogRepository.findAll(specification, pageable).map(auditLogMapper::toResponse);
        return new PageResponse<>(
                resultPage.getContent(),
                resultPage.getNumber(),
                resultPage.getSize(),
                resultPage.getTotalElements(),
                resultPage.getTotalPages()
        );
    }

    @Transactional(readOnly = true)
    public AuditLogResponse getById(UUID auditLogId) {
        AuditLog auditLog = auditLogRepository.findById(auditLogId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "AuditLog no encontrado."));
        return auditLogMapper.toResponse(auditLog);
    }

    private void validate(int page, int size, Instant dateFrom, Instant dateTo) {
        if (page < 0 || size <= 0 || size > MAX_PAGE_SIZE) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Parámetros de paginación inválidos.");
        }
        if (dateFrom != null && dateTo != null && dateFrom.isAfter(dateTo)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "dateFrom debe ser menor o igual a dateTo.");
        }
    }

    private Sort buildSort(String sortBy, String sortDir) {
        String safeSortBy = StringUtils.hasText(sortBy) ? sortBy.trim() : "occurredAt";
        if (!ALLOWED_SORT_FIELDS.contains(safeSortBy)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "sortBy no permitido.");
        }
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(direction, safeSortBy);
    }

    private Specification<AuditLog> buildSpecification(
            Instant dateFrom,
            Instant dateTo,
            AuditActorType actorType,
            String actorEmail,
            String action,
            String entityType,
            AuditOutcome outcome,
            String requestId,
            String correlationId,
            AuditSeverity severity
    ) {
        return (root, query, cb) -> {
            var predicate = cb.conjunction();

            if (dateFrom != null) {
                predicate = cb.and(predicate, cb.greaterThanOrEqualTo(root.get("occurredAt"), dateFrom));
            }
            if (dateTo != null) {
                predicate = cb.and(predicate, cb.lessThanOrEqualTo(root.get("occurredAt"), dateTo));
            }
            if (actorType != null) {
                predicate = cb.and(predicate, cb.equal(root.get("actorType"), actorType));
            }
            if (StringUtils.hasText(actorEmail)) {
                var actorAdminJoin = root.join("actorAdmin", jakarta.persistence.criteria.JoinType.LEFT);
                predicate = cb.and(predicate, cb.equal(
                        cb.lower(actorAdminJoin.get("email")),
                        actorEmail.trim().toLowerCase(Locale.ROOT)
                ));
            }
            if (StringUtils.hasText(action)) {
                predicate = cb.and(predicate, cb.equal(
                        cb.lower(root.get("action")),
                        action.trim().toLowerCase(Locale.ROOT)
                ));
            }
            if (StringUtils.hasText(entityType)) {
                predicate = cb.and(predicate, cb.equal(
                        cb.lower(root.get("entityType")),
                        entityType.trim().toLowerCase(Locale.ROOT)
                ));
            }
            if (outcome != null) {
                predicate = cb.and(predicate, cb.equal(root.get("outcome"), outcome));
            }
            if (StringUtils.hasText(requestId)) {
                predicate = cb.and(predicate, cb.equal(root.get("requestId"), requestId.trim()));
            }
            if (StringUtils.hasText(correlationId)) {
                predicate = cb.and(predicate, cb.equal(root.get("correlationId"), correlationId.trim()));
            }
            if (severity != null) {
                predicate = cb.and(predicate, cb.equal(root.get("severity"), severity));
            }
            return predicate;
        };
    }
}
