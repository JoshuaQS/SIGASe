package mx.edu.utez.server.modules.logs.access.service;

import mx.edu.utez.server.modules.logs.access.entity.StudentAccessAlertState;
import mx.edu.utez.server.modules.logs.access.repository.StudentAccessAlertStateRepository;
import mx.edu.utez.server.modules.students.entity.Student;
import jakarta.transaction.Transactional;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class StudentAccessAlertService {

    private static final int ALERT_THRESHOLD = 5;
    private final StudentAccessAlertStateRepository repository;

    public StudentAccessAlertService(StudentAccessAlertStateRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public boolean registerFailedAttempt(String normalizedEmail, Student student) {
        if (!StringUtils.hasText(normalizedEmail)) {
            return false;
        }
        String normalized = normalizedEmail.trim().toLowerCase();
        StudentAccessAlertState state = repository.findForUpdateByNormalizedEmail(normalized)
                .orElseGet(() -> {
                    StudentAccessAlertState newState = new StudentAccessAlertState();
                    newState.setNormalizedEmail(normalized);
                    if (student != null) {
                        newState.setStudent(student);
                    }
                    return newState;
                });

        if (state.getStudent() == null && student != null) {
            state.setStudent(student);
        }

        int nextCount = state.getConsecutiveFailedAttempts() + 1;
        state.setConsecutiveFailedAttempts(nextCount);
        state.setLastFailedAt(Instant.now());
        state.setUpdatedAt(Instant.now());

        boolean triggerAlert = nextCount >= ALERT_THRESHOLD && state.getAlertTriggeredAt() == null;
        if (triggerAlert) {
            state.setAlertTriggeredAt(Instant.now());
        }
        repository.save(state);
        return triggerAlert;
    }

    @Transactional
    public void registerSuccess(String normalizedEmail) {
        if (!StringUtils.hasText(normalizedEmail)) {
            return;
        }
        repository.findForUpdateByNormalizedEmail(normalizedEmail.trim().toLowerCase()).ifPresent(state -> {
            state.setConsecutiveFailedAttempts(0);
            state.setAlertTriggeredAt(null);
            state.setUpdatedAt(Instant.now());
            repository.save(state);
        });
    }
}
