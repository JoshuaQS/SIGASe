package mx.edu.utez.server.modules.elibro.service;

import mx.edu.utez.server.modules.elibro.dto.StudentPortalSummaryResponse;
import mx.edu.utez.server.modules.logs.access.entity.AccessLog;
import mx.edu.utez.server.modules.logs.access.repository.AccessLogRepository;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.shared.enums.AccessResult;
import mx.edu.utez.server.shared.enums.StudentStatus;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudentPortalSummaryService {

    private static final String ELIBRO_PROVIDER_NAME = "ELIBRO";

    private final StudentRepository studentRepository;
    private final AccessLogRepository accessLogRepository;

    public StudentPortalSummaryService(
            StudentRepository studentRepository,
            AccessLogRepository accessLogRepository
    ) {
        this.studentRepository = studentRepository;
        this.accessLogRepository = accessLogRepository;
    }

    @Transactional(readOnly = true)
    public StudentPortalSummaryResponse getSummary(UUID studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED, "Sesión inválida."));

        Instant now = Instant.now();
        Instant fromLast7Days = now.minus(7, ChronoUnit.DAYS);

        long accessesLast7Days = accessLogRepository.countByStudent_IdAndProviderNameAndOccurredAtGreaterThanEqualAndResult(
                student.getId(),
                ELIBRO_PROVIDER_NAME,
                fromLast7Days,
                AccessResult.SUCCESS
        );
        long failedAttemptsLast7Days = accessLogRepository.countByStudent_IdAndProviderNameAndOccurredAtGreaterThanEqualAndResultNot(
                student.getId(),
                ELIBRO_PROVIDER_NAME,
                fromLast7Days,
                AccessResult.SUCCESS
        );

        Instant lastAccess = accessLogRepository.findTopByStudent_IdAndProviderNameAndResultOrderByOccurredAtDesc(
                student.getId(),
                ELIBRO_PROVIDER_NAME,
                AccessResult.SUCCESS
        ).map(AccessLog::getOccurredAt).orElse(null);

        int streakDays = calculateAccessStreak(student.getId());
        boolean active = student.getStatus() == StudentStatus.ACTIVE;
        String blockedMessage = active ? null : "Tu cuenta está inactiva. Contacta al administrador de biblioteca.";

        return new StudentPortalSummaryResponse(
                new StudentPortalSummaryResponse.PersonalInfo(
                        student.getName(),
                        student.getEnrollmentId(),
                        student.getCareer() != null ? student.getCareer().getName() : null,
                        student.getStatus().name()
                ),
                new StudentPortalSummaryResponse.AccountStatus(
                        active,
                        active ? "ACTIVE" : "INACTIVE",
                        blockedMessage
                ),
                new StudentPortalSummaryResponse.AccessMetrics(
                        accessesLast7Days,
                        failedAttemptsLast7Days,
                        lastAccess == null ? null : lastAccess.toString(),
                        streakDays
                ),
                new StudentPortalSummaryResponse.Cta(
                        active,
                        active ? null : "STUDENT_INACTIVE"
                )
        );
    }

    private int calculateAccessStreak(UUID studentId) {
        List<AccessLog> recentSuccessLogs = accessLogRepository.findTop365ByStudent_IdAndProviderNameAndResultOrderByOccurredAtDesc(
                studentId,
                ELIBRO_PROVIDER_NAME,
                AccessResult.SUCCESS
        );
        if (recentSuccessLogs.isEmpty()) {
            return 0;
        }

        Set<LocalDate> accessDays = new HashSet<>();
        for (AccessLog accessLog : recentSuccessLogs) {
            accessDays.add(accessLog.getOccurredAt().atZone(ZoneOffset.UTC).toLocalDate());
        }

        LocalDate cursor = recentSuccessLogs.get(0).getOccurredAt().atZone(ZoneOffset.UTC).toLocalDate();
        int streak = 0;
        while (accessDays.contains(cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }
        return streak;
    }
}
