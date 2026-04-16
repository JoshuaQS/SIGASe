package mx.edu.utez.server.modules.logs.audit.service;

import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import mx.edu.utez.server.modules.logs.audit.dto.AuditLogResponse;
import mx.edu.utez.server.modules.logs.audit.dto.AuditLogFilterRequest;
import mx.edu.utez.server.modules.logs.audit.entity.AuditLog;
import mx.edu.utez.server.modules.logs.audit.mapper.AuditLogMapper;
import mx.edu.utez.server.modules.logs.audit.repository.AuditLogRepository;
import mx.edu.utez.server.shared.api.PageResponse;
import mx.edu.utez.server.shared.enums.AuditOutcome;
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
    public PageResponse<AuditLogResponse> list(AuditLogFilterRequest filters) {
        validateForList(filters);
        Pageable pageable = PageRequest.of(
                filters.resolvedPage(0),
                filters.resolvedSize(20),
                buildSort(filters)
        );
        Specification<AuditLog> specification = buildSpecification(filters);
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

    public void validateForList(AuditLogFilterRequest filters) {
        int page = filters.resolvedPage(0);
        int size = filters.resolvedSize(20);
        if (page < 0 || size <= 0 || size > MAX_PAGE_SIZE) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Parámetros de paginación inválidos.");
        }
        validateDateRange(filters.dateFrom(), filters.dateTo());
    }

    public void validateForExport(AuditLogFilterRequest filters) {
        validateDateRange(filters.dateFrom(), filters.dateTo());
    }

    private void validateDateRange(Instant dateFrom, Instant dateTo) {
        if (dateFrom != null && dateTo != null && dateFrom.isAfter(dateTo)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "dateFrom debe ser menor o igual a dateTo.");
        }
    }

    public Sort buildSort(AuditLogFilterRequest filters) {
        String safeSortBy = StringUtils.hasText(filters.resolvedSortBy("occurredAt"))
                ? filters.resolvedSortBy("occurredAt").trim()
                : "occurredAt";
        if (!ALLOWED_SORT_FIELDS.contains(safeSortBy)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "sortBy no permitido.");
        }
        Sort.Direction direction = "asc".equalsIgnoreCase(filters.resolvedSortDir("desc"))
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        return Sort.by(direction, safeSortBy);
    }

    public Specification<AuditLog> buildSpecification(AuditLogFilterRequest filters) {
        return (root, query, cb) -> {
            var predicate = cb.conjunction();
            AuditOutcome outcome = filters.resolvedOutcome();

            if (filters.dateFrom() != null) {
                predicate = cb.and(predicate, cb.greaterThanOrEqualTo(root.get("occurredAt"), filters.dateFrom()));
            }
            if (filters.dateTo() != null) {
                predicate = cb.and(predicate, cb.lessThanOrEqualTo(root.get("occurredAt"), filters.dateTo()));
            }
            if (filters.actorType() != null) {
                predicate = cb.and(predicate, cb.equal(root.get("actorType"), filters.actorType()));
            }
            if (StringUtils.hasText(filters.actorEmail())) {
                var actorAdminJoin = root.join("actorAdmin", JoinType.LEFT);
                predicate = cb.and(predicate, cb.equal(
                        cb.lower(actorAdminJoin.get("email")),
                        filters.actorEmail().trim().toLowerCase(Locale.ROOT)
                ));
            }
            if (StringUtils.hasText(filters.action())) {
                predicate = cb.and(predicate, cb.equal(
                        cb.lower(root.get("action")),
                        filters.action().trim().toLowerCase(Locale.ROOT)
                ));
            }
            if (StringUtils.hasText(filters.entityType())) {
                predicate = cb.and(predicate, cb.equal(
                        cb.lower(root.get("entityType")),
                        filters.entityType().trim().toLowerCase(Locale.ROOT)
                ));
            }
            if (outcome != null) {
                predicate = cb.and(predicate, cb.equal(root.get("outcome"), outcome));
            }
            if (StringUtils.hasText(filters.requestId())) {
                predicate = cb.and(predicate, cb.equal(root.get("requestId"), filters.requestId().trim()));
            }
            if (StringUtils.hasText(filters.correlationId())) {
                predicate = cb.and(predicate, cb.equal(root.get("correlationId"), filters.correlationId().trim()));
            }
            if (filters.severity() != null) {
                predicate = cb.and(predicate, cb.equal(root.get("severity"), filters.severity()));
            }
            if (StringUtils.hasText(filters.search())) {
                String normalizedSearch = "%" + filters.search().trim().toLowerCase(Locale.ROOT) + "%";
                var actorAdminJoin = root.join("actorAdmin", JoinType.LEFT);
                ArrayList<Predicate> searchPredicates = new ArrayList<>();
                searchPredicates.add(cb.like(cb.lower(root.get("action")), normalizedSearch));
                searchPredicates.add(cb.like(cb.lower(root.get("entityType")), normalizedSearch));
                searchPredicates.add(cb.like(cb.lower(root.get("entityId")), normalizedSearch));
                searchPredicates.add(cb.like(cb.lower(root.get("description")), normalizedSearch));
                searchPredicates.add(cb.like(cb.lower(root.get("targetLabel")), normalizedSearch));
                searchPredicates.add(cb.like(cb.lower(root.get("actorReference")), normalizedSearch));
                searchPredicates.add(cb.like(cb.lower(actorAdminJoin.get("email")), normalizedSearch));
                searchPredicates.add(cb.like(cb.lower(root.get("requestId")), normalizedSearch));
                searchPredicates.add(cb.like(cb.lower(root.get("correlationId")), normalizedSearch));
                predicate = cb.and(predicate, cb.or(searchPredicates.toArray(Predicate[]::new)));
            }
            return predicate;
        };
    }
}
