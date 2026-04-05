package mx.edu.utez.server.modules.reports.repository;

import mx.edu.utez.server.modules.logs.access.entity.AccessLog;
import mx.edu.utez.server.shared.enums.AccessResult;
import mx.edu.utez.server.shared.enums.StudentStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReportMetricsRepository extends JpaRepository<AccessLog, UUID> {

    @Query("""
            select s.career.name as career, count(a.id) as total
            from AccessLog a
            join a.student s
            where a.occurredAt >= :dateFrom
              and a.occurredAt <= :dateTo
              and (:result is null or a.result = :result)
              and (:careerId is null or s.career.id = :careerId)
              and (:careerCode is null or lower(s.career.code) = lower(:careerCode))
              and (:studentStatus is null or s.status = :studentStatus)
            group by s.career.name
            order by count(a.id) desc
            """)
    List<CareerCountProjection> findTopCareers(
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            @Param("result") AccessResult result,
            @Param("careerId") UUID careerId,
            @Param("careerCode") String careerCode,
            @Param("studentStatus") StudentStatus studentStatus,
            Pageable pageable
    );

    @Query("""
            select a.result as result, count(a.id) as total
            from AccessLog a
            left join a.student s
            where a.occurredAt >= :dateFrom
              and a.occurredAt <= :dateTo
              and a.result <> mx.edu.utez.server.shared.enums.AccessResult.SUCCESS
              and (:careerId is null or (s is not null and s.career.id = :careerId))
              and (:careerCode is null or (s is not null and lower(s.career.code) = lower(:careerCode)))
              and (:studentStatus is null or (s is not null and s.status = :studentStatus))
            group by a.result
            order by count(a.id) desc
            """)
    List<ErrorBreakdownProjection> findErrorBreakdown(
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            @Param("careerId") UUID careerId,
            @Param("careerCode") String careerCode,
            @Param("studentStatus") StudentStatus studentStatus
    );

    interface CareerCountProjection {
        String getCareer();
        long getTotal();
    }

    interface ErrorBreakdownProjection {
        AccessResult getResult();
        long getTotal();
    }
}
