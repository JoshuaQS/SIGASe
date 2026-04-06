package mx.edu.utez.server.modules.dashboard.repository;

import mx.edu.utez.server.modules.elibro.entity.ElibroAccessLog;
import mx.edu.utez.server.shared.enums.ElibroAccessResult;
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

public interface DashboardMetricsRepository extends JpaRepository<ElibroAccessLog, UUID> {

    @Query("""
            select min(a.occurredAt)
            from ElibroAccessLog a
            left join a.student s
            where (:studentId is null or (s is not null and s.id = :studentId))
              and (:careerCodesEmpty = true or (s is not null and upper(s.career.code) in :careerCodes))
              and (:studentStatus is null or (s is not null and s.status = :studentStatus))
              and ((:accessStatus = 'ALL')
                   or (:accessStatus = 'SUCCESS' and a.result = mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS)
                   or (:accessStatus = 'FAILED' and a.result <> mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS))
            """)
    Instant findFirstAccessAtByFilters(
            @Param("studentId") UUID studentId,
            @Param("careerCodes") List<String> careerCodes,
            @Param("careerCodesEmpty") boolean careerCodesEmpty,
            @Param("studentStatus") StudentStatus studentStatus,
            @Param("accessStatus") String accessStatus
    );

    @Query("""
            select max(a.occurredAt)
            from ElibroAccessLog a
            left join a.student s
            where (:studentId is null or (s is not null and s.id = :studentId))
              and (:careerCodesEmpty = true or (s is not null and upper(s.career.code) in :careerCodes))
              and (:studentStatus is null or (s is not null and s.status = :studentStatus))
              and ((:accessStatus = 'ALL')
                   or (:accessStatus = 'SUCCESS' and a.result = mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS)
                   or (:accessStatus = 'FAILED' and a.result <> mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS))
            """)
    Instant findLastAccessAtByFilters(
            @Param("studentId") UUID studentId,
            @Param("careerCodes") List<String> careerCodes,
            @Param("careerCodesEmpty") boolean careerCodesEmpty,
            @Param("studentStatus") StudentStatus studentStatus,
            @Param("accessStatus") String accessStatus
    );

    @Query("""
            select max(a.occurredAt)
            from ElibroAccessLog a
            left join a.student s
            where a.occurredAt >= :dateFrom
              and a.occurredAt <= :dateTo
              and a.result = mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS
              and (:studentId is null or (s is not null and s.id = :studentId))
              and (:careerCodesEmpty = true or (s is not null and upper(s.career.code) in :careerCodes))
              and (:studentStatus is null or (s is not null and s.status = :studentStatus))
            """)
    Instant findLastSuccessfulAccessAt(
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            @Param("studentId") UUID studentId,
            @Param("careerCodes") List<String> careerCodes,
            @Param("careerCodesEmpty") boolean careerCodesEmpty,
            @Param("studentStatus") StudentStatus studentStatus
    );

    @Query("""
            select max(a.occurredAt)
            from ElibroAccessLog a
            left join a.student s
            where a.occurredAt >= :dateFrom
              and a.occurredAt <= :dateTo
              and a.result <> mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS
              and (:studentId is null or (s is not null and s.id = :studentId))
              and (:careerCodesEmpty = true or (s is not null and upper(s.career.code) in :careerCodes))
              and (:studentStatus is null or (s is not null and s.status = :studentStatus))
            """)
    Instant findLastFailedAccessAt(
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            @Param("studentId") UUID studentId,
            @Param("careerCodes") List<String> careerCodes,
            @Param("careerCodesEmpty") boolean careerCodesEmpty,
            @Param("studentStatus") StudentStatus studentStatus
    );

    @Query("""
            select count(a.id)
            from ElibroAccessLog a
            left join a.student s
            where a.occurredAt >= :dateFrom
              and a.occurredAt <= :dateTo              and a.result = mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS
              and (:studentId is null or (s is not null and s.id = :studentId))
              and (:careerCodesEmpty = true or (s is not null and upper(s.career.code) in :careerCodes))
              and (:studentStatus is null or (s is not null and s.status = :studentStatus))
              and ((:accessStatus = 'ALL') or (:accessStatus = 'SUCCESS'))
            """)
    long countSuccessfulAccesses(
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            @Param("studentId") UUID studentId,
            @Param("careerCodes") List<String> careerCodes,
            @Param("careerCodesEmpty") boolean careerCodesEmpty,
            @Param("studentStatus") StudentStatus studentStatus,
            @Param("accessStatus") String accessStatus
    );

    @Query("""
            select count(a.id)
            from ElibroAccessLog a
            left join a.student s
            where a.occurredAt >= :dateFrom
              and a.occurredAt <= :dateTo              and a.result <> mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS
              and (:studentId is null or (s is not null and s.id = :studentId))
              and (:careerCodesEmpty = true or (s is not null and upper(s.career.code) in :careerCodes))
              and (:studentStatus is null or (s is not null and s.status = :studentStatus))
              and ((:accessStatus = 'ALL') or (:accessStatus = 'FAILED'))
            """)
    long countFailedAccesses(
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            @Param("studentId") UUID studentId,
            @Param("careerCodes") List<String> careerCodes,
            @Param("careerCodesEmpty") boolean careerCodesEmpty,
            @Param("studentStatus") StudentStatus studentStatus,
            @Param("accessStatus") String accessStatus
    );

    @Query("""
            select count(distinct s.id)
            from ElibroAccessLog a
            join a.student s
            where a.occurredAt >= :dateFrom
              and a.occurredAt <= :dateTo              and (:studentId is null or s.id = :studentId)
              and (:careerCodesEmpty = true or upper(s.career.code) in :careerCodes)
              and (:studentStatus is null or s.status = :studentStatus)
              and ((:accessStatus = 'ALL')
                   or (:accessStatus = 'SUCCESS' and a.result = mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS)
                   or (:accessStatus = 'FAILED' and a.result <> mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS))
            """)
    long countUniqueStudentsByAccessStatus(
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            @Param("studentId") UUID studentId,
            @Param("careerCodes") List<String> careerCodes,
            @Param("careerCodesEmpty") boolean careerCodesEmpty,
            @Param("studentStatus") StudentStatus studentStatus,
            @Param("accessStatus") String accessStatus
    );

    @Query("""
            select function('date', a.occurredAt) as day,
                   a.result as result,
                   count(a.id) as total
            from ElibroAccessLog a
            left join a.student s
            where a.occurredAt >= :dateFrom
              and a.occurredAt <= :dateTo              and (:studentId is null or (s is not null and s.id = :studentId))
              and (:careerCodesEmpty = true or (s is not null and upper(s.career.code) in :careerCodes))
              and (:studentStatus is null or (s is not null and s.status = :studentStatus))
              and ((:accessStatus = 'ALL')
                   or (:accessStatus = 'SUCCESS' and a.result = mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS)
                   or (:accessStatus = 'FAILED' and a.result <> mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS))
            group by function('date', a.occurredAt), a.result
            order by function('date', a.occurredAt) asc
            """)
    List<DailyResultCountProjection> findDailyAccessCounts(
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            @Param("studentId") UUID studentId,
            @Param("careerCodes") List<String> careerCodes,
            @Param("careerCodesEmpty") boolean careerCodesEmpty,
            @Param("studentStatus") StudentStatus studentStatus,
            @Param("accessStatus") String accessStatus
    );

    @Query("""
            select s.id as studentId,
                   s.name as name,
                   s.enrollmentId as enrollmentId,
                   s.career.code as careerCode,
                   s.career.name as careerName,
                   sum(case when a.result = mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) as successfulAccesses,
                   sum(case when a.result <> mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) as failedAccesses,
                   count(a.id) as totalAccesses
            from ElibroAccessLog a
            join a.student s
            where a.occurredAt >= :dateFrom
              and a.occurredAt <= :dateTo              and (:studentId is null or s.id = :studentId)
              and (:careerCodesEmpty = true or upper(s.career.code) in :careerCodes)
              and (:studentStatus is null or s.status = :studentStatus)
            group by s.id, s.name, s.enrollmentId, s.career.code, s.career.name
            order by count(a.id) desc, s.name asc
            """)
    Page<TopStudentProjection> findTopStudentsAllDesc(
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            @Param("studentId") UUID studentId,
            @Param("careerCodes") List<String> careerCodes,
            @Param("careerCodesEmpty") boolean careerCodesEmpty,
            @Param("studentStatus") StudentStatus studentStatus,
            Pageable pageable
    );

    @Query("""
            select s.id as studentId,
                   s.name as name,
                   s.enrollmentId as enrollmentId,
                   s.career.code as careerCode,
                   s.career.name as careerName,
                   sum(case when a.result = mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) as successfulAccesses,
                   sum(case when a.result <> mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) as failedAccesses,
                   count(a.id) as totalAccesses
            from ElibroAccessLog a
            join a.student s
            where a.occurredAt >= :dateFrom
              and a.occurredAt <= :dateTo              and (:studentId is null or s.id = :studentId)
              and (:careerCodesEmpty = true or upper(s.career.code) in :careerCodes)
              and (:studentStatus is null or s.status = :studentStatus)
            group by s.id, s.name, s.enrollmentId, s.career.code, s.career.name
            order by count(a.id) asc, s.name asc
            """)
    Page<TopStudentProjection> findTopStudentsAllAsc(
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            @Param("studentId") UUID studentId,
            @Param("careerCodes") List<String> careerCodes,
            @Param("careerCodesEmpty") boolean careerCodesEmpty,
            @Param("studentStatus") StudentStatus studentStatus,
            Pageable pageable
    );

    @Query("""
            select s.id as studentId,
                   s.name as name,
                   s.enrollmentId as enrollmentId,
                   s.career.code as careerCode,
                   s.career.name as careerName,
                   sum(case when a.result = mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) as successfulAccesses,
                   sum(case when a.result <> mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) as failedAccesses,
                   count(a.id) as totalAccesses
            from ElibroAccessLog a
            join a.student s
            where a.occurredAt >= :dateFrom
              and a.occurredAt <= :dateTo              and (:studentId is null or s.id = :studentId)
              and (:careerCodesEmpty = true or upper(s.career.code) in :careerCodes)
              and (:studentStatus is null or s.status = :studentStatus)
            group by s.id, s.name, s.enrollmentId, s.career.code, s.career.name
            order by sum(case when a.result = mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) desc, s.name asc
            """)
    Page<TopStudentProjection> findTopStudentsSuccessDesc(
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            @Param("studentId") UUID studentId,
            @Param("careerCodes") List<String> careerCodes,
            @Param("careerCodesEmpty") boolean careerCodesEmpty,
            @Param("studentStatus") StudentStatus studentStatus,
            Pageable pageable
    );

    @Query("""
            select s.id as studentId,
                   s.name as name,
                   s.enrollmentId as enrollmentId,
                   s.career.code as careerCode,
                   s.career.name as careerName,
                   sum(case when a.result = mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) as successfulAccesses,
                   sum(case when a.result <> mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) as failedAccesses,
                   count(a.id) as totalAccesses
            from ElibroAccessLog a
            join a.student s
            where a.occurredAt >= :dateFrom
              and a.occurredAt <= :dateTo              and (:studentId is null or s.id = :studentId)
              and (:careerCodesEmpty = true or upper(s.career.code) in :careerCodes)
              and (:studentStatus is null or s.status = :studentStatus)
            group by s.id, s.name, s.enrollmentId, s.career.code, s.career.name
            order by sum(case when a.result = mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) asc, s.name asc
            """)
    Page<TopStudentProjection> findTopStudentsSuccessAsc(
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            @Param("studentId") UUID studentId,
            @Param("careerCodes") List<String> careerCodes,
            @Param("careerCodesEmpty") boolean careerCodesEmpty,
            @Param("studentStatus") StudentStatus studentStatus,
            Pageable pageable
    );

    @Query("""
            select s.id as studentId,
                   s.name as name,
                   s.enrollmentId as enrollmentId,
                   s.career.code as careerCode,
                   s.career.name as careerName,
                   sum(case when a.result = mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) as successfulAccesses,
                   sum(case when a.result <> mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) as failedAccesses,
                   count(a.id) as totalAccesses
            from ElibroAccessLog a
            join a.student s
            where a.occurredAt >= :dateFrom
              and a.occurredAt <= :dateTo              and (:studentId is null or s.id = :studentId)
              and (:careerCodesEmpty = true or upper(s.career.code) in :careerCodes)
              and (:studentStatus is null or s.status = :studentStatus)
            group by s.id, s.name, s.enrollmentId, s.career.code, s.career.name
            order by sum(case when a.result <> mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) desc, s.name asc
            """)
    Page<TopStudentProjection> findTopStudentsFailedDesc(
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            @Param("studentId") UUID studentId,
            @Param("careerCodes") List<String> careerCodes,
            @Param("careerCodesEmpty") boolean careerCodesEmpty,
            @Param("studentStatus") StudentStatus studentStatus,
            Pageable pageable
    );

    @Query("""
            select s.id as studentId,
                   s.name as name,
                   s.enrollmentId as enrollmentId,
                   s.career.code as careerCode,
                   s.career.name as careerName,
                   sum(case when a.result = mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) as successfulAccesses,
                   sum(case when a.result <> mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) as failedAccesses,
                   count(a.id) as totalAccesses
            from ElibroAccessLog a
            join a.student s
            where a.occurredAt >= :dateFrom
              and a.occurredAt <= :dateTo              and (:studentId is null or s.id = :studentId)
              and (:careerCodesEmpty = true or upper(s.career.code) in :careerCodes)
              and (:studentStatus is null or s.status = :studentStatus)
            group by s.id, s.name, s.enrollmentId, s.career.code, s.career.name
            order by sum(case when a.result <> mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) asc, s.name asc
            """)
    Page<TopStudentProjection> findTopStudentsFailedAsc(
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            @Param("studentId") UUID studentId,
            @Param("careerCodes") List<String> careerCodes,
            @Param("careerCodesEmpty") boolean careerCodesEmpty,
            @Param("studentStatus") StudentStatus studentStatus,
            Pageable pageable
    );

    @Query("""
            select s.career.code as careerCode,
                   s.career.name as careerName,
                   sum(case when a.result = mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) as successfulAccesses,
                   sum(case when a.result <> mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) as failedAccesses,
                   count(a.id) as totalAccesses
            from ElibroAccessLog a
            join a.student s
            where a.occurredAt >= :dateFrom
              and a.occurredAt <= :dateTo              and (:studentId is null or s.id = :studentId)
              and (:careerCodesEmpty = true or upper(s.career.code) in :careerCodes)
              and (:studentStatus is null or s.status = :studentStatus)
            group by s.career.code, s.career.name
            order by count(a.id) desc, s.career.code asc
            """)
    Page<TopCareerProjection> findTopCareersAllDesc(
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            @Param("studentId") UUID studentId,
            @Param("careerCodes") List<String> careerCodes,
            @Param("careerCodesEmpty") boolean careerCodesEmpty,
            @Param("studentStatus") StudentStatus studentStatus,
            Pageable pageable
    );

    @Query("""
            select s.career.code as careerCode,
                   s.career.name as careerName,
                   sum(case when a.result = mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) as successfulAccesses,
                   sum(case when a.result <> mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) as failedAccesses,
                   count(a.id) as totalAccesses
            from ElibroAccessLog a
            join a.student s
            where a.occurredAt >= :dateFrom
              and a.occurredAt <= :dateTo              and (:studentId is null or s.id = :studentId)
              and (:careerCodesEmpty = true or upper(s.career.code) in :careerCodes)
              and (:studentStatus is null or s.status = :studentStatus)
            group by s.career.code, s.career.name
            order by count(a.id) asc, s.career.code asc
            """)
    Page<TopCareerProjection> findTopCareersAllAsc(
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            @Param("studentId") UUID studentId,
            @Param("careerCodes") List<String> careerCodes,
            @Param("careerCodesEmpty") boolean careerCodesEmpty,
            @Param("studentStatus") StudentStatus studentStatus,
            Pageable pageable
    );

    @Query("""
            select s.career.code as careerCode,
                   s.career.name as careerName,
                   sum(case when a.result = mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) as successfulAccesses,
                   sum(case when a.result <> mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) as failedAccesses,
                   count(a.id) as totalAccesses
            from ElibroAccessLog a
            join a.student s
            where a.occurredAt >= :dateFrom
              and a.occurredAt <= :dateTo              and (:studentId is null or s.id = :studentId)
              and (:careerCodesEmpty = true or upper(s.career.code) in :careerCodes)
              and (:studentStatus is null or s.status = :studentStatus)
            group by s.career.code, s.career.name
            order by sum(case when a.result = mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) desc, s.career.code asc
            """)
    Page<TopCareerProjection> findTopCareersSuccessDesc(
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            @Param("studentId") UUID studentId,
            @Param("careerCodes") List<String> careerCodes,
            @Param("careerCodesEmpty") boolean careerCodesEmpty,
            @Param("studentStatus") StudentStatus studentStatus,
            Pageable pageable
    );

    @Query("""
            select s.career.code as careerCode,
                   s.career.name as careerName,
                   sum(case when a.result = mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) as successfulAccesses,
                   sum(case when a.result <> mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) as failedAccesses,
                   count(a.id) as totalAccesses
            from ElibroAccessLog a
            join a.student s
            where a.occurredAt >= :dateFrom
              and a.occurredAt <= :dateTo              and (:studentId is null or s.id = :studentId)
              and (:careerCodesEmpty = true or upper(s.career.code) in :careerCodes)
              and (:studentStatus is null or s.status = :studentStatus)
            group by s.career.code, s.career.name
            order by sum(case when a.result = mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) asc, s.career.code asc
            """)
    Page<TopCareerProjection> findTopCareersSuccessAsc(
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            @Param("studentId") UUID studentId,
            @Param("careerCodes") List<String> careerCodes,
            @Param("careerCodesEmpty") boolean careerCodesEmpty,
            @Param("studentStatus") StudentStatus studentStatus,
            Pageable pageable
    );

    @Query("""
            select s.career.code as careerCode,
                   s.career.name as careerName,
                   sum(case when a.result = mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) as successfulAccesses,
                   sum(case when a.result <> mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) as failedAccesses,
                   count(a.id) as totalAccesses
            from ElibroAccessLog a
            join a.student s
            where a.occurredAt >= :dateFrom
              and a.occurredAt <= :dateTo              and (:studentId is null or s.id = :studentId)
              and (:careerCodesEmpty = true or upper(s.career.code) in :careerCodes)
              and (:studentStatus is null or s.status = :studentStatus)
            group by s.career.code, s.career.name
            order by sum(case when a.result <> mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) desc, s.career.code asc
            """)
    Page<TopCareerProjection> findTopCareersFailedDesc(
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            @Param("studentId") UUID studentId,
            @Param("careerCodes") List<String> careerCodes,
            @Param("careerCodesEmpty") boolean careerCodesEmpty,
            @Param("studentStatus") StudentStatus studentStatus,
            Pageable pageable
    );

    @Query("""
            select s.career.code as careerCode,
                   s.career.name as careerName,
                   sum(case when a.result = mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) as successfulAccesses,
                   sum(case when a.result <> mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) as failedAccesses,
                   count(a.id) as totalAccesses
            from ElibroAccessLog a
            join a.student s
            where a.occurredAt >= :dateFrom
              and a.occurredAt <= :dateTo              and (:studentId is null or s.id = :studentId)
              and (:careerCodesEmpty = true or upper(s.career.code) in :careerCodes)
              and (:studentStatus is null or s.status = :studentStatus)
            group by s.career.code, s.career.name
            order by sum(case when a.result <> mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS then 1 else 0 end) asc, s.career.code asc
            """)
    Page<TopCareerProjection> findTopCareersFailedAsc(
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            @Param("studentId") UUID studentId,
            @Param("careerCodes") List<String> careerCodes,
            @Param("careerCodesEmpty") boolean careerCodesEmpty,
            @Param("studentStatus") StudentStatus studentStatus,
            Pageable pageable
    );

    interface DailyResultCountProjection {
        Date getDay();
        ElibroAccessResult getResult();
        long getTotal();
    }

    interface TopStudentProjection {
        UUID getStudentId();
        String getName();
        String getEnrollmentId();
        String getCareerCode();
        String getCareerName();
        long getSuccessfulAccesses();
        long getFailedAccesses();
        long getTotalAccesses();
    }

    interface TopCareerProjection {
        String getCareerCode();
        String getCareerName();
        long getSuccessfulAccesses();
        long getFailedAccesses();
        long getTotalAccesses();
    }

    default long countSuccessfulAccesses(
            Instant dateFrom,
            Instant dateTo,
            UUID careerId,
            String careerCode,
            StudentStatus studentStatus
    ) {
        List<String> codes = careerCode == null || careerCode.isBlank()
                ? List.of()
                : List.of(careerCode.trim().toUpperCase());
        return countSuccessfulAccesses(
                dateFrom, dateTo, null, codes, codes.isEmpty(), studentStatus, "ALL"
        );
    }

    default long countFailedAccesses(
            Instant dateFrom,
            Instant dateTo,
            UUID careerId,
            String careerCode,
            StudentStatus studentStatus
    ) {
        List<String> codes = careerCode == null || careerCode.isBlank()
                ? List.of()
                : List.of(careerCode.trim().toUpperCase());
        return countFailedAccesses(
                dateFrom, dateTo, null, codes, codes.isEmpty(), studentStatus, "ALL"
        );
    }

    default long countUniqueStudentsWithSuccessfulAccess(
            Instant dateFrom,
            Instant dateTo,
            UUID careerId,
            String careerCode,
            StudentStatus studentStatus
    ) {
        List<String> codes = careerCode == null || careerCode.isBlank()
                ? List.of()
                : List.of(careerCode.trim().toUpperCase());
        return countUniqueStudentsByAccessStatus(
                dateFrom, dateTo, null, codes, codes.isEmpty(), studentStatus, "SUCCESS"
        );
    }

    default List<DailyResultCountProjection> findDailyAccessCounts(
            Instant dateFrom,
            Instant dateTo,
            UUID careerId,
            String careerCode,
            StudentStatus studentStatus,
            ElibroAccessResult result
    ) {
        List<String> codes = careerCode == null || careerCode.isBlank()
                ? List.of()
                : List.of(careerCode.trim().toUpperCase());
        String accessStatus = result == null ? "ALL" : result == ElibroAccessResult.SUCCESS ? "SUCCESS" : "FAILED";
        return findDailyAccessCounts(
                dateFrom, dateTo, null, codes, codes.isEmpty(), studentStatus, accessStatus
        );
    }

    default Page<TopStudentProjection> findTopStudentsDesc(
            Instant dateFrom,
            Instant dateTo,
            UUID careerId,
            String careerCode,
            StudentStatus studentStatus,
            Pageable pageable
    ) {
        List<String> codes = careerCode == null || careerCode.isBlank()
                ? List.of()
                : List.of(careerCode.trim().toUpperCase());
        return findTopStudentsSuccessDesc(
                dateFrom, dateTo, null, codes, codes.isEmpty(), studentStatus, pageable
        );
    }
}
