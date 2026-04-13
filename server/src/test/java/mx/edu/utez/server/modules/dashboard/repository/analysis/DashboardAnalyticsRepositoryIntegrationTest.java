package mx.edu.utez.server.modules.dashboard.repository.analysis;

import java.time.Instant;
import java.util.Set;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.auth.repository.AdminPasswordResetTokenRepository;
import mx.edu.utez.server.modules.careers.entity.Career;
import mx.edu.utez.server.modules.careers.repository.CareerRepository;
import mx.edu.utez.server.modules.elibro.entity.ElibroAccessLog;
import mx.edu.utez.server.modules.elibro.repository.ElibroAccessLogRepository;
import mx.edu.utez.server.modules.elibro.repository.ElibroConfigRepository;
import mx.edu.utez.server.modules.elibro.repository.ElibroValidationRunRepository;
import mx.edu.utez.server.modules.logs.audit.repository.AuditLogRepository;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.repository.StudentAuthEventRepository;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.modules.dashboard.service.analysis.BaseAccessQueryFilter;
import mx.edu.utez.server.shared.enums.AdminRole;
import mx.edu.utez.server.shared.enums.AdminStatus;
import mx.edu.utez.server.shared.enums.CareerStatus;
import mx.edu.utez.server.shared.enums.ElibroAccessResult;
import mx.edu.utez.server.shared.enums.Sex;
import mx.edu.utez.server.shared.enums.StudentStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

@SpringBootTest
@ActiveProfiles("test")
class DashboardAnalyticsRepositoryIntegrationTest {

    @Autowired
    private DashboardAnalyticsRepository repository;

    @Autowired
    private ElibroAccessLogRepository accessLogRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private StudentAuthEventRepository studentAuthEventRepository;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private ElibroConfigRepository elibroConfigRepository;

    @Autowired
    private ElibroValidationRunRepository validationRunRepository;

    @Autowired
    private AdminPasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    private CareerRepository careerRepository;

    private Admin adminTi;
    private Career sistemas;
    private Student studentOne;
    private Student studentTwo;
    private Student studentThree;

    @BeforeEach
    void setUp() {
        accessLogRepository.deleteAll();
        auditLogRepository.deleteAll();
        validationRunRepository.deleteAll();
        elibroConfigRepository.deleteAll();
        studentAuthEventRepository.deleteAll();
        studentRepository.deleteAll();
        careerRepository.deleteAll();
        passwordResetTokenRepository.deleteAll();
        adminRepository.deleteAll();

        adminTi = saveAdmin("dashboard.ti@utez.edu.mx", AdminRole.ADMIN_TI);
        sistemas = saveCareer("SIS", "Sistemas");
        Career industrial = saveCareer("IND", "Industrial");
        studentOne = saveStudent("2026D001", "one@utez.edu.mx", sistemas, StudentStatus.ACTIVE);
        studentTwo = saveStudent("2026D002", "two@utez.edu.mx", sistemas, StudentStatus.INACTIVE);
        studentThree = saveStudent("2026D003", "three@utez.edu.mx", industrial, StudentStatus.ACTIVE);
        seedAccessLogs();
    }

    @Test
    void shouldReturnOverviewAnalyticsForBaseFilter() {
        BaseAccessQueryFilter filter = new BaseAccessQueryFilter(
                null,
                java.util.List.of(),
                Set.of(),
                Instant.parse("2026-03-20T00:00:00Z"),
                Instant.parse("2026-03-22T23:59:59Z")
        );

        DashboardAnalyticsRepository.OverviewKpiAggregate aggregate = repository.fetchOverviewKpis(filter);

        assertEquals(3, aggregate.totalStudents());
        assertEquals(2, aggregate.activeStudents());
        assertEquals(1, aggregate.inactiveStudents());
        assertEquals(4, aggregate.successfulAccessesInRange());
        assertEquals(2, aggregate.failedAccessesInRange());
        assertEquals(3, aggregate.uniqueStudentsWithSuccessfulAccess());
        assertEquals(3, repository.fetchTrend(filter).size());
        assertEquals(3, repository.fetchTopStudents(filter, 10, mx.edu.utez.server.modules.dashboard.dto.DashboardSortDirection.DESC).size());
        assertEquals(2, repository.fetchTopCareers(filter, 10, mx.edu.utez.server.modules.dashboard.dto.DashboardSortDirection.DESC).size());
    }

    @Test
    void shouldReturnStudentDetailAnalytics() {
        BaseAccessQueryFilter filter = new BaseAccessQueryFilter(
                studentOne.getId(),
                java.util.List.of(),
                Set.of(),
                Instant.parse("2026-03-20T00:00:00Z"),
                Instant.parse("2026-03-22T23:59:59Z")
        );

        DashboardAnalyticsRepository.OverviewKpiAggregate aggregate = repository.fetchOverviewKpis(filter);

        assertEquals(1, aggregate.totalStudents());
        assertEquals(1, aggregate.activeStudents());
        assertEquals(0, aggregate.inactiveStudents());
        assertEquals(3, repository.fetchTrend(filter).size());
        assertEquals(studentOne.getId(), repository.fetchStudentAccessSummary(filter).studentId());
        var activityTable = repository.fetchStudentActivity(
                filter,
                0,
                20,
                "occurredAt",
                mx.edu.utez.server.modules.dashboard.dto.DashboardSortDirection.DESC
        );
        assertEquals(3, activityTable.totalElements());
        assertEquals("occurredAt", activityTable.sortBy());
        assertEquals(mx.edu.utez.server.modules.dashboard.dto.DashboardSortDirection.DESC, activityTable.sortDirection());
    }

    @Test
    void shouldReturnCareerDetailAnalytics() {
        BaseAccessQueryFilter filter = new BaseAccessQueryFilter(
                null,
                java.util.List.of(sistemas.getId()),
                Set.of(),
                Instant.parse("2026-03-20T00:00:00Z"),
                Instant.parse("2026-03-22T23:59:59Z")
        );

        DashboardAnalyticsRepository.AccessKpiAggregate aggregate = repository.fetchCareerKpis(filter);

        assertEquals(4, aggregate.totalAccesses());
        assertEquals(3, aggregate.successfulAccesses());
        assertEquals(1, aggregate.failedAccesses());
        assertEquals(2, aggregate.uniqueStudentsImpacted());
        assertEquals(3, repository.fetchTrend(filter).size());

        var breakdown = repository.fetchCareerResultBreakdown(filter);
        assertEquals(2, breakdown.size());
        assertEquals("SUCCESS", breakdown.get(0).result());
        assertEquals(3, breakdown.get(0).total());

        var table = repository.fetchCareerStudents(filter, 0, 20, "totalAccesses", mx.edu.utez.server.modules.dashboard.dto.DashboardSortDirection.DESC);
        assertEquals(2, table.totalElements());
        assertEquals(2, table.items().size());
        assertEquals("totalAccesses", table.sortBy());
        assertEquals(mx.edu.utez.server.modules.dashboard.dto.DashboardSortDirection.DESC, table.sortDirection());
        assertEquals(studentOne.getId(), table.items().get(0).studentId());
        assertEquals(3, table.items().get(0).totalAccesses());
        assertFalse(table.items().isEmpty());
    }

    @Test
    void shouldApplyExplicitSortingAndPaginationForLocalTables() {
        BaseAccessQueryFilter studentFilter = new BaseAccessQueryFilter(
                studentOne.getId(),
                java.util.List.of(),
                Set.of(),
                Instant.parse("2026-03-20T00:00:00Z"),
                Instant.parse("2026-03-22T23:59:59Z")
        );
        var studentActivityTable = repository.fetchStudentActivity(
                studentFilter,
                1,
                1,
                "latencyMs",
                mx.edu.utez.server.modules.dashboard.dto.DashboardSortDirection.ASC
        );

        assertEquals(1, studentActivityTable.page());
        assertEquals(1, studentActivityTable.size());
        assertEquals("latencyMs", studentActivityTable.sortBy());
        assertEquals(mx.edu.utez.server.modules.dashboard.dto.DashboardSortDirection.ASC, studentActivityTable.sortDirection());
        assertEquals(1, studentActivityTable.items().size());

        BaseAccessQueryFilter careerFilter = new BaseAccessQueryFilter(
                null,
                java.util.List.of(sistemas.getId()),
                Set.of(),
                Instant.parse("2026-03-20T00:00:00Z"),
                Instant.parse("2026-03-22T23:59:59Z")
        );
        var careerTable = repository.fetchCareerStudents(
                careerFilter,
                0,
                1,
                "studentName",
                mx.edu.utez.server.modules.dashboard.dto.DashboardSortDirection.ASC
        );

        assertEquals(0, careerTable.page());
        assertEquals(1, careerTable.size());
        assertEquals("studentName", careerTable.sortBy());
        assertEquals(mx.edu.utez.server.modules.dashboard.dto.DashboardSortDirection.ASC, careerTable.sortDirection());
        assertEquals(1, careerTable.items().size());
        assertEquals(studentOne.getId(), careerTable.items().get(0).studentId());
    }

    @Test
    void shouldReturnStudentRankingAnalyticsWithoutTruncatingBaseUniverse() {
        BaseAccessQueryFilter filter = new BaseAccessQueryFilter(
                null,
                java.util.List.of(),
                Set.of(),
                Instant.parse("2026-03-20T00:00:00Z"),
                Instant.parse("2026-03-22T23:59:59Z")
        );

        DashboardAnalyticsRepository.AccessKpiAggregate aggregate = repository.fetchStudentRankingKpis(filter);

        assertEquals(5, aggregate.totalAccesses());
        assertEquals(4, aggregate.successfulAccesses());
        assertEquals(1, aggregate.failedAccesses());
        assertEquals(3, aggregate.uniqueStudentsImpacted());

        var breakdown = repository.fetchStudentResultBreakdown(filter);
        assertEquals(2, breakdown.size());
        assertEquals("SUCCESS", breakdown.get(0).result());
        assertEquals(4, breakdown.get(0).total());

        var ranking = repository.fetchStudentRanking(filter, 1, mx.edu.utez.server.modules.dashboard.dto.DashboardSortDirection.DESC);
        assertEquals(1, ranking.size());
        assertEquals(studentOne.getId(), ranking.get(0).studentId());
        assertEquals(3, ranking.get(0).totalAccesses());
    }

    @Test
    void shouldReturnCareerRankingAnalyticsWithoutTruncatingBaseUniverse() {
        BaseAccessQueryFilter successFilter = new BaseAccessQueryFilter(
                null,
                java.util.List.of(),
                java.util.EnumSet.of(ElibroAccessResult.SUCCESS),
                Instant.parse("2026-03-20T00:00:00Z"),
                Instant.parse("2026-03-22T23:59:59Z")
        );

        DashboardAnalyticsRepository.CareerRankingKpiAggregate aggregate = repository.fetchCareerRankingKpis(successFilter);

        assertEquals(4, aggregate.totalAccesses());
        assertEquals(4, aggregate.successfulAccesses());
        assertEquals(0, aggregate.failedAccesses());
        assertEquals(2, aggregate.uniqueCareersImpacted());

        var comparison = repository.fetchCareerComparison(successFilter);
        assertEquals(2, comparison.size());
        assertEquals("IND", comparison.get(0).careerCode());
        assertEquals("SIS", comparison.get(1).careerCode());

        var ranking = repository.fetchCareerRanking(
                successFilter,
                1,
                mx.edu.utez.server.modules.dashboard.dto.DashboardSortDirection.DESC,
                DashboardAnalyticsRepository.RankingMetric.SUCCESS
        );
        assertEquals(1, ranking.size());
        assertEquals(sistemas.getId(), ranking.get(0).careerId());
        assertEquals(3, ranking.get(0).rankingValue());
    }

    @Test
    void shouldReturnCareerRankingSplitAnalyticsWithoutTruncatingKpis() {
        BaseAccessQueryFilter allCareerFilter = new BaseAccessQueryFilter(
                null,
                java.util.List.of(),
                Set.of(),
                Instant.parse("2026-03-20T00:00:00Z"),
                Instant.parse("2026-03-22T23:59:59Z")
        );

        DashboardAnalyticsRepository.CareerRankingKpiAggregate aggregate = repository.fetchCareerRankingKpis(allCareerFilter);

        assertEquals(5, aggregate.totalAccesses());
        assertEquals(4, aggregate.successfulAccesses());
        assertEquals(1, aggregate.failedAccesses());
        assertEquals(2, aggregate.uniqueCareersImpacted());

        var successRanking = repository.fetchCareerRanking(
                allCareerFilter,
                1,
                mx.edu.utez.server.modules.dashboard.dto.DashboardSortDirection.DESC,
                DashboardAnalyticsRepository.RankingMetric.SUCCESS
        );
        var failedRanking = repository.fetchCareerRanking(
                allCareerFilter,
                1,
                mx.edu.utez.server.modules.dashboard.dto.DashboardSortDirection.DESC,
                DashboardAnalyticsRepository.RankingMetric.FAILED
        );

        assertEquals(1, successRanking.size());
        assertEquals(1, failedRanking.size());
        assertEquals(sistemas.getId(), successRanking.get(0).careerId());
        assertEquals(3, successRanking.get(0).rankingValue());
        assertEquals(sistemas.getId(), failedRanking.get(0).careerId());
        assertEquals(1, failedRanking.get(0).rankingValue());
    }

    private void seedAccessLogs() {
        saveAccessLog(studentOne, ElibroAccessResult.SUCCESS, "2026-03-20T10:00:00Z");
        saveAccessLog(studentTwo, ElibroAccessResult.SUCCESS, "2026-03-20T11:00:00Z");
        saveAccessLog(studentOne, ElibroAccessResult.SUCCESS, "2026-03-21T09:00:00Z");
        saveAccessLog(studentOne, ElibroAccessResult.FAILED_ELIBRO_API, "2026-03-21T10:00:00Z");
        saveAccessLog(studentThree, ElibroAccessResult.SUCCESS, "2026-03-22T08:00:00Z");
        saveAccessLog(null, ElibroAccessResult.FAILED_INTERNAL_ERROR, "2026-03-22T09:00:00Z");
        saveAccessLog(studentOne, ElibroAccessResult.SUCCESS, "2026-03-10T09:00:00Z");
    }

    private Admin saveAdmin(String email, AdminRole role) {
        Admin admin = new Admin();
        admin.setEmail(email);
        admin.setName("Dashboard Admin");
        admin.setLastNamePaternal(role.name());
        admin.setPasswordHash("$2a$10$123456789012345678901u2sNfJ0wYl8Bv0p5Wn4eC6zYkM8d8vS.");
        admin.setRole(role);
        admin.setStatus(AdminStatus.ACTIVE);
        return adminRepository.save(admin);
    }

    private Career saveCareer(String code, String name) {
        Career career = new Career();
        career.setCode(code);
        career.setName(name);
        career.setStatus(CareerStatus.ACTIVE);
        return careerRepository.save(career);
    }

    private Student saveStudent(String matricula, String email, Career career, StudentStatus status) {
        Student student = new Student();
        student.setEnrollmentId(matricula);
        student.setName("Student " + matricula);
        student.setLastNamePaternal("Paterno");
        student.setLastNameMaternal("Materno");
        student.setSex(Sex.MALE);
        student.setQuarter(5);
        student.setInstitutionalEmail(email);
        student.setInstitutionalEmailNormalized(email);
        student.setCareer(career);
        student.setStatus(status);
        student.setCreatedByAdmin(adminTi);
        student.setUpdatedByAdmin(adminTi);
        return studentRepository.save(student);
    }

    private void saveAccessLog(Student student, ElibroAccessResult result, String occurredAt) {
        ElibroAccessLog log = new ElibroAccessLog();
        log.setStudent(student);
        log.setAttemptedEmail(student != null ? student.getInstitutionalEmail() : "missing@utez.edu.mx");
        log.setNormalizedEmail(student != null ? student.getInstitutionalEmailNormalized() : "missing@utez.edu.mx");
        log.setResult(result);
        log.setLatencyMs(120L);
        log.setRequestId("req-" + occurredAt);
        log.setCorrelationId("corr-" + occurredAt);
        log.setOccurredAt(Instant.parse(occurredAt));
        accessLogRepository.save(log);
    }
}
