package mx.edu.utez.server.modules.dashboard.repository;

import mx.edu.utez.server.modules.logs.access.entity.AccessLog;
import mx.edu.utez.server.shared.enums.AccessResult;
import mx.edu.utez.server.shared.enums.StudentStatus;
import java.sql.Date;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DashboardMetricsRepository extends JpaRepository<AccessLog, UUID> {

    @Query("""
            select count(a.id)
            from AccessLog a
            left join a.student s
            where a.occurredAt >= :dateFrom
              and a.occurredAt <= :dateTo
              and a.result = mx.edu.utez.server.shared.enums.AccessResult.SUCCESS
              and (:careerId is null or (s is not null and s.career.id = :careerId))
              and (:careerCode is null or (s is not null and lower(s.career.code) = lower(:careerCode)))
              and (:studentStatus is null or (s is not null and s.status = :studentStatus))
            """)
    long countSuccessfulAccesses(
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            @Param("careerId") UUID careerId,
            @Param("careerCode") String careerCode,
            @Param("studentStatus") StudentStatus studentStatus
    );

    @Query("""
            select count(a.id)
            from AccessLog a
            left join a.student s
            where a.occurredAt >= :dateFrom
              and a.occurredAt <= :dateTo
              and a.result <> mx.edu.utez.server.shared.enums.AccessResult.SUCCESS
              and (:careerId is null or (s is not null and s.career.id = :careerId))
              and (:careerCode is null or (s is not null and lower(s.career.code) = lower(:careerCode)))
              and (:studentStatus is null or (s is not null and s.status = :studentStatus))
            """)
    long countFailedAccesses(
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            @Param("careerId") UUID careerId,
            @Param("careerCode") String careerCode,
            @Param("studentStatus") StudentStatus studentStatus
    );

    @Query("""
            select count(distinct s.id)
            from AccessLog a
            join a.student s
            where a.occurredAt >= :dateFrom
              and a.occurredAt <= :dateTo
              and a.result = mx.edu.utez.server.shared.enums.AccessResult.SUCCESS
              and (:careerId is null or s.career.id = :careerId)
              and (:careerCode is null or lower(s.career.code) = lower(:careerCode))
              and (:studentStatus is null or s.status = :studentStatus)
            """)
    long countUniqueStudentsWithSuccessfulAccess(
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            @Param("careerId") UUID careerId,
            @Param("careerCode") String careerCode,
            @Param("studentStatus") StudentStatus studentStatus
    );

    @Query("""
            select function('date', a.occurredAt) as day,
                   a.result as result,
                   count(a.id) as total
            from AccessLog a
            left join a.student s
            where a.occurredAt >= :dateFrom
              and a.occurredAt <= :dateTo
              and (:careerId is null or (s is not null and s.career.id = :careerId))
              and (:careerCode is null or (s is not null and lower(s.career.code) = lower(:careerCode)))
              and (:studentStatus is null or (s is not null and s.status = :studentStatus))
              and (:result is null or a.result = :result)
            group by function('date', a.occurredAt), a.result
            order by function('date', a.occurredAt) asc
            """)
    List<DailyResultCountProjection> findDailyAccessCounts(
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            @Param("careerId") UUID careerId,
            @Param("careerCode") String careerCode,
            @Param("studentStatus") StudentStatus studentStatus,
            @Param("result") AccessResult result
    );

    @Query("""
            select s.id as studentId,
                   s.name as name,
                   s.enrollmentId as enrollmentId,
                   s.career.name as career,
                   count(a.id) as successfulAccesses
            from AccessLog a
            join a.student s
            where a.occurredAt >= :dateFrom
              and a.occurredAt <= :dateTo
              and a.result = mx.edu.utez.server.shared.enums.AccessResult.SUCCESS
              and (:careerId is null or s.career.id = :careerId)
              and (:careerCode is null or lower(s.career.code) = lower(:careerCode))
              and (:studentStatus is null or s.status = :studentStatus)
            group by s.id, s.name, s.enrollmentId, s.career.name
            order by count(a.id) desc, s.name asc
            """)
    Page<TopStudentProjection> findTopStudentsDesc(
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            @Param("careerId") UUID careerId,
            @Param("careerCode") String careerCode,
            @Param("studentStatus") StudentStatus studentStatus,
            Pageable pageable
    );

    @Query("""
            select s.id as studentId,
                   s.name as name,
                   s.enrollmentId as enrollmentId,
                   s.career.name as career,
                   count(a.id) as successfulAccesses
            from AccessLog a
            join a.student s
            where a.occurredAt >= :dateFrom
              and a.occurredAt <= :dateTo
              and a.result = mx.edu.utez.server.shared.enums.AccessResult.SUCCESS
              and (:careerId is null or s.career.id = :careerId)
              and (:careerCode is null or lower(s.career.code) = lower(:careerCode))
              and (:studentStatus is null or s.status = :studentStatus)
            group by s.id, s.name, s.enrollmentId, s.career.name
            order by count(a.id) asc, s.name asc
            """)
    Page<TopStudentProjection> findTopStudentsAsc(
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            @Param("careerId") UUID careerId,
            @Param("careerCode") String careerCode,
            @Param("studentStatus") StudentStatus studentStatus,
            Pageable pageable
    );

    interface DailyResultCountProjection {
        Date getDay();
        AccessResult getResult();
        long getTotal();
    }

    interface TopStudentProjection {
        UUID getStudentId();
        String getName();
        String getEnrollmentId();
        String getCareer();
        long getSuccessfulAccesses();
    }
}
