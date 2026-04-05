package mx.edu.utez.server.modules.auth.service;

import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class GoogleSubjectPolicyService {

    public void enforceAndBind(Student student, String tokenSubject) {
        if (!StringUtils.hasText(tokenSubject)) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "Token de Google sin subject.");
        }

        String existingSubject = student.getGoogleSubject();
        if (!StringUtils.hasText(existingSubject)) {
            student.setGoogleSubject(tokenSubject);
            return;
        }

        if (!existingSubject.equals(tokenSubject)) {
            throw new BusinessException(
                    ErrorCode.BUSINESS_RULE_VIOLATION,
                    "Subject de Google no coincide con el registro institucional."
            );
        }
    }
}
