package mx.edu.utez.server.security;

import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import org.springframework.stereotype.Service;

@Service
public class SessionTokenValidationService {

    private final AdminRepository adminRepository;
    private final StudentRepository studentRepository;

    public SessionTokenValidationService(AdminRepository adminRepository, StudentRepository studentRepository) {
        this.adminRepository = adminRepository;
        this.studentRepository = studentRepository;
    }

    public boolean isTokenVersionCurrent(ParsedToken parsedToken) {
        return switch (parsedToken.tokenType()) {
            case ADMIN -> adminRepository.findById(parsedToken.userId())
                    .map(admin -> admin.getTokenVersion() == parsedToken.tokenVersion())
                    .orElse(false);
            case STUDENT -> studentRepository.findById(parsedToken.userId())
                    .map(student -> student.getTokenVersion() == parsedToken.tokenVersion())
                    .orElse(false);
        };
    }
}
