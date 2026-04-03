package mx.edu.utez.server.modules.logs.access.service;

import mx.edu.utez.server.modules.logs.access.dto.AccessLogResponse;
import mx.edu.utez.server.modules.logs.access.entity.AccessLog;
import mx.edu.utez.server.modules.logs.access.mapper.AccessLogMapper;
import mx.edu.utez.server.modules.logs.access.repository.AccessLogRepository;
import mx.edu.utez.server.shared.api.PageResponse;
import mx.edu.utez.server.shared.enums.AccessResult;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import mx.edu.utez.server.shared.util.SecurityLogSanitizer;
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
public class AccessLogQueryService {

    private static final int MAX_PAGE_SIZE = 200;

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "occurredAt", "result", "latencyMs", "normalizedEmail", "attemptedEmail", "ipAddress",
            "requestId", "correlationId", "providerName"
    );

    private final AccessLogRepository accessLogRepository;
    private final AccessLogMapper accessLogMapper;
    private final SecurityLogSanitizer securityLogSanitizer;

    public AccessLogQueryService(
            AccessLogRepository accessLogRepository,
            AccessLogMapper accessLogMapper,
            SecurityLogSanitizer securityLogSanitizer
    ) {
        this.accessLogRepository = accessLogRepository;
        this.accessLogMapper = accessLogMapper;
        this.securityLogSanitizer = securityLogSanitizer;
    }

    @Transactional(readOnly = true)
    public PageResponse<AccessLogResponse> list(
            Instant dateFrom,
            Instant dateTo,
            AccessResult result,
            String normalizedEmail,
            String attemptedEmail,
            UUID studentId,
            String ipAddress,
            String requestId,
            String correlationId,
            String providerName,
            int page,
            int size,
            String sortBy,
            String sortDir
    ) {
        validate(page, size, dateFrom, dateTo);
        Pageable pageable = PageRequest.of(page, size, buildSort(sortBy, sortDir));
        Specification<AccessLog> specification = buildSpecification(
                dateFrom,
                dateTo,
                result,
                normalizedEmail,
                attemptedEmail,
                studentId,
                ipAddress,
                requestId,
                correlationId,
                providerName
        );
        Page<AccessLogResponse> resultPage = accessLogRepository.findAll(specification, pageable).map(accessLogMapper::toResponse);
        return new PageResponse<>(
                resultPage.getContent(),
                resultPage.getNumber(),
                resultPage.getSize(),
                resultPage.getTotalElements(),
                resultPage.getTotalPages()
        );
    }

    @Transactional(readOnly = true)
    public AccessLogResponse getById(UUID accessLogId) {
        AccessLog accessLog = accessLogRepository.findById(accessLogId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "AccessLog no encontrado."));
        return accessLogMapper.toResponse(accessLog);
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

    private Specification<AccessLog> buildSpecification(
            Instant dateFrom,
            Instant dateTo,
            AccessResult result,
            String normalizedEmail,
            String attemptedEmail,
            UUID studentId,
            String ipAddress,
            String requestId,
            String correlationId,
            String providerName
    ) {
        final String rawNormalizedEmail = StringUtils.hasText(normalizedEmail)
                ? normalizedEmail.trim().toLowerCase(Locale.ROOT)
                : null;
        final String sanitizedNormalizedEmail = securityLogSanitizer.sanitizeEmailForLookup(normalizedEmail);
        final String rawAttemptedEmail = StringUtils.hasText(attemptedEmail)
                ? attemptedEmail.trim().toLowerCase(Locale.ROOT)
                : null;
        final String sanitizedAttemptedEmail = securityLogSanitizer.sanitizeEmailForLookup(attemptedEmail);
        final String rawIpAddress = StringUtils.hasText(ipAddress)
                ? ipAddress.trim().toLowerCase(Locale.ROOT)
                : null;
        final String sanitizedIpAddress = securityLogSanitizer.sanitizeIpForLookup(ipAddress);

        return (root, query, cb) -> {
            var predicate = cb.conjunction();

            if (dateFrom != null) {
                predicate = cb.and(predicate, cb.greaterThanOrEqualTo(root.get("occurredAt"), dateFrom));
            }
            if (dateTo != null) {
                predicate = cb.and(predicate, cb.lessThanOrEqualTo(root.get("occurredAt"), dateTo));
            }
            if (result != null) {
                predicate = cb.and(predicate, cb.equal(root.get("result"), result));
            }
            if (StringUtils.hasText(normalizedEmail)) {
                predicate = cb.and(predicate, cb.or(
                        cb.equal(cb.lower(root.get("normalizedEmail")), rawNormalizedEmail),
                        cb.equal(cb.lower(root.get("normalizedEmail")), sanitizedNormalizedEmail)
                ));
            }
            if (StringUtils.hasText(attemptedEmail)) {
                predicate = cb.and(predicate, cb.or(
                        cb.equal(cb.lower(root.get("attemptedEmail")), rawAttemptedEmail),
                        cb.equal(cb.lower(root.get("attemptedEmail")), sanitizedAttemptedEmail)
                ));
            }
            if (studentId != null) {
                predicate = cb.and(predicate, cb.equal(root.get("student").get("id"), studentId));
            }
            if (StringUtils.hasText(ipAddress)) {
                predicate = cb.and(predicate, cb.or(
                        cb.equal(cb.lower(root.get("ipAddress")), rawIpAddress),
                        cb.equal(cb.lower(root.get("ipAddress")), sanitizedIpAddress)
                ));
            }
            if (StringUtils.hasText(requestId)) {
                predicate = cb.and(predicate, cb.equal(root.get("requestId"), requestId.trim()));
            }
            if (StringUtils.hasText(correlationId)) {
                predicate = cb.and(predicate, cb.equal(root.get("correlationId"), correlationId.trim()));
            }
            if (StringUtils.hasText(providerName)) {
                predicate = cb.and(predicate, cb.equal(
                        cb.lower(root.get("providerName")),
                        providerName.trim().toLowerCase(Locale.ROOT)
                ));
            }
            return predicate;
        };
    }
}
