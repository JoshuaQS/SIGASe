package mx.edu.utez.server.modules.auth.service;

import mx.edu.utez.server.modules.auth.dto.StudentAuthResponse;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.security.JwtTokenProvider;
import org.springframework.stereotype.Component;

@Component
public class StudentAuthTokenFactory {

    private final JwtTokenProvider jwtTokenProvider;

    public StudentAuthTokenFactory(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
    }

    public StudentAuthResponse build(Student student) {
        String token = jwtTokenProvider.generateStudentToken(student);
        return new StudentAuthResponse(token, student.isMustChangePassword());
    }
}
