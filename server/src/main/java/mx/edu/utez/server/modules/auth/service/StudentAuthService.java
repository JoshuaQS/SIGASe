package mx.edu.utez.server.modules.auth.service;

import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import mx.edu.utez.server.modules.auth.dto.StudentAuthResponse;
import mx.edu.utez.server.modules.auth.dto.StudentLoginRequest;
import mx.edu.utez.server.modules.students.dto.StudentResponse;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.mapper.StudentMapper;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudentAuthService {

    private final StudentLocalLoginService studentLocalLoginService;
    private final StudentGoogleLoginService studentGoogleLoginService;
    private final StudentPasswordLifecycleService studentPasswordLifecycleService;
    private final StudentRepository studentRepository;
    private final StudentMapper studentMapper;

    public StudentAuthService(
            StudentLocalLoginService studentLocalLoginService,
            StudentGoogleLoginService studentGoogleLoginService,
            StudentPasswordLifecycleService studentPasswordLifecycleService,
            StudentRepository studentRepository,
            StudentMapper studentMapper
    ) {
        this.studentLocalLoginService = studentLocalLoginService;
        this.studentGoogleLoginService = studentGoogleLoginService;
        this.studentPasswordLifecycleService = studentPasswordLifecycleService;
        this.studentRepository = studentRepository;
        this.studentMapper = studentMapper;
    }

    @Transactional
    public StudentAuthResponse loginLocal(StudentLoginRequest req, HttpServletRequest httpRequest) {
        return studentLocalLoginService.login(req, httpRequest);
    }

    @Transactional
    public StudentAuthResponse loginWithGoogle(String idToken, HttpServletRequest request) {
        return studentGoogleLoginService.loginWithGoogle(idToken, request);
    }

    @Transactional
    public void changePassword(UUID studentId, String currentPassword, String newPassword, String confirmNewPassword, HttpServletRequest request) {
        studentPasswordLifecycleService.changePassword(studentId, currentPassword, newPassword, confirmNewPassword, request);
    }

    /**
     * No revela si el correo existe. El controlador responde {@code 204 No Content} siempre que la petición sea válida.
     */
    @Transactional
    public void requestPasswordReset(String email, HttpServletRequest httpRequest) {
        studentPasswordLifecycleService.requestPasswordReset(email, httpRequest);
    }

    @Transactional
    public void confirmPasswordReset(String rawToken, String newPassword, String confirmNewPassword, HttpServletRequest httpRequest) {
        studentPasswordLifecycleService.confirmPasswordReset(rawToken, newPassword, confirmNewPassword, httpRequest);
    }

    @Transactional(readOnly = true)
    public StudentResponse getMe(UUID studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Estudiante no encontrado"));
        return studentMapper.toResponse(student);
    }

    /**
     * Genera contraseña temporal para un estudiante recién creado; el llamador debe persistir el estudiante si aún no está guardado.
     */
    public String issueTemporaryPassword(Student student, HttpServletRequest httpRequest) {
        return studentPasswordLifecycleService.issueTemporaryPassword(student, httpRequest);
    }
}
