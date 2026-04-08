package mx.edu.utez.server.modules.accesslogs.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import mx.edu.utez.server.modules.accesslogs.dto.AccessLogActorType;
import mx.edu.utez.server.modules.accesslogs.dto.AccessLogQueryFilters;
import mx.edu.utez.server.modules.accesslogs.dto.AccessLogResponse;
import mx.edu.utez.server.modules.accesslogs.dto.AccessLogScope;
import mx.edu.utez.server.shared.api.PageResponse;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class AccessLogQueryService {

    private static final int MAX_PAGE_SIZE = 200;
    private static final int MAX_EXPORT_SIZE = 50_000;
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of("occurredAt", "actorType", "scope", "result");

    private static final String UNION_SQL = """
                SELECT
                    CAST(sae.id AS CHAR(36)) AS id,
                    sae.occurred_at AS occurred_at,
                    'STUDENT' AS actor_type,
                    CASE sae.auth_method
                        WHEN 'LOCAL' THEN 'SIGASE_LOCAL'
                        WHEN 'GOOGLE' THEN 'SIGASE_GOOGLE'
                        ELSE 'SIGASE_LOCAL'
                    END AS scope,
                    CAST(s.id AS CHAR(36)) AS actor_id,
                    NULLIF(TRIM(CONCAT(COALESCE(s.name, ''), ' ', COALESCE(s.last_name_paternal, ''), ' ', COALESCE(s.last_name_maternal, ''))), '') AS actor_name,
                    s.institutional_email AS actor_email,
                    CAST(sae.result AS CHAR(64)) AS result,
                    CAST(COALESCE(sae.error_detail, sae.error_code, CAST(sae.result AS CHAR(64))) AS CHAR(500)) AS reason,
                    sae.request_id AS request_id,
                    sae.correlation_id AS correlation_id,
                    sae.session_id AS session_id,
                    sae.ip_address_masked AS ip_address_masked,
                    sae.user_agent_sanitized AS user_agent_sanitized,
                    NULL AS latency_ms,
                    NULL AS next_url,
                    NULL AS redirect_url,
                    NULL AS provider_status_code,
                    NULL AS provider_error_code,
                    NULL AS provider_error_message,
                    NULL AS channel_name,
                    sae.metadata_json AS metadata_json,
                    CAST(s.id AS CHAR(36)) AS student_ref_id,
                    NULL AS admin_ref_id,
                    CAST(c.id AS CHAR(36)) AS career_ref_id
                FROM student_auth_events sae
                LEFT JOIN students s ON s.id = sae.student_id
                LEFT JOIN careers c ON c.id = s.career_id

                UNION ALL

                SELECT
                    CAST(eal.id AS CHAR(36)) AS id,
                    eal.occurred_at AS occurred_at,
                    'STUDENT' AS actor_type,
                    'ELIBRO' AS scope,
                    CAST(s.id AS CHAR(36)) AS actor_id,
                    NULLIF(TRIM(CONCAT(COALESCE(s.name, ''), ' ', COALESCE(s.last_name_paternal, ''), ' ', COALESCE(s.last_name_maternal, ''))), '') AS actor_name,
                    s.institutional_email AS actor_email,
                    CAST(eal.result AS CHAR(64)) AS result,
                    CAST(COALESCE(eal.error_detail, eal.error_code, CAST(eal.result AS CHAR(64))) AS CHAR(500)) AS reason,
                    eal.request_id AS request_id,
                    eal.correlation_id AS correlation_id,
                    eal.session_id AS session_id,
                    eal.ip_address_masked AS ip_address_masked,
                    eal.user_agent_sanitized AS user_agent_sanitized,
                    eal.latency_ms AS latency_ms,
                    eal.next_url AS next_url,
                    eal.redirect_url AS redirect_url,
                    eal.provider_status_code AS provider_status_code,
                    eal.provider_error_code AS provider_error_code,
                    eal.provider_error_message AS provider_error_message,
                    eal.channel_name_snapshot AS channel_name,
                    eal.metadata_json AS metadata_json,
                    CAST(s.id AS CHAR(36)) AS student_ref_id,
                    NULL AS admin_ref_id,
                    CAST(c.id AS CHAR(36)) AS career_ref_id
                FROM elibro_access_logs eal
                LEFT JOIN students s ON s.id = eal.student_id
                LEFT JOIN careers c ON c.id = s.career_id

                UNION ALL

                SELECT
                    CAST(aae.id AS CHAR(36)) AS id,
                    aae.occurred_at AS occurred_at,
                    'ADMIN' AS actor_type,
                    'ADMIN_LOGIN' AS scope,
                    CAST(a.id AS CHAR(36)) AS actor_id,
                    NULLIF(TRIM(CONCAT(COALESCE(a.name, ''), ' ', COALESCE(a.last_name_paternal, ''), ' ', COALESCE(a.last_name_maternal, ''))), '') AS actor_name,
                    a.email AS actor_email,
                    CAST(aae.result AS CHAR(64)) AS result,
                    CAST(COALESCE(aae.error_detail, aae.error_code, CAST(aae.result AS CHAR(64))) AS CHAR(500)) AS reason,
                    aae.request_id AS request_id,
                    aae.correlation_id AS correlation_id,
                    aae.session_id AS session_id,
                    aae.ip_address_masked AS ip_address_masked,
                    aae.user_agent_sanitized AS user_agent_sanitized,
                    NULL AS latency_ms,
                    NULL AS next_url,
                    NULL AS redirect_url,
                    NULL AS provider_status_code,
                    NULL AS provider_error_code,
                    NULL AS provider_error_message,
                    NULL AS channel_name,
                    aae.metadata_json AS metadata_json,
                    NULL AS student_ref_id,
                    CAST(a.id AS CHAR(36)) AS admin_ref_id,
                    NULL AS career_ref_id
                FROM admin_auth_events aae
                LEFT JOIN admins a ON a.id = aae.admin_id
            """;

    private final EntityManager entityManager;
    private final ObjectMapper objectMapper;

    public AccessLogQueryService(EntityManager entityManager, ObjectMapper objectMapper) {
        this.entityManager = entityManager;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public PageResponse<AccessLogResponse> list(AccessLogQueryFilters filters) {
        validatePageFilters(filters);

        QueryContext context = buildQueryContext(filters);
        Query dataQuery = entityManager.createNativeQuery(buildDataSql(context.whereClause(), context.sortConfig(), true));
        Query countQuery = entityManager.createNativeQuery(buildCountSql(context.whereClause()));
        bindParams(dataQuery, context.params());
        bindParams(countQuery, context.params());
        dataQuery.setParameter("limit", filters.size());
        dataQuery.setParameter("offset", filters.page() * filters.size());

        long total = ((Number) countQuery.getSingleResult()).longValue();
        List<AccessLogResponse> content = mapRows(dataQuery);

        int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / filters.size());
        return new PageResponse<>(content, filters.page(), filters.size(), total, totalPages);
    }

    @Transactional(readOnly = true)
    public List<AccessLogResponse> listForExport(AccessLogQueryFilters filters) {
        validateExportFilters(filters);

        QueryContext context = buildQueryContext(filters);
        Query countQuery = entityManager.createNativeQuery(buildCountSql(context.whereClause()));
        bindParams(countQuery, context.params());
        long total = ((Number) countQuery.getSingleResult()).longValue();
        if (total > MAX_EXPORT_SIZE) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "El resultado excede el límite de " + MAX_EXPORT_SIZE + " registros. Aplique filtros más específicos."
            );
        }
        if (total == 0) {
            return List.of();
        }

        Query dataQuery = entityManager.createNativeQuery(buildDataSql(context.whereClause(), context.sortConfig(), true));
        bindParams(dataQuery, context.params());
        dataQuery.setParameter("limit", total);
        dataQuery.setParameter("offset", 0);
        return mapRows(dataQuery);
    }

    private void validatePageFilters(AccessLogQueryFilters filters) {
        if (filters.page() < 0 || filters.size() <= 0 || filters.size() > MAX_PAGE_SIZE) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Parámetros de paginación inválidos.");
        }
        validateSharedFilters(filters);
    }

    private void validateExportFilters(AccessLogQueryFilters filters) {
        validateSharedFilters(filters);
    }

    private void validateSharedFilters(AccessLogQueryFilters filters) {
        if (filters.dateFrom() != null && filters.dateTo() != null && filters.dateFrom().isAfter(filters.dateTo())) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "dateFrom debe ser menor o igual a dateTo.");
        }
    }

    private QueryContext buildQueryContext(AccessLogQueryFilters filters) {
        Map<String, Object> params = new LinkedHashMap<>();
        String whereClause = buildWhereClause(filters, params);
        SortConfig sortConfig = parseSort(filters.sort());
        return new QueryContext(params, whereClause, sortConfig);
    }

    private String buildDataSql(String whereClause, SortConfig sortConfig, boolean paged) {
        String sql = """
                SELECT
                    id,
                    occurred_at,
                    actor_type,
                    scope,
                    actor_id,
                    actor_name,
                    actor_email,
                    result,
                    reason,
                    request_id,
                    correlation_id,
                    session_id,
                    ip_address_masked,
                    user_agent_sanitized,
                    latency_ms,
                    next_url,
                    redirect_url,
                    provider_status_code,
                    provider_error_code,
                    provider_error_message,
                    channel_name,
                    metadata_json
                FROM (
                """ + UNION_SQL + """
                ) access_log_union
                """ + whereClause
                + " ORDER BY " + sortConfig.orderBySql();
        if (paged) {
            sql += " LIMIT :limit OFFSET :offset";
        }
        return sql;
    }

    private String buildCountSql(String whereClause) {
        return """
                SELECT COUNT(*)
                FROM (
                """ + UNION_SQL + """
                ) access_log_union
                """ + whereClause;
    }

    private String buildWhereClause(AccessLogQueryFilters filters, Map<String, Object> params) {
        List<String> conditions = new ArrayList<>();

        if (filters.actorType() != null && filters.actorType() != AccessLogActorType.ALL) {
            conditions.add("actor_type = :actorType");
            params.put("actorType", filters.actorType().name());
        }
        if (filters.scope() != null && filters.scope() != AccessLogScope.ALL) {
            conditions.add("scope = :scope");
            params.put("scope", filters.scope().name());
        }
        if (StringUtils.hasText(filters.result()) && !"ALL".equalsIgnoreCase(filters.result().trim())) {
            conditions.add("result = :result");
            params.put("result", filters.result().trim());
        }
        if (filters.dateFrom() != null) {
            conditions.add("occurred_at >= :dateFrom");
            params.put("dateFrom", Timestamp.from(filters.dateFrom()));
        }
        if (filters.dateTo() != null) {
            conditions.add("occurred_at <= :dateTo");
            params.put("dateTo", Timestamp.from(filters.dateTo()));
        }
        if (filters.studentId() != null) {
            conditions.add("student_ref_id = :studentId");
            params.put("studentId", filters.studentId().toString());
        }
        if (filters.adminId() != null) {
            conditions.add("admin_ref_id = :adminId");
            params.put("adminId", filters.adminId().toString());
        }
        if (filters.careerId() != null) {
            conditions.add("career_ref_id = :careerId");
            params.put("careerId", filters.careerId().toString());
        }
        if (StringUtils.hasText(filters.search())) {
            conditions.add("""
                    LOWER(CONCAT(
                        COALESCE(actor_name, ''),
                        ' ',
                        COALESCE(actor_email, ''),
                        ' ',
                        COALESCE(request_id, ''),
                        ' ',
                        COALESCE(correlation_id, '')
                    )) LIKE :search
                    """);
            params.put("search", "%" + filters.search().trim().toLowerCase(Locale.ROOT) + "%");
        }

        if (conditions.isEmpty()) {
            return "";
        }
        return " WHERE " + String.join(" AND ", conditions);
    }

    private SortConfig parseSort(String sort) {
        String raw = StringUtils.hasText(sort) ? sort.trim() : "occurredAt,desc";
        String[] parts = raw.split("[,:]", 2);
        String field = parts[0].trim();
        String direction = parts.length > 1 ? parts[1].trim() : "desc";
        if (!ALLOWED_SORT_FIELDS.contains(field)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "sort no permitido.");
        }
        String dirSql = "asc".equalsIgnoreCase(direction) ? "ASC" : "DESC";
        String column = switch (field) {
            case "actorType" -> "actor_type";
            case "scope" -> "scope";
            case "result" -> "result";
            default -> "occurred_at";
        };
        String orderBy = column + " " + dirSql;
        if (!"occurred_at".equals(column)) {
            orderBy += ", occurred_at DESC";
        }
        orderBy += ", actor_type ASC, scope ASC, id " + dirSql;
        return new SortConfig(orderBy);
    }

    private void bindParams(Query query, Map<String, Object> params) {
        params.forEach(query::setParameter);
    }

    @SuppressWarnings("unchecked")
    private List<AccessLogResponse> mapRows(Query dataQuery) {
        List<Object[]> rows = dataQuery.getResultList();
        return rows.stream().map(this::mapRow).toList();
    }

    private AccessLogResponse mapRow(Object[] row) {
        return new AccessLogResponse(
                stringValue(row[0]),
                instantValue(row[1]),
                stringValue(row[2]),
                stringValue(row[3]),
                stringValue(row[4]),
                stringValue(row[5]),
                stringValue(row[6]),
                stringValue(row[7]),
                stringValue(row[8]),
                stringValue(row[9]),
                stringValue(row[10]),
                stringValue(row[11]),
                stringValue(row[12]),
                stringValue(row[13]),
                longValue(row[14]),
                stringValue(row[15]),
                stringValue(row[16]),
                integerValue(row[17]),
                stringValue(row[18]),
                stringValue(row[19]),
                stringValue(row[20]),
                parseMetadata(row[21])
        );
    }

    private String stringValue(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private Long longValue(Object value) {
        return value instanceof Number number ? number.longValue() : null;
    }

    private Integer integerValue(Object value) {
        return value instanceof Number number ? number.intValue() : null;
    }

    private Instant instantValue(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toInstant();
        }
        if (value instanceof Instant instant) {
            return instant;
        }
        if (value instanceof LocalDateTime localDateTime) {
            return localDateTime.toInstant(ZoneOffset.UTC);
        }
        if (value instanceof OffsetDateTime offsetDateTime) {
            return offsetDateTime.toInstant();
        }
        if (value instanceof java.util.Date date) {
            return date.toInstant();
        }
        try {
            return Instant.parse(String.valueOf(value));
        } catch (DateTimeParseException ex) {
            try {
                return Timestamp.valueOf(String.valueOf(value)).toInstant();
            } catch (IllegalArgumentException ignored) {
                return null;
            }
        }
    }

    private JsonNode parseMetadata(Object value) {
        if (value == null || !StringUtils.hasText(String.valueOf(value))) {
            return null;
        }
        try {
            return objectMapper.readTree(String.valueOf(value));
        } catch (Exception ex) {
            return objectMapper.getNodeFactory().textNode(String.valueOf(value));
        }
    }

    private record SortConfig(String orderBySql) {
    }

    private record QueryContext(
            Map<String, Object> params,
            String whereClause,
            SortConfig sortConfig
    ) {
    }
}
