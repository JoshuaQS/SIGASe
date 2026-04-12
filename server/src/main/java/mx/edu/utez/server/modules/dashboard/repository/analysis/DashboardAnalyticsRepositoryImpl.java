package mx.edu.utez.server.modules.dashboard.repository.analysis;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Tuple;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.sql.Date;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import mx.edu.utez.server.modules.careers.entity.Career;
import mx.edu.utez.server.modules.dashboard.dto.DashboardStudentActivityItemResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardStudentActivityTableResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardStudentAccessSummaryResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardSortDirection;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTopCareerItemResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTopStudentItemResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTrendPointResponse;
import mx.edu.utez.server.modules.elibro.entity.ElibroAccessLog;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.dashboard.service.analysis.BaseAccessQueryFilter;
import mx.edu.utez.server.shared.enums.ElibroAccessResult;
import mx.edu.utez.server.shared.enums.StudentStatus;
import org.springframework.stereotype.Repository;

@Repository
public class DashboardAnalyticsRepositoryImpl implements DashboardAnalyticsRepository {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public OverviewKpiAggregate fetchOverviewKpis(BaseAccessQueryFilter filter) {
        long totalStudents = countStudents(filter, null);
        long activeStudents = countStudents(filter, StudentStatus.ACTIVE);
        long inactiveStudents = countStudents(filter, StudentStatus.INACTIVE);

        long successfulAccesses = countLogs(filter, Set.of(ElibroAccessResult.SUCCESS), false);
        long failedAccesses = countLogs(filter, failedResults(), false);
        long uniqueStudentsWithSuccessfulAccess = countLogs(filter, Set.of(ElibroAccessResult.SUCCESS), true);

        Instant lastAccessAt = findLastAccessAt(filter, null);
        Instant lastSuccessfulAccessAt = findLastAccessAt(filter, Set.of(ElibroAccessResult.SUCCESS));
        Instant lastFailedAccessAt = findLastAccessAt(filter, failedResults());

        return new OverviewKpiAggregate(
                totalStudents,
                activeStudents,
                inactiveStudents,
                successfulAccesses,
                failedAccesses,
                uniqueStudentsWithSuccessfulAccess,
                lastAccessAt,
                lastSuccessfulAccessAt,
                lastFailedAccessAt
        );
    }

    @Override
    public List<DashboardTrendPointResponse> fetchTrend(BaseAccessQueryFilter filter) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Tuple> query = cb.createTupleQuery();
        Root<ElibroAccessLog> root = query.from(ElibroAccessLog.class);
        Join<ElibroAccessLog, Student> studentJoin = root.join("student", JoinType.LEFT);

        Expression<Date> dayExpression = cb.function("date", Date.class, root.get("occurredAt"));
        query.multiselect(
                dayExpression.alias("day"),
                root.get("result").alias("result"),
                cb.count(root).alias("total")
        );
        query.where(accessPredicates(cb, root, studentJoin, filter).toArray(Predicate[]::new));
        query.groupBy(dayExpression, root.get("result"));
        query.orderBy(cb.asc(dayExpression));

        List<Tuple> rows = entityManager.createQuery(query).getResultList();
        List<DashboardTrendPointResponse> points = new ArrayList<>();
        LocalDate start = filter.effectiveDateFrom().atZone(ZoneOffset.UTC).toLocalDate();
        LocalDate end = filter.effectiveDateTo().atZone(ZoneOffset.UTC).toLocalDate();

        for (LocalDate cursor = start; !cursor.isAfter(end); cursor = cursor.plusDays(1)) {
            long successful = 0L;
            long failed = 0L;
            for (Tuple row : rows) {
                LocalDate rowDay = row.get("day", Date.class).toLocalDate();
                if (!rowDay.equals(cursor)) {
                    continue;
                }
                ElibroAccessResult result = row.get("result", ElibroAccessResult.class);
                long total = row.get("total", Long.class);
                if (result == ElibroAccessResult.SUCCESS) {
                    successful += total;
                } else {
                    failed += total;
                }
            }
            points.add(new DashboardTrendPointResponse(cursor.toString(), successful, failed));
        }
        return points;
    }

    @Override
    public List<DashboardTopStudentItemResponse> fetchTopStudents(BaseAccessQueryFilter filter, int limit, DashboardSortDirection sortDirection) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Tuple> query = cb.createTupleQuery();
        Root<ElibroAccessLog> root = query.from(ElibroAccessLog.class);
        Join<ElibroAccessLog, Student> studentJoin = root.join("student", JoinType.INNER);
        Join<Student, Career> careerJoin = studentJoin.join("career", JoinType.INNER);

        Expression<Long> successfulExpr = cb.sum(cb.<Long>selectCase()
                .when(cb.equal(root.get("result"), ElibroAccessResult.SUCCESS), 1L)
                .otherwise(0L));
        Expression<Long> failedExpr = cb.sum(cb.<Long>selectCase()
                .when(root.get("result").in(failedResults()), 1L)
                .otherwise(0L));
        Expression<Long> totalExpr = cb.count(root);

        query.multiselect(
                studentJoin.get("id").alias("studentId"),
                studentJoin.get("name").alias("name"),
                studentJoin.get("enrollmentId").alias("enrollmentId"),
                careerJoin.get("code").alias("careerCode"),
                careerJoin.get("name").alias("careerName"),
                successfulExpr.alias("successfulAccesses"),
                failedExpr.alias("failedAccesses"),
                totalExpr.alias("totalAccesses")
        );
        query.where(accessPredicates(cb, root, studentJoin, filter).toArray(Predicate[]::new));
        query.groupBy(studentJoin.get("id"), studentJoin.get("name"), studentJoin.get("enrollmentId"), careerJoin.get("code"), careerJoin.get("name"));
        query.orderBy(
                sortDirection == DashboardSortDirection.ASC ? cb.asc(totalExpr) : cb.desc(totalExpr),
                cb.asc(studentJoin.get("name"))
        );

        TypedQuery<Tuple> typedQuery = entityManager.createQuery(query);
        typedQuery.setMaxResults(limit);
        return typedQuery.getResultList().stream()
                .map(row -> new DashboardTopStudentItemResponse(
                        row.get("studentId", UUID.class),
                        row.get("name", String.class),
                        row.get("enrollmentId", String.class),
                        row.get("careerCode", String.class),
                        row.get("careerName", String.class),
                        row.get("successfulAccesses", Long.class),
                        row.get("failedAccesses", Long.class),
                        row.get("totalAccesses", Long.class)
                ))
                .toList();
    }

    @Override
    public List<DashboardTopCareerItemResponse> fetchTopCareers(BaseAccessQueryFilter filter, int limit, DashboardSortDirection sortDirection) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Tuple> query = cb.createTupleQuery();
        Root<ElibroAccessLog> root = query.from(ElibroAccessLog.class);
        Join<ElibroAccessLog, Student> studentJoin = root.join("student", JoinType.INNER);
        Join<Student, Career> careerJoin = studentJoin.join("career", JoinType.INNER);

        Expression<Long> successfulExpr = cb.sum(cb.<Long>selectCase()
                .when(cb.equal(root.get("result"), ElibroAccessResult.SUCCESS), 1L)
                .otherwise(0L));
        Expression<Long> failedExpr = cb.sum(cb.<Long>selectCase()
                .when(root.get("result").in(failedResults()), 1L)
                .otherwise(0L));
        Expression<Long> totalExpr = cb.count(root);

        query.multiselect(
                careerJoin.get("code").alias("careerCode"),
                careerJoin.get("name").alias("careerName"),
                successfulExpr.alias("successfulAccesses"),
                failedExpr.alias("failedAccesses"),
                totalExpr.alias("totalAccesses")
        );
        query.where(accessPredicates(cb, root, studentJoin, filter).toArray(Predicate[]::new));
        query.groupBy(careerJoin.get("code"), careerJoin.get("name"));
        query.orderBy(
                sortDirection == DashboardSortDirection.ASC ? cb.asc(totalExpr) : cb.desc(totalExpr),
                cb.asc(careerJoin.get("code"))
        );

        TypedQuery<Tuple> typedQuery = entityManager.createQuery(query);
        typedQuery.setMaxResults(limit);
        return typedQuery.getResultList().stream()
                .map(row -> new DashboardTopCareerItemResponse(
                        row.get("careerCode", String.class),
                        row.get("careerName", String.class),
                        row.get("successfulAccesses", Long.class),
                        row.get("failedAccesses", Long.class),
                        row.get("totalAccesses", Long.class)
                ))
                .toList();
    }

    @Override
    public DashboardStudentAccessSummaryResponse fetchStudentAccessSummary(BaseAccessQueryFilter filter) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Tuple> query = cb.createTupleQuery();
        Root<ElibroAccessLog> root = query.from(ElibroAccessLog.class);
        Join<ElibroAccessLog, Student> studentJoin = root.join("student", JoinType.INNER);
        Join<Student, Career> careerJoin = studentJoin.join("career", JoinType.INNER);

        Expression<Long> totalExpr = cb.count(root);
        Expression<Long> successfulExpr = cb.sum(cb.<Long>selectCase()
                .when(cb.equal(root.get("result"), ElibroAccessResult.SUCCESS), 1L)
                .otherwise(0L));
        Expression<Long> failedExpr = cb.sum(cb.<Long>selectCase()
                .when(root.get("result").in(failedResults()), 1L)
                .otherwise(0L));
        Expression<Instant> lastAccessExpr = cb.greatest(root.get("occurredAt").as(Instant.class));
        Expression<Instant> lastSuccessfulExpr = cb.greatest(cb.<Instant>selectCase()
                .when(cb.equal(root.get("result"), ElibroAccessResult.SUCCESS), root.get("occurredAt").as(Instant.class))
                .otherwise((Instant) null));
        Expression<Instant> lastFailedExpr = cb.greatest(cb.<Instant>selectCase()
                .when(root.get("result").in(failedResults()), root.get("occurredAt").as(Instant.class))
                .otherwise((Instant) null));

        query.multiselect(
                studentJoin.get("id").alias("studentId"),
                studentJoin.get("name").alias("name"),
                studentJoin.get("enrollmentId").alias("enrollmentId"),
                careerJoin.get("code").alias("careerCode"),
                careerJoin.get("name").alias("careerName"),
                totalExpr.alias("totalAccesses"),
                successfulExpr.alias("successfulAccesses"),
                failedExpr.alias("failedAccesses"),
                lastAccessExpr.alias("lastAccessAt"),
                lastSuccessfulExpr.alias("lastSuccessfulAccessAt"),
                lastFailedExpr.alias("lastFailedAccessAt")
        );
        query.where(accessPredicates(cb, root, studentJoin, filter).toArray(Predicate[]::new));
        query.groupBy(studentJoin.get("id"), studentJoin.get("name"), studentJoin.get("enrollmentId"), careerJoin.get("code"), careerJoin.get("name"));

        Tuple row = entityManager.createQuery(query).getSingleResult();
        long total = row.get("totalAccesses", Long.class);
        long successful = row.get("successfulAccesses", Long.class);
        long failed = row.get("failedAccesses", Long.class);
        double successRate = total == 0L ? 0.0 : (successful * 100.0) / total;

        return new DashboardStudentAccessSummaryResponse(
                row.get("studentId", UUID.class),
                row.get("name", String.class),
                row.get("enrollmentId", String.class),
                row.get("careerCode", String.class),
                row.get("careerName", String.class),
                total,
                successful,
                failed,
                successRate,
                row.get("lastAccessAt", Instant.class),
                row.get("lastSuccessfulAccessAt", Instant.class),
                row.get("lastFailedAccessAt", Instant.class)
        );
    }

    @Override
    public DashboardStudentActivityTableResponse fetchStudentActivity(BaseAccessQueryFilter filter, int page, int size) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();

        CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
        Root<ElibroAccessLog> countRoot = countQuery.from(ElibroAccessLog.class);
        Join<ElibroAccessLog, Student> countStudentJoin = countRoot.join("student", JoinType.INNER);
        countQuery.select(cb.count(countRoot));
        countQuery.where(accessPredicates(cb, countRoot, countStudentJoin, filter).toArray(Predicate[]::new));
        long totalElements = entityManager.createQuery(countQuery).getSingleResult();

        CriteriaQuery<Tuple> query = cb.createTupleQuery();
        Root<ElibroAccessLog> root = query.from(ElibroAccessLog.class);
        Join<ElibroAccessLog, Student> studentJoin = root.join("student", JoinType.INNER);
        query.multiselect(
                root.get("id").alias("accessLogId"),
                root.get("occurredAt").alias("occurredAt"),
                root.get("result").alias("result"),
                root.get("latencyMs").alias("latencyMs"),
                root.get("channelNameSnapshot").alias("channelName"),
                root.get("requestId").alias("requestId"),
                root.get("providerErrorCode").alias("providerErrorCode"),
                root.get("errorCode").alias("errorCode")
        );
        query.where(accessPredicates(cb, root, studentJoin, filter).toArray(Predicate[]::new));
        query.orderBy(cb.desc(root.get("occurredAt")));

        TypedQuery<Tuple> typedQuery = entityManager.createQuery(query);
        typedQuery.setFirstResult(page * size);
        typedQuery.setMaxResults(size);

        List<DashboardStudentActivityItemResponse> items = typedQuery.getResultList().stream()
                .map(row -> new DashboardStudentActivityItemResponse(
                        row.get("accessLogId", UUID.class),
                        row.get("occurredAt", Instant.class),
                        row.get("result", ElibroAccessResult.class).name(),
                        row.get("latencyMs", Long.class),
                        row.get("channelName", String.class),
                        row.get("requestId", String.class),
                        row.get("providerErrorCode", String.class),
                        row.get("errorCode", String.class)
                ))
                .toList();

        return new DashboardStudentActivityTableResponse(page, size, totalElements, items);
    }

    private long countStudents(BaseAccessQueryFilter filter, StudentStatus status) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Long> query = cb.createQuery(Long.class);
        Root<Student> root = query.from(Student.class);
        List<Predicate> predicates = new ArrayList<>();
        if (filter.studentId() != null) {
            predicates.add(cb.equal(root.get("id"), filter.studentId()));
        }
        if (filter.hasCareerFilter()) {
            predicates.add(root.get("career").get("id").in(filter.careerIds()));
        }
        if (status != null) {
            predicates.add(cb.equal(root.get("status"), status));
        }
        query.select(cb.count(root)).where(predicates.toArray(Predicate[]::new));
        return entityManager.createQuery(query).getSingleResult();
    }

    private long countLogs(BaseAccessQueryFilter filter, Set<ElibroAccessResult> requestedResults, boolean distinctStudents) {
        Set<ElibroAccessResult> effectiveResults = combineResults(filter, requestedResults);
        if (requestedResults != null && requestedResults.isEmpty()) {
            return 0L;
        }
        if (effectiveResults != null && effectiveResults.isEmpty()) {
            return 0L;
        }

        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Long> query = cb.createQuery(Long.class);
        Root<ElibroAccessLog> root = query.from(ElibroAccessLog.class);
        Join<ElibroAccessLog, Student> studentJoin = root.join("student", JoinType.LEFT);
        List<Predicate> predicates = accessPredicates(cb, root, studentJoin, filter);
        if (effectiveResults != null && !effectiveResults.isEmpty()) {
            predicates.add(root.get("result").in(effectiveResults));
        }
        query.select(distinctStudents ? cb.countDistinct(studentJoin.get("id")) : cb.count(root));
        query.where(predicates.toArray(Predicate[]::new));
        return entityManager.createQuery(query).getSingleResult();
    }

    private Instant findLastAccessAt(BaseAccessQueryFilter filter, Set<ElibroAccessResult> requestedResults) {
        Set<ElibroAccessResult> effectiveResults = combineResults(filter, requestedResults);
        if (effectiveResults != null && effectiveResults.isEmpty()) {
            return null;
        }
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Instant> query = cb.createQuery(Instant.class);
        Root<ElibroAccessLog> root = query.from(ElibroAccessLog.class);
        Join<ElibroAccessLog, Student> studentJoin = root.join("student", JoinType.LEFT);
        List<Predicate> predicates = accessPredicates(cb, root, studentJoin, filter);
        if (effectiveResults != null && !effectiveResults.isEmpty()) {
            predicates.add(root.get("result").in(effectiveResults));
        }
        query.select(cb.greatest(root.get("occurredAt").as(Instant.class)));
        query.where(predicates.toArray(Predicate[]::new));
        return entityManager.createQuery(query).getSingleResult();
    }

    private List<Predicate> accessPredicates(
            CriteriaBuilder cb,
            Root<ElibroAccessLog> root,
            Join<ElibroAccessLog, Student> studentJoin,
            BaseAccessQueryFilter filter
    ) {
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.greaterThanOrEqualTo(root.get("occurredAt"), filter.effectiveDateFrom()));
        predicates.add(cb.lessThanOrEqualTo(root.get("occurredAt"), filter.effectiveDateTo()));
        if (filter.studentId() != null) {
            predicates.add(cb.equal(studentJoin.get("id"), filter.studentId()));
        }
        if (filter.hasCareerFilter()) {
            predicates.add(studentJoin.get("career").get("id").in(filter.careerIds()));
        }
        if (filter.hasResultFilter()) {
            predicates.add(root.get("result").in(filter.resolvedAccessResults()));
        }
        return predicates;
    }

    private Set<ElibroAccessResult> combineResults(BaseAccessQueryFilter filter, Set<ElibroAccessResult> requestedResults) {
        if (requestedResults == null) {
            return filter.hasResultFilter() ? filter.resolvedAccessResults() : null;
        }
        if (!filter.hasResultFilter()) {
            return requestedResults;
        }
        Set<ElibroAccessResult> intersection = new java.util.HashSet<>(filter.resolvedAccessResults());
        intersection.retainAll(requestedResults);
        return intersection;
    }

    private Set<ElibroAccessResult> failedResults() {
        return Set.of(
                ElibroAccessResult.FAILED_STUDENT_NOT_FOUND,
                ElibroAccessResult.FAILED_STUDENT_INACTIVE,
                ElibroAccessResult.FAILED_ACCOUNT_LOCKED,
                ElibroAccessResult.FAILED_ELIBRO_CONFIG,
                ElibroAccessResult.FAILED_NEXT_URL_VALIDATION,
                ElibroAccessResult.FAILED_ELIBRO_API,
                ElibroAccessResult.FAILED_ELIBRO_TIMEOUT,
                ElibroAccessResult.FAILED_INTERNAL_ERROR
        );
    }
}
